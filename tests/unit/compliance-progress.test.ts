import { describe, it, expect } from "vitest"

/**
 * Compliance progress: % of controls in 'verified' status.
 * Tests the calculation: verified / total active controls * 100
 */
function calculateComplianceProgress(
  controls: { status: string; isActive: boolean }[]
): number {
  const active = controls.filter((c) => c.isActive)
  if (active.length === 0) return 0
  const verified = active.filter((c) => c.status === "verified").length
  return Math.round((verified / active.length) * 100)
}

describe("compliance progress calculation", () => {
  it("3/10 verified = 30%", () => {
    const controls = [
      ...Array(3).fill(null).map(() => ({ status: "verified", isActive: true })),
      ...Array(7).fill(null).map(() => ({ status: "not_started", isActive: true })),
    ]
    expect(calculateComplianceProgress(controls)).toBe(30)
  })

  it("0/10 = 0%", () => {
    const controls = Array(10).fill(null).map(() => ({ status: "not_started", isActive: true }))
    expect(calculateComplianceProgress(controls)).toBe(0)
  })

  it("10/10 = 100%", () => {
    const controls = Array(10).fill(null).map(() => ({ status: "verified", isActive: true }))
    expect(calculateComplianceProgress(controls)).toBe(100)
  })

  it("empty controls = 0%", () => {
    expect(calculateComplianceProgress([])).toBe(0)
  })

  it("ignores inactive controls", () => {
    const controls = [
      { status: "verified", isActive: true },
      { status: "verified", isActive: true },
      { status: "not_started", isActive: true },
      { status: "verified", isActive: false }, // inactive, should be ignored
    ]
    // 2 verified out of 3 active = 67%
    expect(calculateComplianceProgress(controls)).toBe(67)
  })

  it("all controls verified then one reverted → progress drops from 100%", () => {
    const controls = [
      { status: "verified", isActive: true },
      { status: "verified", isActive: true },
      { status: "verified", isActive: true },
      { status: "verified", isActive: true },
      { status: "not_started", isActive: true }, // reverted
    ]
    expect(calculateComplianceProgress(controls)).toBe(80)
  })
})
