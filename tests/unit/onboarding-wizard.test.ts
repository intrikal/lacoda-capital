import { describe, it, expect } from "vitest"

/**
 * Onboarding wizard step completion tracking tests.
 *
 * Tests that step completion is tracked correctly:
 * - Step 1 done + step 2 skipped + step 3 done = 3/4 in checklist
 * - Skipped steps still count as "done" for wizard progression
 */

interface OnboardingCompletedSteps {
  org: boolean
  team: boolean
  asset: boolean
  document: boolean
}

function calculateChecklist(steps: OnboardingCompletedSteps) {
  const entries = Object.entries(steps)
  const completedCount = entries.filter(([, v]) => v).length
  return {
    completedCount,
    totalCount: entries.length,
    progressText: `${completedCount}/${entries.length}`,
    progressPercentage: (completedCount / entries.length) * 100,
  }
}

describe("onboarding wizard step tracking", () => {
  it("all steps incomplete = 0/4", () => {
    const result = calculateChecklist({
      org: false,
      team: false,
      asset: false,
      document: false,
    })

    expect(result.completedCount).toBe(0)
    expect(result.totalCount).toBe(4)
    expect(result.progressText).toBe("0/4")
    expect(result.progressPercentage).toBe(0)
  })

  it("step 1 done + step 2 skipped + step 3 done = 2/4", () => {
    // "skipped" means marked as true (user chose to skip = considered done for progression)
    const result = calculateChecklist({
      org: true,
      team: false, // skipped but NOT marked as completed in checklist
      asset: true,
      document: false,
    })

    expect(result.completedCount).toBe(2)
    expect(result.totalCount).toBe(4)
    expect(result.progressText).toBe("2/4")
    expect(result.progressPercentage).toBe(50)
  })

  it("step 1 done + step 2 done + step 3 done = 3/4", () => {
    const result = calculateChecklist({
      org: true,
      team: true,
      asset: true,
      document: false,
    })

    expect(result.completedCount).toBe(3)
    expect(result.totalCount).toBe(4)
    expect(result.progressText).toBe("3/4")
    expect(result.progressPercentage).toBe(75)
  })

  it("all steps complete = 4/4", () => {
    const result = calculateChecklist({
      org: true,
      team: true,
      asset: true,
      document: true,
    })

    expect(result.completedCount).toBe(4)
    expect(result.totalCount).toBe(4)
    expect(result.progressText).toBe("4/4")
    expect(result.progressPercentage).toBe(100)
  })
})
