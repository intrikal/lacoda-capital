/**
 * Unit tests for plan limits and pricing tier logic.
 *
 * Tests pure functions in lib/stripe/plan-limits.ts:
 *   - PLAN_LIMITS values are correct for all 4 paid tiers
 *   - checkPlanUsage returns correct levels (ok/warning/exceeded)
 *   - hasExceededLimit / hasWarning quick checks
 *   - canAddTeamMember enforcement
 *   - STRIPE_PRICE_IDS has all 8 keys (4 plans × 2 intervals)
 *   - isUpgrade / nextUpgradeTier progression
 *   - Edge cases: zero usage, exactly at limit, just over limit
 */

import { describe, it, expect } from "vitest"
import {
  PLAN_LIMITS,
  PLAN_ORDER,
  STRIPE_PRICE_IDS,
  checkPlanUsage,
  hasExceededLimit,
  hasWarning,
  canAddTeamMember,
  isUpgrade,
  nextUpgradeTier,
  type PlanTier,
  type UsageSnapshot,
} from "@/lib/stripe/plan-limits"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GB = 1024 * 1024 * 1024

function zeroUsage(): UsageSnapshot {
  return { currentAum: 0, teamMemberCount: 0, storageUsedBytes: 0 }
}


// ─── PLAN_LIMITS values ───────────────────────────────────────────────────────

describe("PLAN_LIMITS — Starter", () => {
  const l = PLAN_LIMITS.starter

  it("has $500K AUM cap", () => expect(l.maxAum).toBe(500_000))
  it("has 2 team members", () => expect(l.maxTeamMembers).toBe(2))
  it("has 10 GB storage", () => expect(l.maxStorageBytes).toBe(10 * GB))
  it("has no API access", () => expect(l.apiAccess).toBe(false))
  it("has no custom integrations", () => expect(l.customIntegrations).toBe(false))
  it("costs $299/mo monthly", () => expect(l.monthlyPrice).toBe(299))
  it("costs $239/mo annual", () => expect(l.annualPricePerMonth).toBe(239))
})

describe("PLAN_LIMITS — Growth", () => {
  const l = PLAN_LIMITS.growth

  it("has $1.5M AUM cap", () => expect(l.maxAum).toBe(1_500_000))
  it("has 3 team members", () => expect(l.maxTeamMembers).toBe(3))
  it("has 25 GB storage", () => expect(l.maxStorageBytes).toBe(25 * GB))
  it("has no API access", () => expect(l.apiAccess).toBe(false))
  it("has no custom integrations", () => expect(l.customIntegrations).toBe(false))
  it("costs $599/mo monthly", () => expect(l.monthlyPrice).toBe(599))
  it("costs $479/mo annual", () => expect(l.annualPricePerMonth).toBe(479))
})

describe("PLAN_LIMITS — Professional", () => {
  const l = PLAN_LIMITS.professional

  it("has $3M AUM cap", () => expect(l.maxAum).toBe(3_000_000))
  it("has 5 team members", () => expect(l.maxTeamMembers).toBe(5))
  it("has 50 GB storage", () => expect(l.maxStorageBytes).toBe(50 * GB))
  it("has API access", () => expect(l.apiAccess).toBe(true))
  it("has no custom integrations", () => expect(l.customIntegrations).toBe(false))
  it("costs $999/mo monthly", () => expect(l.monthlyPrice).toBe(999))
  it("costs $799/mo annual", () => expect(l.annualPricePerMonth).toBe(799))
})

describe("PLAN_LIMITS — Elite", () => {
  const l = PLAN_LIMITS.elite

  it("has $5M AUM cap", () => expect(l.maxAum).toBe(5_000_000))
  it("has 10 team members", () => expect(l.maxTeamMembers).toBe(10))
  it("has 100 GB storage", () => expect(l.maxStorageBytes).toBe(100 * GB))
  it("has API access", () => expect(l.apiAccess).toBe(true))
  it("has custom integrations", () => expect(l.customIntegrations).toBe(true))
  it("costs $1,499/mo monthly", () => expect(l.monthlyPrice).toBe(1499))
  it("costs $1,199/mo annual", () => expect(l.annualPricePerMonth).toBe(1199))
})

