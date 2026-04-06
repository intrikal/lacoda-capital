/**
 * ============================================================================
 * TEST FILE: alert-checks.test.ts
 * ============================================================================
 *
 * Tests the scheduled health-check functions (lib/alerts/checks.ts).
 *
 * Each function queries the database and returns AppAlert[] based on
 * conditions like stale syncs, plan limits, integration errors, etc.
 *
 * We mock the database layer to test pure logic.
 *
 * RELATED FILES:
 *   lib/alerts/checks.ts      — module under test
 *   lib/stripe/plan-limits.ts — used by checkPlanLimitAlerts
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock DB ───────────────────────────────────────────────────────────────

const mockSelectWhere = vi.fn()
const mockFindMany = vi.fn()

vi.mock("@/app/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...wargs: unknown[]) => mockSelectWhere(...wargs),
      }),
    }),
    query: {
      assets: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
}))

vi.mock("@/app/db/schema", () => ({
  integrations: {
    orgId: "orgId",
    provider: "provider",
    status: "status",
    id: "id",
    name: "name",
    lastSyncAt: "lastSyncAt",
    statusMessage: "statusMessage",
  },
  assets: {
    status: "status",
    valuedAt: "valuedAt",
    id: "id",
    name: "name",
  },
  valuations: {},
  complianceControls: {
    orgId: "orgId",
    status: "status",
    isActive: "isActive",
    dueDate: "dueDate",
    id: "id",
    name: "name",
    code: "code",
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  lt: vi.fn(),
  lte: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
}))

// ─── Import after mocks ───────────────────────────────────────────────────

import {
  checkStalePlaidSync,
  checkPlanLimitAlerts,
  checkIntegrationHealth,
  checkStaleValuations,
  checkComplianceDeadlines,
} from "@/lib/alerts/checks"

beforeEach(() => {
  mockSelectWhere.mockReset().mockResolvedValue([])
  mockFindMany.mockReset().mockResolvedValue([])
})

// ============================================================================
// checkStalePlaidSync
// ============================================================================

describe("checkStalePlaidSync", () => {
  it("returns critical alert when lastSyncAt is 25 hours ago", async () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000)
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "int-1",
        name: "Chase Checking",
        lastSyncAt: twentyFiveHoursAgo,
      },
    ])

    const alerts = await checkStalePlaidSync("org-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe("critical")
    expect(alerts[0].title).toContain("Chase Checking")
    expect(alerts[0].source).toBe("check-stale-plaid-sync")
  })

  it("returns no alert when lastSyncAt is 23 hours ago", async () => {
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000)
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "int-1",
        name: "Chase Checking",
        lastSyncAt: twentyThreeHoursAgo,
      },
    ])

    const alerts = await checkStalePlaidSync("org-1")

    expect(alerts).toHaveLength(0)
  })

  it("returns no alert when no Plaid integrations exist", async () => {
    mockSelectWhere.mockResolvedValueOnce([])

    const alerts = await checkStalePlaidSync("org-1")

    expect(alerts).toHaveLength(0)
  })

  it("skips integrations without lastSyncAt", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: "int-1", name: "New Integration", lastSyncAt: null },
    ])

    const alerts = await checkStalePlaidSync("org-1")

    expect(alerts).toHaveLength(0)
  })
})

// ============================================================================
// checkPlanLimitAlerts
// ============================================================================

describe("checkPlanLimitAlerts", () => {
  it("returns warning at 81% of AUM limit", () => {
    const alerts = checkPlanLimitAlerts("org-1", "starter", {
      currentAum: 405_000, // 81% of $500K
      teamMemberCount: 1,
      storageUsedBytes: 0,
    })

    const aumAlert = alerts.find((a) => a.title.includes("aum"))
    expect(aumAlert).toBeDefined()
    expect(aumAlert!.severity).toBe("warning")
  })

  it("returns no alert at 79%", () => {
    const alerts = checkPlanLimitAlerts("org-1", "starter", {
      currentAum: 395_000, // 79% of $500K
      teamMemberCount: 1,
      storageUsedBytes: 0,
    })

    const aumAlert = alerts.find((a) => a.title.includes("aum"))
    expect(aumAlert).toBeUndefined()
  })

  it("returns critical when exceeded (> 100%)", () => {
    const alerts = checkPlanLimitAlerts("org-1", "starter", {
      currentAum: 600_000, // 120% of $500K
      teamMemberCount: 1,
      storageUsedBytes: 0,
    })

    const aumAlert = alerts.find((a) => a.title.includes("exceeded"))
    expect(aumAlert).toBeDefined()
    expect(aumAlert!.severity).toBe("critical")
  })

  it("enterprise Infinity limit → never alerts", () => {
    const alerts = checkPlanLimitAlerts("org-1", "enterprise", {
      currentAum: 999_999_999_999,
      teamMemberCount: 9999,
      storageUsedBytes: 999_999_999_999,
    })

    expect(alerts).toHaveLength(0)
  })
})

// ============================================================================
// checkIntegrationHealth
// ============================================================================

describe("checkIntegrationHealth", () => {
  it("returns one alert for each errored integration", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      { id: "int-1", name: "QuickBooks", provider: "quickbooks", statusMessage: "Auth expired" },
      { id: "int-2", name: "Plaid", provider: "plaid", statusMessage: "Rate limited" },
    ])

    const alerts = await checkIntegrationHealth("org-1")

    expect(alerts).toHaveLength(2)
    expect(alerts[0].severity).toBe("warning")
    expect(alerts[0].title).toContain("QuickBooks")
    expect(alerts[1].title).toContain("Plaid")
  })

  it("returns no alerts when all integrations are connected", async () => {
    mockSelectWhere.mockResolvedValueOnce([])

    const alerts = await checkIntegrationHealth("org-1")

    expect(alerts).toHaveLength(0)
  })
})

// ============================================================================
// checkStaleValuations
// ============================================================================

describe("checkStaleValuations", () => {
  it("returns warning for asset valued 91 days ago", async () => {
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
    mockFindMany.mockResolvedValueOnce([
      {
        id: "asset-1",
        name: "Office Building",
        valuedAt: ninetyOneDaysAgo,
        status: "active",
        entity: { client: { orgId: "org-1" } },
      },
    ])

    const alerts = await checkStaleValuations("org-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe("warning")
    expect(alerts[0].title).toContain("Office Building")
  })

  it("returns no alert for asset valued 89 days ago", async () => {
    // The DB query filters by lt(valuedAt, cutoff), so assets valued
    // within 90 days won't be returned. Mock returns empty.
    mockFindMany.mockResolvedValueOnce([])

    const alerts = await checkStaleValuations("org-1")

    expect(alerts).toHaveLength(0)
  })

  it("skips assets from other orgs", async () => {
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
    mockFindMany.mockResolvedValueOnce([
      {
        id: "asset-1",
        name: "Other Org Asset",
        valuedAt: ninetyOneDaysAgo,
        status: "active",
        entity: { client: { orgId: "org-OTHER" } },
      },
    ])

    const alerts = await checkStaleValuations("org-1")

    expect(alerts).toHaveLength(0)
  })
})

// ============================================================================
// checkComplianceDeadlines
// ============================================================================

describe("checkComplianceDeadlines", () => {
  it("returns warning for control due in 6 days", async () => {
    const in6Days = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "ctrl-1",
        name: "KYC Verification",
        code: "KYC-001",
        dueDate: in6Days.toISOString(),
      },
    ])

    const alerts = await checkComplianceDeadlines("org-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe("warning")
    expect(alerts[0].title).toContain("KYC-001")
    expect(alerts[0].description).toContain("6 day")
  })

  it("returns no alert for control due in 8 days", async () => {
    // DB query filters by lte(dueDate, in7Days), so 8 days won't be returned
    mockSelectWhere.mockResolvedValueOnce([])

    const alerts = await checkComplianceDeadlines("org-1")

    expect(alerts).toHaveLength(0)
  })

  it("handles overdue controls", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "ctrl-2",
        name: "AML Check",
        code: "AML-002",
        dueDate: twoDaysAgo.toISOString(),
      },
    ])

    const alerts = await checkComplianceDeadlines("org-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0].description).toContain("overdue")
  })
})
