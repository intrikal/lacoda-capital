/**
 * ============================================================================
 * TEST FILE: dashboard.service.test.ts
 * ============================================================================
 *
 * Kevin, the dashboard service aggregates data from multiple tables.
 * Each function fires different DB queries, so we set up `db.select` to
 * return mock chains in the right call order.
 *
 * Query chain patterns per function:
 *
 *   getDashboardSummary:
 *     1 call: .from(assets).where(isNull)                     terminal: where
 *
 *   getKPIs:
 *     1st:   .from(assets).where(isNull)                      terminal: where
 *     2nd:   .from(clients).where(isNull)                     terminal: where
 *
 *   getAllocationData:
 *     1 call: .from(assets).where(isNull).groupBy(assetClass) terminal: groupBy
 *
 *   getPerformanceData:
 *     No DB calls — returns static data.
 *
 *   getRecentActivity:
 *     1 call: .from(ledgerEvents).orderBy(desc).limit(10)     terminal: limit
 *
 * RELATED FILES:
 *   lib/services/dashboard.service.ts  — service under test
 *   app/db/schema/assets.ts            — assets table
 *   app/db/schema/clients.ts           — clients table
 *   app/db/schema/ledger_events.ts     — ledgerEvents table
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getDashboardSummary,
  getKPIs,
  getAllocationData,
  getPerformanceData,
  getRecentActivity,
} from "@/lib/services/dashboard.service"

// ============================================================================
// HELPERS
// ============================================================================

function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeLedgerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-001",
    action: "asset_created",
    payload: { details: "New asset added", entityName: "Manhattan Tower" },
    actorUserId: "user-001",
    createdAt: new Date("2024-01-20T10:00:00Z"),
    targetType: "asset",
    ...overrides,
  }
}

// ============================================================================
// 1. getDashboardSummary
// ============================================================================

describe("getDashboardSummary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns totalPortfolioValue from asset aggregate", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("where", [{ totalValue: "12500000.75" }]) as never,
    )

    const summary = await getDashboardSummary()
    expect(summary.totalPortfolioValue).toBeCloseTo(12_500_000.75)
  })

  it("returns 0 when no assets exist (COALESCE default)", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", [{ totalValue: "0" }]) as never)

    const summary = await getDashboardSummary()
    expect(summary.totalPortfolioValue).toBe(0)
  })

  it("handles null totalValue gracefully", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", [{ totalValue: null }]) as never)

    const summary = await getDashboardSummary()
    expect(summary.totalPortfolioValue).toBe(0)
  })

  it("handles empty aggregate result gracefully", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const summary = await getDashboardSummary()
    expect(summary.totalPortfolioValue).toBe(0)
  })

  it("netWorth equals totalPortfolioValue", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("where", [{ totalValue: "5000000" }]) as never,
    )

    const summary = await getDashboardSummary()
    expect(summary.netWorth).toBe(summary.totalPortfolioValue)
  })

  it("activeAlerts is hardcoded to 3 (no alerts table)", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", [{ totalValue: "0" }]) as never)

    const summary = await getDashboardSummary()
    expect(summary.activeAlerts).toBe(3)
  })

  it("applies deletedAt IS NULL filter", async () => {
    const chain = makeChain("where", [{ totalValue: "0" }])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getDashboardSummary()
    expect(chain.where).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("where", [])
    chain.where.mockRejectedValue(new Error("Connection refused"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getDashboardSummary()).rejects.toThrow("Connection refused")
  })
})

// ============================================================================
// 2. getKPIs
// ============================================================================

describe("getKPIs", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns AUM from asset aggregate as first KPI", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [{ totalValue: "50000000" }]) as never)
      .mockReturnValueOnce(makeChain("where", [{ value: 12 }]) as never)

    const kpis = await getKPIs()
    expect(kpis[0].label).toBe("Assets Under Management")
    expect(kpis[0].value).toBeCloseTo(50_000_000)
    expect(kpis[0].format).toBe("currency")
  })

  it("returns client count from clients aggregate as second KPI", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [{ totalValue: "0" }]) as never)
      .mockReturnValueOnce(makeChain("where", [{ value: 12 }]) as never)

    const kpis = await getKPIs()
    expect(kpis[1].label).toBe("Total Clients")
    expect(kpis[1].value).toBe(12)
    expect(kpis[1].format).toBe("number")
  })

  it("returns 0 for AUM when no assets", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [{ totalValue: "0" }]) as never)
      .mockReturnValueOnce(makeChain("where", [{ value: 0 }]) as never)

    const kpis = await getKPIs()
    expect(kpis[0].value).toBe(0)
  })

  it("returns 0 for client count when aggregate is empty", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [{ totalValue: "1000000" }]) as never)
      .mockReturnValueOnce(makeChain("where", []) as never)

    const kpis = await getKPIs()
    expect(kpis[1].value).toBe(0)
  })

  it("returns exactly 2 KPI items", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [{ totalValue: "0" }]) as never)
      .mockReturnValueOnce(makeChain("where", [{ value: 0 }]) as never)

    const kpis = await getKPIs()
    expect(kpis).toHaveLength(2)
  })
})

// ============================================================================
// 3. getAllocationData
// ============================================================================

describe("getAllocationData", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no assets exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("groupBy", []) as never)

    const data = await getAllocationData()
    expect(data).toEqual([])
  })

  it("maps assetClass to human-readable name", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("groupBy", [
        { assetClass: "real_estate", totalValue: "1000000" },
      ]) as never,
    )

    const data = await getAllocationData()
    expect(data[0].name).toBe("Real Estate")
  })

  it("falls back to raw assetClass for unknown classes", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("groupBy", [
        { assetClass: "unknown_class", totalValue: "500000" },
      ]) as never,
    )

    const data = await getAllocationData()
    expect(data[0].name).toBe("unknown_class")
  })

  it("converts totalValue string to number", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("groupBy", [
        { assetClass: "equities", totalValue: "2500000.50" },
      ]) as never,
    )

    const data = await getAllocationData()
    expect(data[0].value).toBeCloseTo(2_500_000.5)
  })

  it("assigns a hex color to each known asset class", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("groupBy", [
        { assetClass: "equities", totalValue: "1000000" },
        { assetClass: "fixed_income", totalValue: "500000" },
      ]) as never,
    )

    const data = await getAllocationData()
    for (const d of data) {
      expect(d.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it("returns one entry per asset class group", async () => {
    vi.mocked(db.select).mockReturnValue(
      makeChain("groupBy", [
        { assetClass: "equities", totalValue: "1000000" },
        { assetClass: "real_estate", totalValue: "2000000" },
        { assetClass: "cash", totalValue: "500000" },
      ]) as never,
    )

    const data = await getAllocationData()
    expect(data).toHaveLength(3)
  })

  it("applies groupBy on the query", async () => {
    const chain = makeChain("groupBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getAllocationData()
    expect(chain.groupBy).toHaveBeenCalled()
  })
})

// ============================================================================
// 4. getPerformanceData — static, no DB
// ============================================================================

describe("getPerformanceData", () => {
  it("returns 12 months of performance data", async () => {
    const data = await getPerformanceData()
    expect(data).toHaveLength(12)
  })

  it("every entry has month, portfolio, and benchmark fields", async () => {
    const data = await getPerformanceData()
    for (const d of data) {
      expect(d.month).toBeDefined()
      expect(typeof d.portfolio).toBe("number")
      expect(typeof d.benchmark).toBe("number")
    }
  })

  it("returns the same data each call (deterministic static data)", async () => {
    const a = await getPerformanceData()
    const b = await getPerformanceData()
    expect(a).toEqual(b)
  })
})

// ============================================================================
// 5. getRecentActivity
// ============================================================================

describe("getRecentActivity", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no ledger events exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("limit", []) as never)

    const activity = await getRecentActivity()
    expect(activity).toEqual([])
  })

  it("maps ledger row fields to ActivityItem shape", async () => {
    const row = makeLedgerRow()
    vi.mocked(db.select).mockReturnValue(makeChain("limit", [row]) as never)

    const activity = await getRecentActivity()
    const item = activity[0]

    expect(item.id).toBe("evt-001")
    expect(item.type).toBe("asset_created")
    expect(item.description).toBe("New asset added")
    expect(item.user).toBe("user-001")
    expect(item.timestamp).toBe("2024-01-20T10:00:00.000Z")
    expect(item.entityName).toBe("Manhattan Tower")
  })

  it("maps null actorUserId to system", async () => {
    const row = makeLedgerRow({ actorUserId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("limit", [row]) as never)

    const activity = await getRecentActivity()
    expect(activity[0].user).toBe("system")
  })

  it("falls back to action for description when payload.details is missing", async () => {
    const row = makeLedgerRow({ payload: {} })
    vi.mocked(db.select).mockReturnValue(makeChain("limit", [row]) as never)

    const activity = await getRecentActivity()
    expect(activity[0].description).toBe("asset_created")
  })

  it("falls back to targetType for entityName when payload.entityName is missing", async () => {
    const row = makeLedgerRow({ payload: {} })
    vi.mocked(db.select).mockReturnValue(makeChain("limit", [row]) as never)

    const activity = await getRecentActivity()
    expect(activity[0].entityName).toBe("asset")
  })

  it("applies limit to fetch at most 10 rows", async () => {
    const chain = makeChain("limit", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getRecentActivity()
    expect(chain.limit).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("limit", [])
    chain.limit.mockRejectedValue(new Error("Query timeout"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getRecentActivity()).rejects.toThrow("Query timeout")
  })
})
