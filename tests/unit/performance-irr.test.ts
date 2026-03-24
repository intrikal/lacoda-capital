import { describe, it, expect } from "vitest"
import { calculateIRR } from "@/lib/calculations/performance"
import type { Cashflow } from "@/lib/calculations/performance"

/**
 * IRR (Internal Rate of Return) unit tests.
 */

describe("calculateIRR", () => {
  it("invest $100, receive $110 after 1 year = 10% IRR", () => {
    const cashflows: Cashflow[] = [
      { date: new Date("2024-01-01"), amount: -100 }, // invest
      { date: new Date("2025-01-01"), amount: 110 },  // receive
    ]

    const result = calculateIRR(cashflows)
    expect(result.irr).not.toBeNull()
    expect(result.irr!).toBeCloseTo(0.10, 2)
  })

  it("invest $100, receive $50 at year 1, $60 at year 2 = correct IRR", () => {
    // NPV = -100 + 50/(1+r) + 60/(1+r)^2 = 0
    // Solving: r ≈ 0.0 (roughly — let's calculate)
    // At r=0: -100 + 50 + 60 = 10 > 0 → IRR > 0
    // At r=0.05: -100 + 50/1.05 + 60/1.1025 = -100 + 47.62 + 54.42 = 2.04
    // At r=0.08: -100 + 50/1.08 + 60/1.1664 = -100 + 46.30 + 51.44 = -2.26
    // So IRR ≈ 6-7%
    const cashflows: Cashflow[] = [
      { date: new Date("2024-01-01"), amount: -100 },
      { date: new Date("2025-01-01"), amount: 50 },
      { date: new Date("2026-01-01"), amount: 60 },
    ]

    const result = calculateIRR(cashflows)
    expect(result.irr).not.toBeNull()
    // Should be between 6% and 8%
    expect(result.irr!).toBeGreaterThan(0.06)
    expect(result.irr!).toBeLessThan(0.08)
  })

  it("simple double in one year = 100% IRR", () => {
    const cashflows: Cashflow[] = [
      { date: new Date("2024-01-01"), amount: -100 },
      { date: new Date("2025-01-01"), amount: 200 },
    ]

    const result = calculateIRR(cashflows)
    expect(result.irr).not.toBeNull()
    expect(result.irr!).toBeCloseTo(1.0, 1) // 100%
  })

  it("no convergence after 100 iterations → return null with error, not crash", () => {
    // Pathological case: extremely weird cashflows that resist convergence
    // Use cashflows that oscillate wildly
    const cashflows: Cashflow[] = [
      { date: new Date("2024-01-01"), amount: -1000 },
      { date: new Date("2024-02-01"), amount: 500 },
      { date: new Date("2024-03-01"), amount: -2000 },
      { date: new Date("2024-04-01"), amount: 3000 },
      { date: new Date("2024-05-01"), amount: -5000 },
      { date: new Date("2024-06-01"), amount: 4000 },
      { date: new Date("2024-07-01"), amount: -3000 },
      { date: new Date("2024-08-01"), amount: 6000 },
      { date: new Date("2024-09-01"), amount: -8000 },
      { date: new Date("2024-10-01"), amount: 7000 },
    ]

    // This should either converge or return null — never crash
    const result = calculateIRR(cashflows)
    // If it converges, irr is a number; if not, irr is null with error
    if (result.irr === null) {
      expect(result.error).toBeDefined()
      expect(result.error).toBeTruthy()
    } else {
      expect(typeof result.irr).toBe("number")
      expect(isFinite(result.irr)).toBe(true)
    }
  })

  it("asset with no distributions yet → return null", () => {
    // Only negative cashflows (investments, no returns)
    const cashflows: Cashflow[] = [
      { date: new Date("2024-01-01"), amount: -100 },
      { date: new Date("2024-06-01"), amount: -50 },
    ]

    const result = calculateIRR(cashflows)
    expect(result.irr).toBeNull()
    expect(result.error).toContain("No distributions")
  })

  it("needs at least 2 cashflows", () => {
    const result = calculateIRR([
      { date: new Date("2024-01-01"), amount: -100 },
    ])
    expect(result.irr).toBeNull()
    expect(result.error).toBeDefined()
  })

  it("PE fund: capital calls + distributions = correct XIRR", () => {
    // Simulating a PE fund with multiple capital calls and distributions
    // Comparable to Excel XIRR
    const cashflows: Cashflow[] = [
      { date: new Date("2020-01-01"), amount: -500000 },  // Initial capital call
      { date: new Date("2020-07-01"), amount: -250000 },  // Second call
      { date: new Date("2021-06-01"), amount: 100000 },   // Distribution
      { date: new Date("2022-01-01"), amount: 200000 },   // Distribution
      { date: new Date("2023-01-01"), amount: 300000 },   // Distribution
      { date: new Date("2024-01-01"), amount: 500000 },   // Final distribution (exit)
    ]

    const result = calculateIRR(cashflows)
    expect(result.irr).not.toBeNull()
    // Total invested: $750K, total returned: $1.1M over ~4 years
    // IRR should be reasonable — roughly 10-15%
    expect(result.irr!).toBeGreaterThan(0.05)
    expect(result.irr!).toBeLessThan(0.25)
  })
})
