/**
 * Unit tests for plan limits and usage checking.
 *
 * Tests:
 *   - Plan limit checker for AUM thresholds
 *   - Team member limits per plan
 *   - Storage calculation against plan limits
 *   - Warning vs exceeded level detection
 *   - canAddTeamMember guard
 */

import { describe, it, expect } from "vitest"
import {
  checkPlanUsage,
  hasExceededLimit,
  hasWarning,
  canAddTeamMember,
  PLAN_LIMITS,
  type PlanTier,
  type UsageSnapshot,
} from "@/lib/stripe/plan-limits"

// ============================================================================
// Plan limit checker: AUM thresholds
// ============================================================================

describe("plan-limits — AUM checks", () => {
  it("Starter with $30M AUM → over limit warning (exceeded)", () => {
    const usage: UsageSnapshot = {
      currentAum: 30_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("exceeded")
    expect(aumStatus.ratio).toBeGreaterThan(1)
    expect(aumStatus.message).toContain("exceeded")
  })

  it("Pro with $30M AUM → under limit (ok)", () => {
    const usage: UsageSnapshot = {
      currentAum: 30_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("professional", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("ok")
    expect(aumStatus.ratio).toBeLessThan(0.8)
  })

  it("Starter with $20M AUM → warning (80% threshold)", () => {
    const usage: UsageSnapshot = {
      currentAum: 20_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("warning")
    expect(aumStatus.message).toContain("80%")
  })

  it("Starter with $15M AUM → ok (60%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 15_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("ok")
  })

  it("Enterprise with $500M AUM → always ok (unlimited)", () => {
    const usage: UsageSnapshot = {
      currentAum: 500_000_000,
      teamMemberCount: 100,
      storageUsedBytes: 1024 * 1024 * 1024 * 500,
    }
    const statuses = checkPlanUsage("enterprise", usage)
    expect(statuses.every((s) => s.level === "ok")).toBe(true)
  })
})

// ============================================================================
// Team member limits
// ============================================================================

describe("plan-limits — team member limits", () => {
  it("Starter adding 4th member → warning (exceeded)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 4,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    expect(memberStatus.level).toBe("exceeded")
    expect(memberStatus.message).toContain("exceeded")
  })

  it("Pro adding 4th member → ok (under 10 limit)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 4,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("professional", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    expect(memberStatus.level).toBe("ok")
  })

  it("Starter with 3 members → at limit but warning (100%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 3,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    // 3/3 = 100% which is > 80% → warning, but not > 100% → not exceeded
    expect(memberStatus.level).toBe("warning")
  })

  it("Pro with 8 members → warning (80%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 8,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("professional", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    expect(memberStatus.level).toBe("warning")
  })
})

// ============================================================================
// Storage limits
// ============================================================================

describe("plan-limits — storage limits", () => {
  const GB = 1024 * 1024 * 1024

  it("Starter using 11GB → exceeded (limit 10GB)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 1,
      storageUsedBytes: 11 * GB,
    }
    const statuses = checkPlanUsage("starter", usage)
    const storageStatus = statuses.find((s) => s.resource === "storage")!
    expect(storageStatus.level).toBe("exceeded")
  })

  it("Starter using 8.5GB → warning (85%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 1,
      storageUsedBytes: 8.5 * GB,
    }
    const statuses = checkPlanUsage("starter", usage)
    const storageStatus = statuses.find((s) => s.resource === "storage")!
    expect(storageStatus.level).toBe("warning")
  })

  it("Pro using 50GB → ok (50% of 100GB limit)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 1,
      storageUsedBytes: 50 * GB,
    }
    const statuses = checkPlanUsage("professional", usage)
    const storageStatus = statuses.find((s) => s.resource === "storage")!
    expect(storageStatus.level).toBe("ok")
  })
})

// ============================================================================
// Convenience helpers
// ============================================================================

