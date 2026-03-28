import { describe, it, expect } from "vitest"
import { convertAmount } from "@/lib/calculations/currency"

/**
 * Currency conversion unit tests.
 *
 * Tests the pure conversion function (no DB dependency).
 * DB-dependent conversion tested in integration tests.
 */

describe("convertAmount (pure)", () => {
  it("$1,000 USD to EUR at rate 0.92 = €920", () => {
    const result = convertAmount(1000, 0.92)
    expect(result).toBeCloseTo(920, 2)
  })

  it("$1 at rate 1.0 = $1 (identity)", () => {
    expect(convertAmount(1, 1)).toBe(1)
  })

  it("handles very small amounts", () => {
    const result = convertAmount(0.01, 0.92)
    expect(result).toBeCloseTo(0.0092, 4)
  })

  it("handles very large amounts", () => {
    const result = convertAmount(1_000_000_000, 1.085)
    expect(result).toBeCloseTo(1_085_000_000, 0)
  })

  it("rate of 0 → throws (division by zero protection)", () => {
    expect(() => convertAmount(1000, 0)).toThrow("zero")
  })

  it("negative amounts (distributions)", () => {
    const result = convertAmount(-5000, 0.92)
    expect(result).toBeCloseTo(-4600, 2)
  })

  it("zero amount → zero regardless of rate", () => {
    expect(convertAmount(0, 0.92)).toBe(0)
    expect(convertAmount(0, 1.5)).toBe(0)
  })

  it("inverse rate (EUR → USD then USD → EUR roundtrip)", () => {
    const eurToUsd = 1.085
    const usdToEur = 1 / eurToUsd

    const usdAmount = convertAmount(1000, eurToUsd) // €1000 → $1085
    const backToEur = convertAmount(usdAmount, usdToEur) // $1085 → €1000

    expect(backToEur).toBeCloseTo(1000, 4)
  })

  it("handles rates > 1 and < 1 correctly", () => {
    // GBP → JPY (rate ~190)
    expect(convertAmount(100, 190)).toBeCloseTo(19000, 0)

    // JPY → GBP (rate ~0.0053)
    expect(convertAmount(19000, 0.00526)).toBeCloseTo(99.94, 0)
  })
})
