// ============================================================================
// Performance Calculations — TWR & IRR
// ============================================================================
//
// calculateTWR: Time-Weighted Return using Modified Dietz method
// calculateIRR: Internal Rate of Return using Newton's method
//
// These are pure functions with no DB dependency — they take
// arrays of valuations and cashflows and return numbers.
// ============================================================================

export interface Valuation {
  date: Date
  value: number
}

export interface Cashflow {
  date: Date
  amount: number // positive = inflow (contribution), negative = outflow (distribution)
}

export interface TWRResult {
  twr: number // as decimal, e.g. 0.20 = 20%
  periods: TWRPeriod[]
}

export interface TWRPeriod {
  startDate: Date
  endDate: Date
  startValue: number
  endValue: number
  cashflows: Cashflow[]
  periodReturn: number
}

export interface IRRResult {
  irr: number | null // annualized, as decimal — null if no convergence
  error?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
}

function interpolateValue(
  date: Date,
  before: Valuation,
  after: Valuation
): number {
  const totalDays = daysBetween(before.date, after.date)
  if (totalDays === 0) return before.value
  const elapsedDays = daysBetween(before.date, date)
  const fraction = elapsedDays / totalDays
  return before.value + (after.value - before.value) * fraction
}

/**
 * Find or interpolate a valuation for a specific date.
 * If the date falls between two valuations, linearly interpolate.
 */
function getValueAtDate(date: Date, valuations: Valuation[]): number | null {
  if (valuations.length === 0) return null

  // Exact match
  const exact = valuations.find(
    (v) => v.date.getTime() === date.getTime()
  )
  if (exact) return exact.value

  // Find bracketing valuations
  const sorted = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  // Before first valuation
  if (date < sorted[0].date) return null
  // After last valuation
  if (date > sorted[sorted.length - 1].date) return sorted[sorted.length - 1].value

  // Interpolate
  for (let i = 0; i < sorted.length - 1; i++) {
    if (date >= sorted[i].date && date <= sorted[i + 1].date) {
      return interpolateValue(date, sorted[i], sorted[i + 1])
    }
  }

  return null
}

// ─── TWR (Modified Dietz) ───────────────────────────────────────────────────

/**
 * Calculate Time-Weighted Return using the Modified Dietz method.
 *
 * The Modified Dietz method approximates the true TWR by weighting
 * cashflows by the fraction of the period they were invested.
 *
 * For periods with no cashflows, it simplifies to:
 *   return = (endValue - startValue) / startValue
 *
 * For periods with cashflows:
 *   return = (endValue - startValue - totalCashflows) /
 *            (startValue + weightedCashflows)
 *
 * The overall TWR chains period returns:
 *   TWR = (1 + r1) * (1 + r2) * ... * (1 + rn) - 1
 *
 * @param valuations - Time series of portfolio/asset valuations (at least 2)
 * @param cashflows - External cash flows (contributions/distributions)
 * @returns TWR as a decimal (0.20 = 20%) or 0 if insufficient data
 */
