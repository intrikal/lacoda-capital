import { describe, it, expect } from "vitest"
import { calculateTWR, calculatePeriodReturns, buildTWRTimeSeries } from "@/lib/calculations/performance"
import type { Valuation, Cashflow } from "@/lib/calculations/performance"

/**
 * TWR (Time-Weighted Return) unit tests.
 */

describe("calculateTWR", () => {
  it("3 valuations ($100, $110, $120) with no cashflows = 20% TWR", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-06-01"), value: 110 },
      { date: new Date("2024-12-31"), value: 120 },
    ]

    const result = calculateTWR(valuations)

    // (1 + 10/100) * (1 + 10/110) - 1 = 1.1 * 1.0909 - 1 = 0.20
    expect(result.twr).toBeCloseTo(0.20, 2)
    expect(result.periods).toHaveLength(2)
  })

  it("$100 start, add $50 at midpoint, end at $165 = correct modified Dietz", () => {
    // Start: $100
    // Midpoint: add $50 contribution (portfolio was $110 before contribution)
    // End: $165
    // Modified Dietz: (165 - 100 - 50) / (100 + 50*0.5) = 15 / 125 = 0.12 for a single period
    // But with TWR (splitting at cashflow points):
    // Period 1: $100 → $110 (no CF) → return = 10%
    // Period 2: $160 (110+50) → $165 → return = (165 - 160) / 160 = 3.125%
    // Hmm, the valuations need to bracket the cashflow.

    // Let's use the 3-valuation approach:
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-07-01"), value: 110 }, // before cashflow
      { date: new Date("2024-12-31"), value: 165 },
    ]

    const cashflows: Cashflow[] = [
      { date: new Date("2024-07-01"), amount: 50 }, // $50 contribution
    ]

    const result = calculateTWR(valuations, cashflows)

    // Period 1: start=100, end=110, CF=50 at boundary
    //   CF falls at boundary (same as start of period? — it falls in period 0)
    //   Actually CF date >= start and < end: 2024-07-01 >= 2024-01-01 and < 2024-07-01? No!
    //   The CF at exactly the end date is NOT in this period.
    //   Wait: 2024-07-01 >= 2024-01-01 (yes) and < 2024-07-01 (no)
    //   So CF is NOT in period 1. Period 1: return = (110 - 100) / 100 = 10%

    // Period 2: start=110, end=165, CF=50 at 2024-07-01
    //   CF at 2024-07-01 >= 2024-07-01 (yes) and < 2024-12-31 (yes)
    //   totalCF = 50, periodDays = 183
    //   daysRemaining = 183, weight = 183/183 = 1.0
    //   weightedCF = 50 * 1.0 = 50
    //   denominator = 110 + 50 = 160
    //   return = (165 - 110 - 50) / 160 = 5/160 = 0.03125

    // TWR = (1.10)(1.03125) - 1 = 0.134375

    expect(result.twr).toBeCloseTo(0.1344, 2)
    expect(result.twr).not.toBeCloseTo(0.65, 1) // NOT simple return (65/100)
  })

  it("asset with only 1 valuation → return = 0%", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
    ]

    const result = calculateTWR(valuations)
    expect(result.twr).toBe(0)
    expect(result.periods).toHaveLength(0)
  })

  it("asset with all same valuations ($100, $100, $100) → return = 0%", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-06-01"), value: 100 },
      { date: new Date("2024-12-31"), value: 100 },
    ]

    const result = calculateTWR(valuations)
    expect(result.twr).toBeCloseTo(0, 5)
  })

  it("negative return displayed correctly", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-12-31"), value: 80 },
    ]

    const result = calculateTWR(valuations)
    expect(result.twr).toBeCloseTo(-0.20, 2)
    expect(result.twr).toBeLessThan(0)
  })

  it("very large return (10,000%) handled correctly", () => {
    const valuations: Valuation[] = [
      { date: new Date("2020-01-01"), value: 100 },
      { date: new Date("2024-12-31"), value: 10100 },
    ]

    const result = calculateTWR(valuations)
    expect(result.twr).toBeCloseTo(100, 0) // 10,000% = 100 as decimal
    expect(result.twr).toBeGreaterThan(99)
  })

  it("zero-length period returns 0 for that period", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-01-01"), value: 100 }, // same date
      { date: new Date("2024-12-31"), value: 120 },
    ]

    const result = calculateTWR(valuations)
    expect(result.periods[0].periodReturn).toBe(0)
    expect(result.twr).toBeCloseTo(0.20, 2)
  })

  it("handles distribution (negative cashflow)", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-06-01"), value: 115 },
      { date: new Date("2024-12-31"), value: 90 },
    ]

    const cashflows: Cashflow[] = [
      { date: new Date("2024-06-01"), amount: -20 }, // $20 distribution
    ]

    const result = calculateTWR(valuations, cashflows)
    // Period 1: no CF → (115 - 100) / 100 = 15%
    // Period 2: CF of -20, days = 214, daysRemaining = 214
    //   totalCF = -20, weightedCF = -20 * (214/214) = -20
    //   denominator = 115 + (-20) = 95
    //   return = (90 - 115 - (-20)) / 95 = (90 - 115 + 20) / 95 = -5/95 = -0.0526
    // TWR = (1.15)(0.9474) - 1 = 0.0895
    expect(result.twr).toBeGreaterThan(0)
  })
})

describe("calculatePeriodReturns", () => {
  it("returns null for all periods with < 2 valuations", () => {
    const result = calculatePeriodReturns([
      { date: new Date("2024-01-01"), value: 100 },
    ])

    expect(result.ytd).toBeNull()
    expect(result.oneYear).toBeNull()
    expect(result.sinceInception).toBeNull()
  })

  it("sinceInception matches calculateTWR result", () => {
    const valuations: Valuation[] = [
      { date: new Date("2023-01-01"), value: 100 },
      { date: new Date("2023-06-01"), value: 110 },
      { date: new Date("2024-01-01"), value: 120 },
      { date: new Date("2024-06-01"), value: 130 },
    ]

    const result = calculatePeriodReturns(valuations)
    const twr = calculateTWR(valuations)

    expect(result.sinceInception).toBeCloseTo(twr.twr, 4)
  })
})

describe("buildTWRTimeSeries", () => {
  it("builds correct data points for charting", () => {
    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-04-01"), value: 110 },
      { date: new Date("2024-07-01"), value: 105 },
      { date: new Date("2024-10-01"), value: 120 },
    ]

    const series = buildTWRTimeSeries(valuations)

    expect(series).toHaveLength(4) // start + 3 periods
    expect(series[0].cumulativeTWR).toBe(0) // starts at 0
    expect(series[series.length - 1].cumulativeTWR).toBeCloseTo(0.20, 2) // ends at 20%
  })

  it("returns empty for < 2 valuations", () => {
    expect(buildTWRTimeSeries([{ date: new Date(), value: 100 }])).toHaveLength(0)
  })
})