describe("plan-limits — helper functions", () => {
  it("hasExceededLimit returns true when AUM over limit", () => {
    const usage: UsageSnapshot = {
      currentAum: 30_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    expect(hasExceededLimit("starter", usage)).toBe(true)
  })

  it("hasExceededLimit returns false when within limits", () => {
    const usage: UsageSnapshot = {
      currentAum: 10_000_000,
      teamMemberCount: 2,
      storageUsedBytes: 1024 * 1024 * 1024,
    }
    expect(hasExceededLimit("starter", usage)).toBe(false)
  })

  it("hasWarning returns true when approaching limits", () => {
    const usage: UsageSnapshot = {
      currentAum: 22_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    expect(hasWarning("starter", usage)).toBe(true)
  })

  it("hasWarning returns false when well within limits", () => {
    const usage: UsageSnapshot = {
      currentAum: 5_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    expect(hasWarning("starter", usage)).toBe(false)
  })

  it("canAddTeamMember — Starter with 2 members → true", () => {
    expect(canAddTeamMember("starter", 2)).toBe(true)
  })

  it("canAddTeamMember — Starter with 3 members → false (at limit)", () => {
    expect(canAddTeamMember("starter", 3)).toBe(false)
  })

  it("canAddTeamMember — Enterprise with 100 members → true", () => {
    expect(canAddTeamMember("enterprise", 100)).toBe(true)
  })

  it("canAddTeamMember — Pro with 9 members → true", () => {
    expect(canAddTeamMember("professional", 9)).toBe(true)
  })

  it("canAddTeamMember — Pro with 10 members → false", () => {
    expect(canAddTeamMember("professional", 10)).toBe(false)
  })
})

// ============================================================================
// Plan config correctness
// ============================================================================

describe("plan-limits — PLAN_LIMITS config", () => {
  it("Starter has correct AUM limit ($25M)", () => {
    expect(PLAN_LIMITS.starter.maxAum).toBe(25_000_000)
  })

  it("Pro has correct AUM limit ($100M)", () => {
    expect(PLAN_LIMITS.professional.maxAum).toBe(100_000_000)
  })

  it("Enterprise has unlimited AUM", () => {
    expect(PLAN_LIMITS.enterprise.maxAum).toBe(Infinity)
  })

  it("Starter team member limit is 3", () => {
    expect(PLAN_LIMITS.starter.maxTeamMembers).toBe(3)
  })

  it("Pro team member limit is 10", () => {
    expect(PLAN_LIMITS.professional.maxTeamMembers).toBe(10)
  })

  it("Starter storage is 10GB", () => {
    expect(PLAN_LIMITS.starter.maxStorageBytes).toBe(10 * 1024 * 1024 * 1024)
  })

  it("Pro storage is 100GB", () => {
    expect(PLAN_LIMITS.professional.maxStorageBytes).toBe(100 * 1024 * 1024 * 1024)
  })

  it("Starter does not have API access", () => {
    expect(PLAN_LIMITS.starter.apiAccess).toBe(false)
  })

  it("Pro has API access", () => {
    expect(PLAN_LIMITS.professional.apiAccess).toBe(true)
  })

  it("Enterprise has custom integrations", () => {
    expect(PLAN_LIMITS.enterprise.customIntegrations).toBe(true)
  })

  it("Free plan has $0 monthly price", () => {
    expect(PLAN_LIMITS.free.monthlyPrice).toBe(0)
  })

  it("Starter monthly price is $499", () => {
    expect(PLAN_LIMITS.starter.monthlyPrice).toBe(499)
  })

  it("Pro monthly price is $1,499", () => {
    expect(PLAN_LIMITS.professional.monthlyPrice).toBe(1499)
  })

  it("Free plan has no AUM limit (0)", () => {
    expect(PLAN_LIMITS.free.maxAum).toBe(0)
  })
})

// ============================================================================
// Usage status message formatting
// ============================================================================

describe("plan-limits — message formatting", () => {
  it("exceeded message mentions 'exceeded'", () => {
    const statuses = checkPlanUsage("starter", {
      currentAum: 30_000_000,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    })
    const aum = statuses.find((s) => s.resource === "aum")!
    expect(aum.message).toContain("exceeded")
    expect(aum.message).toContain("$30.0M")
    expect(aum.message).toContain("$25.0M")
  })

  it("warning message shows percentage", () => {
    const statuses = checkPlanUsage("starter", {
      currentAum: 22_500_000,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    })
    const aum = statuses.find((s) => s.resource === "aum")!
    expect(aum.message).toContain("90%")
  })

  it("ok status has null message", () => {
    const statuses = checkPlanUsage("starter", {
      currentAum: 5_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    })
    const aum = statuses.find((s) => s.resource === "aum")!
    expect(aum.message).toBeNull()
  })

  it("enterprise always returns null messages", () => {
    const statuses = checkPlanUsage("enterprise", {
      currentAum: 999_000_000,
      teamMemberCount: 500,
      storageUsedBytes: 1024 * 1024 * 1024 * 9999,
    })
    expect(statuses.every((s) => s.message === null)).toBe(true)
  })
})
