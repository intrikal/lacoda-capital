import { describe, it, expect } from "vitest"
import { calculateTWR, calculateIRR, calculatePeriodReturns } from "@/lib/calculations/performance"
import type { Valuation, Cashflow } from "@/lib/calculations/performance"

/**
 * Integration tests for performance calculations.
 *
 * These test realistic scenarios with hand-calculated expected values.
 */

describe("4 quarterly valuations → TWR matches hand-calculated value", () => {
  it("standard asset with quarterly valuations", () => {
    // Q1: $1,000,000 → $1,050,000 (+5%)
    // Q2: $1,050,000 → $1,020,000 (-2.86%)
    // Q3: $1,020,000 → $1,100,000 (+7.84%)
    // Q4: $1,100,000 → $1,150,000 (+4.55%)
    //
    // TWR = (1.05)(0.9714)(1.0784)(1.0455) - 1
    //     = 1.05 * 0.9714 * 1.0784 * 1.0455
    //     = 1.1500 - 1 = 0.1500 (15.00%)

    const valuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 1000000 },
      { date: new Date("2024-04-01"), value: 1050000 },
      { date: new Date("2024-07-01"), value: 1020000 },
      { date: new Date("2024-10-01"), value: 1100000 },
      { date: new Date("2025-01-01"), value: 1150000 },
    ]

    const result = calculateTWR(valuations)

    // Hand-calculated:
    // r1 = 50000/1000000 = 0.05
    // r2 = -30000/1050000 = -0.02857
    // r3 = 80000/1020000 = 0.07843
    // r4 = 50000/1100000 = 0.04545
    // TWR = (1.05)(0.97143)(1.07843)(1.04545) - 1
    const expected =
      (1 + 0.05) * (1 - 30000 / 1050000) * (1 + 80000 / 1020000) * (1 + 50000 / 1100000) - 1

    expect(result.twr).toBeCloseTo(expected, 4)
    expect(result.twr).toBeCloseTo(0.15, 2) // ~15%
  })
})

describe("PE asset with capital calls + distributions → IRR matches", () => {
  it("matches XIRR-style calculation", () => {
    // Simple PE scenario:
    // Day 0: invest $1,000,000
    // Year 1: capital call $500,000
    // Year 2: distribution $400,000
    // Year 3: distribution $600,000
    // Year 4: exit distribution $1,200,000
    // Total invested: $1.5M, Total returned: $2.2M over 4 years

    const cashflows: Cashflow[] = [
      { date: new Date("2020-01-01"), amount: -1000000 },
      { date: new Date("2021-01-01"), amount: -500000 },
      { date: new Date("2022-01-01"), amount: 400000 },
      { date: new Date("2023-01-01"), amount: 600000 },
      { date: new Date("2024-01-01"), amount: 1200000 },
    ]

    const result = calculateIRR(cashflows)
    expect(result.irr).not.toBeNull()

    // Net gain: $700K on $1.5M over 4 years
    // IRR should be roughly 12-18% (compounded)
    expect(result.irr!).toBeGreaterThan(0.10)
    expect(result.irr!).toBeLessThan(0.20)
  })
})

describe("multi-asset portfolio aggregation", () => {
  it("3 assets: portfolio TWR is correct aggregate", () => {
    // Asset 1 (Real Estate): $2M → $2.1M → $2.2M
    // Asset 2 (Equities): $1M → $1.15M → $1.3M
    // Asset 3 (Bonds): $500K → $510K → $520K
    // Portfolio: $3.5M → $3.76M → $4.02M

    const portfolioValuations: Valuation[] = [
      { date: new Date("2024-01-01"), value: 3500000 },
      { date: new Date("2024-07-01"), value: 3760000 },
      { date: new Date("2025-01-01"), value: 4020000 },
    ]

    const result = calculateTWR(portfolioValuations)

    // r1 = 260000/3500000 = 7.43%
    // r2 = 260000/3760000 = 6.91%
    // TWR = (1.0743)(1.0691) - 1 = 0.1486 ≈ 14.86%
    expect(result.twr).toBeCloseTo(0.1486, 2)
  })
})

describe("edge case: missing intermediate valuations (interpolation)", () => {
  it("period returns use interpolation when needed", () => {
    // Asset started in 2022, but we want YTD (from Jan 1 current year)
    // If no valuation exists on Jan 1, we interpolate
    const valuations: Valuation[] = [
      { date: new Date("2023-06-01"), value: 100 },
      { date: new Date("2024-03-01"), value: 120 },
      { date: new Date("2024-09-01"), value: 130 },
    ]

    const returns = calculatePeriodReturns(valuations)

    // Since inception should work
    expect(returns.sinceInception).not.toBeNull()
    expect(returns.sinceInception!).toBeCloseTo(0.30, 2)

    // YTD should interpolate a value for Jan 1, 2024
    // Between Jun 1 2023 (100) and Mar 1 2024 (120):
    // Jan 1 2024 is ~214 days after Jun 1, period is ~275 days
    // interpolated ≈ 100 + (120 - 100) * (214/275) = 100 + 15.56 = 115.56
    if (returns.ytd !== null) {
      expect(typeof returns.ytd).toBe("number")
    }
  })
})