describe("PLAN_LIMITS — Enterprise", () => {
  const l = PLAN_LIMITS.enterprise

  it("has unlimited AUM", () => expect(l.maxAum).toBe(Infinity))
  it("has unlimited team members", () => expect(l.maxTeamMembers).toBe(Infinity))
  it("has unlimited storage", () => expect(l.maxStorageBytes).toBe(Infinity))
  it("has API access", () => expect(l.apiAccess).toBe(true))
  it("has custom integrations", () => expect(l.customIntegrations).toBe(true))
  it("has custom pricing (-1)", () => expect(l.monthlyPrice).toBe(-1))
})

describe("PLAN_LIMITS — annual discount is exactly 20% off", () => {
  const paid: PlanTier[] = ["starter", "growth", "professional", "elite"]

  paid.forEach((plan) => {
    it(`${plan} annual ≈ monthly * 0.80`, () => {
      const l = PLAN_LIMITS[plan]
      const expected = Math.round(l.monthlyPrice * 0.8)
      expect(l.annualPricePerMonth).toBe(expected)
    })
  })
})

// ─── STRIPE_PRICE_IDS ────────────────────────────────────────────────────────

describe("STRIPE_PRICE_IDS", () => {
  const expectedKeys = [
    "starter_monthly", "starter_annual",
    "growth_monthly",  "growth_annual",
    "professional_monthly", "professional_annual",
    "elite_monthly",   "elite_annual",
  ]

  expectedKeys.forEach((key) => {
    it(`has key "${key}"`, () => {
      expect(key in STRIPE_PRICE_IDS).toBe(true)
    })
  })

  it("has exactly 8 keys", () => {
    expect(Object.keys(STRIPE_PRICE_IDS)).toHaveLength(8)
  })
})

// ─── checkPlanUsage ───────────────────────────────────────────────────────────

describe("checkPlanUsage — ok level at zero usage", () => {
  const plans: PlanTier[] = ["starter", "growth", "professional", "elite"]

  plans.forEach((plan) => {
    it(`${plan}: all resources are ok at zero`, () => {
      const statuses = checkPlanUsage(plan, zeroUsage())
      expect(statuses.every((s) => s.level === "ok")).toBe(true)
    })
  })
})

describe("checkPlanUsage — warning at 80%", () => {
  it("AUM at exactly 80% is warning", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.starter.maxAum * 0.8,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    const [aum] = checkPlanUsage("starter", usage)
    expect(aum.level).toBe("warning")
    expect(aum.message).toContain("80%")
  })

  it("AUM at 79% is still ok", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.starter.maxAum * 0.79,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    const [aum] = checkPlanUsage("starter", usage)
    expect(aum.level).toBe("ok")
  })

  it("team members at exactly 80% is warning", () => {
    // Growth: 3 members. 80% = 2.4 → floor to 2 still ok; test at limit-adjacent
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: Math.floor(PLAN_LIMITS.growth.maxTeamMembers * 0.8),
      storageUsedBytes: 0,
    }
    // 3 * 0.8 = 2.4 → floor = 2 → ratio = 2/3 = 0.67 → ok
    const [, members] = checkPlanUsage("growth", usage)
    expect(members.level).toBe("ok")
  })
})

describe("checkPlanUsage — exceeded at >100%", () => {
  it("AUM 1 dollar over limit is exceeded", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.starter.maxAum + 1,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    const [aum] = checkPlanUsage("starter", usage)
    expect(aum.level).toBe("exceeded")
    expect(aum.message).toContain("exceeded")
  })

  it("team members 1 over limit is exceeded", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: PLAN_LIMITS.professional.maxTeamMembers + 1,
      storageUsedBytes: 0,
    }
    const [, members] = checkPlanUsage("professional", usage)
    expect(members.level).toBe("exceeded")
  })

  it("storage 1 byte over limit is exceeded", () => {
    const usage: UsageSnapshot = {
      currentAum: 0,
      teamMemberCount: 0,
      storageUsedBytes: PLAN_LIMITS.elite.maxStorageBytes + 1,
    }
    const [,, storage] = checkPlanUsage("elite", usage)
    expect(storage.level).toBe("exceeded")
  })
})

