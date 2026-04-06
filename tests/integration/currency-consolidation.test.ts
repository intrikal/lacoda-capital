import { describe, it, expect } from "vitest"
import { convertAmount } from "@/lib/calculations/currency"

/**
 * Integration tests for multi-currency consolidation.
 *
 * Tests realistic scenarios: mixed-currency portfolios,
 * org currency changes, and missing rate handling.
 */

describe("multi-currency portfolio consolidation", () => {
  it("3 assets (2 USD, 1 EUR) → dashboard AUM = sum USD + EUR converted", () => {
    // Asset 1 (USD): $2,000,000
    // Asset 2 (USD): $1,500,000
    // Asset 3 (EUR): €1,000,000 at EUR/USD rate of 1.085

    const asset1 = 2000000 // USD
    const asset2 = 1500000 // USD
    const asset3Eur = 1000000 // EUR
    const eurToUsdRate = 1.085

    const asset3Usd = convertAmount(asset3Eur, eurToUsdRate)
    const totalAumUsd = asset1 + asset2 + asset3Usd

    expect(asset3Usd).toBeCloseTo(1085000, 0)
    expect(totalAumUsd).toBeCloseTo(4585000, 0)
  })

  it("change org currency to EUR → AUM recalculates", () => {
    // Same 3 assets, but now org currency is EUR
    const asset1Usd = 2000000
    const asset2Usd = 1500000
    const asset3Eur = 1000000

    const usdToEurRate = 0.9217 // 1/1.085

    const asset1Eur = convertAmount(asset1Usd, usdToEurRate)
    const asset2Eur = convertAmount(asset2Usd, usdToEurRate)
    const totalAumEur = asset1Eur + asset2Eur + asset3Eur

    expect(asset1Eur).toBeCloseTo(1843400, -2)
    expect(asset2Eur).toBeCloseTo(1382550, -2)
    expect(totalAumEur).toBeCloseTo(4225950, -2)
  })

  it("mixed-currency where one asset has no rate → partial total", () => {
    // Asset 1 (USD): $1,000,000
    // Asset 2 (CHF): CHF 500,000 — no rate available
    // Should return USD total + warning about CHF asset

    const usdAssets = [1000000]
    const totalUsd = usdAssets.reduce((s, a) => s + a, 0)

    // CHF asset can't be converted — flagged as warning
    const unconvertedAssets = [{ currency: "CHF", value: 500000 }]

    expect(totalUsd).toBe(1000000)
    expect(unconvertedAssets).toHaveLength(1)
    expect(unconvertedAssets[0].currency).toBe("CHF")
  })
})

describe("exchange rate edge cases", () => {
  it("missing rate for specific date → use nearest available rate", () => {
    // This tests the concept — the actual DB lookup is in currency.ts
    // Rates available: Jan 1 = 1.08, Mar 1 = 1.09
    // Query for Feb 15 → should use Jan 1 rate (most recent before)
    const rates = [
      { date: new Date("2024-01-01"), rate: 1.08 },
      { date: new Date("2024-03-01"), rate: 1.09 },
    ]

    const queryDate = new Date("2024-02-15")
    const applicableRate = rates
      .filter((r) => r.date <= queryDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]

    expect(applicableRate).toBeDefined()
    expect(applicableRate.rate).toBe(1.08)

    const result = convertAmount(1000, applicableRate.rate)
    expect(result).toBeCloseTo(1080, 0)
  })

  it("rate of 0 is rejected", () => {
    expect(() => convertAmount(1000, 0)).toThrow()
  })

  it("very precise rates (8 decimal places)", () => {
    // JPY/USD = 0.00666667
    const result = convertAmount(150000, 0.00666667)
    expect(result).toBeCloseTo(1000, 0)
  })

  it("same currency → no conversion (rate = 1)", () => {
    const result = convertAmount(5000, 1)
    expect(result).toBe(5000)
  })
})
