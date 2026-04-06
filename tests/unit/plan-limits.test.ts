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
  type UsageSnapshot,
} from "@/lib/stripe/plan-limits"

// ============================================================================
// Plan limit checker: AUM thresholds
// ============================================================================

describe("plan-limits — AUM checks", () => {
  it("Starter with $600K AUM → over limit (exceeded)", () => {
    const usage: UsageSnapshot = {
      currentAum: 600_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("exceeded")
    expect(aumStatus.ratio).toBeGreaterThan(1)
    expect(aumStatus.message).toContain("exceeded")
  })

  it("Pro with $2M AUM → under limit (ok)", () => {
    const usage: UsageSnapshot = {
      currentAum: 2_000_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("professional", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("ok")
    expect(aumStatus.ratio).toBeLessThan(0.8)
  })

  it("Starter with $400K AUM → warning (80% threshold)", () => {
    const usage: UsageSnapshot = {
      currentAum: 400_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const aumStatus = statuses.find((s) => s.resource === "aum")!
    expect(aumStatus.level).toBe("warning")
    expect(aumStatus.message).toContain("80%")
  })

  it("Starter with $300K AUM → ok (60%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 300_000,
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
  it("Starter adding 3rd member → exceeded (limit is 2)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 3,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    expect(memberStatus.level).toBe("exceeded")
    expect(memberStatus.message).toContain("exceeded")
  })

  it("Pro adding 3rd member → ok (under 5 limit)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 3,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("professional", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    expect(memberStatus.level).toBe("ok")
  })

  it("Starter with 2 members → at limit (warning at 100%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 2,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("starter", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    // 2/2 = 100% which is > 80% → warning, but not > 100% → not exceeded
    expect(memberStatus.level).toBe("warning")
  })

  it("Pro with 5 members → at limit (warning at 100%)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 5,
      storageUsedBytes: 0,
    }
    const statuses = checkPlanUsage("professional", usage)
    const memberStatus = statuses.find((s) => s.resource === "team_members")!
    // 5/5 = 100% → warning (>= 80% but not > 100%)
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

  it("Pro using 25GB → ok (50% of 50GB limit)", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 1,
      storageUsedBytes: 25 * GB,
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
      currentAum: 600_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    expect(hasExceededLimit("starter", usage)).toBe(true)
  })

  it("hasExceededLimit returns false when within limits", () => {
    const usage: UsageSnapshot = {
      currentAum: 200_000,
      teamMemberCount: 1,
      storageUsedBytes: 1024 * 1024 * 1024,
    }
    expect(hasExceededLimit("starter", usage)).toBe(false)
  })

  it("hasWarning returns true when approaching limits", () => {
    const usage: UsageSnapshot = {
      currentAum: 450_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    expect(hasWarning("starter", usage)).toBe(true)
  })

  it("hasWarning returns false when well within limits", () => {
    const usage: UsageSnapshot = {
      currentAum: 100_000,
      teamMemberCount: 1,
      storageUsedBytes: 0,
    }
    expect(hasWarning("starter", usage)).toBe(false)
  })

  it("canAddTeamMember — Starter with 1 member → true", () => {
    expect(canAddTeamMember("starter", 1)).toBe(true)
  })

  it("canAddTeamMember — Starter with 2 members → false (at limit)", () => {
    expect(canAddTeamMember("starter", 2)).toBe(false)
  })

  it("canAddTeamMember — Enterprise with 100 members → true", () => {
    expect(canAddTeamMember("enterprise", 100)).toBe(true)
  })

  it("canAddTeamMember — Pro with 4 members → true", () => {
    expect(canAddTeamMember("professional", 4)).toBe(true)
  })

  it("canAddTeamMember — Pro with 5 members → false (at limit)", () => {
    expect(canAddTeamMember("professional", 5)).toBe(false)
  })
})

// ============================================================================
// Plan config correctness
// ============================================================================

describe("plan-limits — PLAN_LIMITS config", () => {
  it("Starter has correct AUM limit ($500K)", () => {
    expect(PLAN_LIMITS.starter.maxAum).toBe(500_000)
  })

  it("Pro has correct AUM limit ($3M)", () => {
    expect(PLAN_LIMITS.professional.maxAum).toBe(3_000_000)
  })

  it("Enterprise has unlimited AUM", () => {
    expect(PLAN_LIMITS.enterprise.maxAum).toBe(Infinity)
  })

  it("Starter team member limit is 2", () => {
    expect(PLAN_LIMITS.starter.maxTeamMembers).toBe(2)
  })

  it("Pro team member limit is 5", () => {
    expect(PLAN_LIMITS.professional.maxTeamMembers).toBe(5)
  })

  it("Starter storage is 10GB", () => {
    expect(PLAN_LIMITS.starter.maxStorageBytes).toBe(10 * 1024 * 1024 * 1024)
  })

  it("Pro storage is 50GB", () => {
    expect(PLAN_LIMITS.professional.maxStorageBytes).toBe(50 * 1024 * 1024 * 1024)
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

  it("Starter monthly price is $299", () => {
    expect(PLAN_LIMITS.starter.monthlyPrice).toBe(299)
  })

  it("Pro monthly price is $999", () => {
    expect(PLAN_LIMITS.professional.monthlyPrice).toBe(999)
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
      currentAum: 600_000,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    })
    const aum = statuses.find((s) => s.resource === "aum")!
    expect(aum.message).toContain("exceeded")
    expect(aum.message).toContain("$600")
    expect(aum.message).toContain("$500")
  })

  it("warning message shows percentage", () => {
    const statuses = checkPlanUsage("starter", {
      currentAum: 450_000,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    })
    const aum = statuses.find((s) => s.resource === "aum")!
    expect(aum.message).toContain("90%")
  })

  it("ok status has null message", () => {
    const statuses = checkPlanUsage("starter", {
      currentAum: 100_000,
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