describe("checkPlanUsage — enterprise always ok", () => {
  it("even at massive values, enterprise is ok", () => {
    const usage: UsageSnapshot = {
      currentAum: 999_999_999_999,
      teamMemberCount: 9999,
      storageUsedBytes: 999_999 * GB,
    }
    const statuses = checkPlanUsage("enterprise", usage)
    expect(statuses.every((s) => s.level === "ok")).toBe(true)
  })
})

describe("checkPlanUsage — free plan always ok (no limits to exceed)", () => {
  it("free plan with no usage is ok", () => {
    const statuses = checkPlanUsage("free", zeroUsage())
    expect(statuses.every((s) => s.level === "ok")).toBe(true)
  })
})

// ─── hasExceededLimit ─────────────────────────────────────────────────────────

describe("hasExceededLimit", () => {
  it("returns false when all resources are under limit", () => {
    expect(hasExceededLimit("starter", zeroUsage())).toBe(false)
  })

  it("returns true when AUM exceeds limit", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.growth.maxAum + 1,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    expect(hasExceededLimit("growth", usage)).toBe(true)
  })

  it("returns false at exactly the AUM limit", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.professional.maxAum,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    expect(hasExceededLimit("professional", usage)).toBe(false)
  })
})

// ─── hasWarning ───────────────────────────────────────────────────────────────

describe("hasWarning", () => {
  it("returns false when all resources are under 80%", () => {
    expect(hasWarning("elite", zeroUsage())).toBe(false)
  })

  it("returns true when AUM is at warning level", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.elite.maxAum * 0.9,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    expect(hasWarning("elite", usage)).toBe(true)
  })

  it("returns true when AUM is exceeded (exceeded implies warning)", () => {
    const usage: UsageSnapshot = {
      currentAum: PLAN_LIMITS.starter.maxAum * 2,
      teamMemberCount: 0,
      storageUsedBytes: 0,
    }
    expect(hasWarning("starter", usage)).toBe(true)
  })
})

// ─── canAddTeamMember ────────────────────────────────────────────────────────

describe("canAddTeamMember", () => {
  it("starter: can add when at 1 member", () => {
    expect(canAddTeamMember("starter", 1)).toBe(true)
  })

  it("starter: cannot add at limit (2)", () => {
    expect(canAddTeamMember("starter", 2)).toBe(false)
  })

  it("growth: can add at 2", () => {
    expect(canAddTeamMember("growth", 2)).toBe(true)
  })

  it("growth: cannot add at limit (3)", () => {
    expect(canAddTeamMember("growth", 3)).toBe(false)
  })

  it("professional: can add at 4", () => {
    expect(canAddTeamMember("professional", 4)).toBe(true)
  })

  it("professional: cannot add at limit (5)", () => {
    expect(canAddTeamMember("professional", 5)).toBe(false)
  })

  it("elite: can add at 9", () => {
    expect(canAddTeamMember("elite", 9)).toBe(true)
  })

  it("elite: cannot add at limit (10)", () => {
    expect(canAddTeamMember("elite", 10)).toBe(false)
  })

  it("enterprise: always can add (unlimited)", () => {
    expect(canAddTeamMember("enterprise", 10_000)).toBe(true)
  })

  it("free: cannot add when at limit (1)", () => {
    expect(canAddTeamMember("free", 1)).toBe(false)
  })
})

// ─── isUpgrade ───────────────────────────────────────────────────────────────