export function calculateTWR(
  valuations: Valuation[],
  cashflows: Cashflow[] = []
): TWRResult {
  // Need at least 2 valuations
  if (valuations.length < 2) {
    return { twr: 0, periods: [] }
  }

  // Sort valuations chronologically
  const sorted = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  // Sort cashflows chronologically
  const sortedCF = [...cashflows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  const periods: TWRPeriod[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const startVal = sorted[i]
    const endVal = sorted[i + 1]
    const periodDays = daysBetween(startVal.date, endVal.date)

    // Zero-length period
    if (periodDays === 0) {
      periods.push({
        startDate: startVal.date,
        endDate: endVal.date,
        startValue: startVal.value,
        endValue: endVal.value,
        cashflows: [],
        periodReturn: 0,
      })
      continue
    }

    // Cashflows within this period
    const periodCF = sortedCF.filter(
      (cf) => cf.date >= startVal.date && cf.date < endVal.date
    )

    const totalCF = periodCF.reduce((sum, cf) => sum + cf.amount, 0)

    // Weighted cashflows: each CF weighted by fraction of period remaining
    const weightedCF = periodCF.reduce((sum, cf) => {
      const daysInPeriod = daysBetween(cf.date, endVal.date)
      const weight = daysInPeriod / periodDays
      return sum + cf.amount * weight
    }, 0)

    const denominator = startVal.value + weightedCF

    let periodReturn: number
    if (denominator <= 0) {
      // Edge case: if start value + weighted CF <= 0, can't compute
      periodReturn = 0
    } else {
      periodReturn =
        (endVal.value - startVal.value - totalCF) / denominator
    }

    periods.push({
      startDate: startVal.date,
      endDate: endVal.date,
      startValue: startVal.value,
      endValue: endVal.value,
      cashflows: periodCF,
      periodReturn,
    })
  }

  // Chain returns: TWR = product of (1 + ri) - 1
  const twr =
    periods.reduce((product, p) => product * (1 + p.periodReturn), 1) - 1

  return { twr, periods }
}

// ─── IRR (Newton's Method) ──────────────────────────────────────────────────

/**
 * Calculate Internal Rate of Return using Newton's method (XIRR).
 *
 * IRR is the discount rate that makes the Net Present Value (NPV)
 * of all cashflows equal to zero.
 *
 * NPV = sum of CF_i / (1 + r)^(t_i / 365)
 *
 * Newton's method iterates:
 *   r_new = r_old - NPV(r_old) / NPV'(r_old)
 *
 * @param cashflows - All cash flows including initial investment (negative)
 *                    and all distributions/terminal value (positive)
 * @returns Annualized IRR as decimal, or null if no convergence
 */
export function calculateIRR(cashflows: Cashflow[]): IRRResult {
  if (cashflows.length < 2) {
    return { irr: null, error: "Need at least 2 cashflows (investment + return)" }
  }

  // Check if there are both positive and negative cashflows
  const hasPositive = cashflows.some((cf) => cf.amount > 0)
  const hasNegative = cashflows.some((cf) => cf.amount < 0)

  if (!hasPositive || !hasNegative) {
    return {
      irr: null,
      error: !hasPositive
        ? "No distributions yet."
        : "No investment cashflows found",
    }
  }

  const sorted = [...cashflows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
  const baseDate = sorted[0].date

  function npv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const years = daysBetween(baseDate, cf.date) / 365
      return sum + cf.amount / Math.pow(1 + rate, years)
    }, 0)
  }

  function npvDerivative(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const years = daysBetween(baseDate, cf.date) / 365
      if (years === 0) return sum
      return (
        sum + (-years * cf.amount) / Math.pow(1 + rate, years + 1)
      )
    }, 0)
  }

  // Newton's method
  let rate = 0.1 // Initial guess: 10%
  const maxIterations = 100
  const tolerance = 1e-7

  for (let i = 0; i < maxIterations; i++) {
    const f = npv(rate)
    const fPrime = npvDerivative(rate)

    if (Math.abs(fPrime) < 1e-12) {
      // Derivative too small — try a different starting point
      rate = rate + 0.1
      continue
    }

    const newRate = rate - f / fPrime

    // Guard against extreme values
    if (newRate < -0.99) {
      rate = -0.99
      continue
    }
    if (newRate > 100) {
      rate = 100
      continue
    }

    if (Math.abs(newRate - rate) < tolerance) {
      return { irr: newRate }
    }

    rate = newRate
  }

  return { irr: null, error: "IRR did not converge after 100 iterations" }
}

// ─── Convenience: Period Returns ────────────────────────────────────────────

export interface PeriodReturns {
  ytd: number | null
  oneYear: number | null
  sinceInception: number | null
}

/**
 * Calculate YTD, 1Y, and Since Inception returns for an asset.
 */
export function calculatePeriodReturns(
  valuations: Valuation[],
  cashflows: Cashflow[] = []
): PeriodReturns {
  if (valuations.length < 2) {
    return { ytd: null, oneYear: null, sinceInception: null }
  }

  const sorted = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  )
  // Since Inception: always calculable
  const sinceInception = calculateTWR(sorted, cashflows).twr

  // YTD: need a valuation at or before Jan 1
  let ytd: number | null = null
  const ytdStartValue = getValueAtDate(yearStart, sorted)
  if (ytdStartValue !== null) {
    const ytdValuations: Valuation[] = [
      { date: yearStart, value: ytdStartValue },
      ...sorted.filter((v) => v.date >= yearStart),
    ]
    const ytdCF = cashflows.filter((cf) => cf.date >= yearStart)
    ytd = calculateTWR(ytdValuations, ytdCF).twr
  }

  // 1Y: need a valuation at or before 1 year ago
  let oneYear: number | null = null
  const oneYearStartValue = getValueAtDate(oneYearAgo, sorted)
  if (oneYearStartValue !== null) {
    const oneYearValuations: Valuation[] = [
      { date: oneYearAgo, value: oneYearStartValue },
      ...sorted.filter((v) => v.date >= oneYearAgo),
    ]
    const oneYearCF = cashflows.filter((cf) => cf.date >= oneYearAgo)
    oneYear = calculateTWR(oneYearValuations, oneYearCF).twr
  }

  return { ytd, oneYear, sinceInception }
}

// ─── TWR Time Series (for charts) ──────────────────────────────────────────

export interface TWRDataPoint {
  date: string // ISO date string
  cumulativeTWR: number // as decimal
}

/**
 * Build a cumulative TWR time series for charting.
 */
export function buildTWRTimeSeries(
  valuations: Valuation[],
  cashflows: Cashflow[] = []
): TWRDataPoint[] {
  const { periods } = calculateTWR(valuations, cashflows)

  if (periods.length === 0) return []

  const points: TWRDataPoint[] = [
    { date: periods[0].startDate.toISOString().split("T")[0], cumulativeTWR: 0 },
  ]

  let cumulative = 1
  for (const period of periods) {
    cumulative *= 1 + period.periodReturn
    points.push({
      date: period.endDate.toISOString().split("T")[0],
      cumulativeTWR: cumulative - 1,
    })
  }

  return points
}