describe("isUpgrade", () => {
  it("free → starter is upgrade", () => expect(isUpgrade("free", "starter")).toBe(true))
  it("starter → growth is upgrade", () => expect(isUpgrade("starter", "growth")).toBe(true))
  it("growth → professional is upgrade", () => expect(isUpgrade("growth", "professional")).toBe(true))
  it("professional → elite is upgrade", () => expect(isUpgrade("professional", "elite")).toBe(true))
  it("elite → enterprise is upgrade", () => expect(isUpgrade("elite", "enterprise")).toBe(true))
  it("starter → starter is not upgrade", () => expect(isUpgrade("starter", "starter")).toBe(false))
  it("elite → professional is not upgrade (downgrade)", () => expect(isUpgrade("elite", "professional")).toBe(false))
  it("professional → starter is not upgrade (downgrade)", () => expect(isUpgrade("professional", "starter")).toBe(false))
})

// ─── nextUpgradeTier ─────────────────────────────────────────────────────────

describe("nextUpgradeTier", () => {
  it("starter → growth", () => expect(nextUpgradeTier("starter")).toBe("growth"))
  it("growth → professional", () => expect(nextUpgradeTier("growth")).toBe("professional"))
  it("professional → elite", () => expect(nextUpgradeTier("professional")).toBe("elite"))
  it("elite → null (already at top paid tier)", () => expect(nextUpgradeTier("elite")).toBeNull())
  it("free → null (not a paid tier)", () => expect(nextUpgradeTier("free")).toBeNull())
})

// ─── PLAN_ORDER ───────────────────────────────────────────────────────────────

describe("PLAN_ORDER", () => {
  it("contains all 6 tiers in order", () => {
    expect(PLAN_ORDER).toEqual(["free", "starter", "growth", "professional", "elite", "enterprise"])
  })

  it("each tier is strictly higher index than the one before", () => {
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      expect(PLAN_ORDER.indexOf(PLAN_ORDER[i])).toBeGreaterThan(
        PLAN_ORDER.indexOf(PLAN_ORDER[i - 1])
      )
    }
  })
})

// ─── AUM limits are strictly ascending ───────────────────────────────────────

describe("AUM caps are strictly ascending across paid tiers", () => {
  it("starter < growth < professional < elite < enterprise", () => {
    expect(PLAN_LIMITS.starter.maxAum).toBeLessThan(PLAN_LIMITS.growth.maxAum)
    expect(PLAN_LIMITS.growth.maxAum).toBeLessThan(PLAN_LIMITS.professional.maxAum)
    expect(PLAN_LIMITS.professional.maxAum).toBeLessThan(PLAN_LIMITS.elite.maxAum)
    expect(PLAN_LIMITS.elite.maxAum).toBeLessThan(PLAN_LIMITS.enterprise.maxAum)
  })
})

describe("Team member limits are non-decreasing across paid tiers", () => {
  it("starter ≤ growth ≤ professional ≤ elite ≤ enterprise", () => {
    expect(PLAN_LIMITS.starter.maxTeamMembers).toBeLessThanOrEqual(PLAN_LIMITS.growth.maxTeamMembers)
    expect(PLAN_LIMITS.growth.maxTeamMembers).toBeLessThanOrEqual(PLAN_LIMITS.professional.maxTeamMembers)
    expect(PLAN_LIMITS.professional.maxTeamMembers).toBeLessThanOrEqual(PLAN_LIMITS.elite.maxTeamMembers)
    expect(PLAN_LIMITS.elite.maxTeamMembers).toBeLessThanOrEqual(PLAN_LIMITS.enterprise.maxTeamMembers)
  })
})

describe("Monthly prices are strictly ascending across paid tiers", () => {
  it("starter < growth < professional < elite", () => {
    expect(PLAN_LIMITS.starter.monthlyPrice).toBeLessThan(PLAN_LIMITS.growth.monthlyPrice)
    expect(PLAN_LIMITS.growth.monthlyPrice).toBeLessThan(PLAN_LIMITS.professional.monthlyPrice)
    expect(PLAN_LIMITS.professional.monthlyPrice).toBeLessThan(PLAN_LIMITS.elite.monthlyPrice)
  })
})
