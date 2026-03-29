/**
 * ============================================================================
 * TEST FILE: pipeline.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the pipeline service which reads from the `deals` DB table.
 * `getPipelineStages()` returns static config (no DB call).
 *
 * Query chain patterns:
 *   getDeals         → .from().where(isNull).orderBy(desc)   terminal: orderBy
 *   getDealById      → .from().where(eq)                     terminal: where
 *   getDealsByStage  → .from().where(eq)                     terminal: where
 *   getPipelineSummary → calls getDeals() internally         terminal: orderBy
 *
 * RELATED FILES:
 *   lib/services/pipeline.service.ts  — service under test
 *   app/db/schema/deals.ts            — deals table definition
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getPipelineStages,
  getDeals,
  getDealById,
  getDealsByStage,
  getPipelineSummary,
} from "@/lib/services/pipeline.service"

// ============================================================================
// HELPERS
// ============================================================================

function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal-001",
    name: "Manhattan Tower Acquisition",
    stage: "due_diligence",
    type: "real_estate",
    potentialValue: 12_000_000,
    probability: 65,
    assigneeName: "Alice Advisor",
    dueDate: "2024-04-30",
    lastActivity: "2024-01-18",
    notes: "Environmental study pending",
    deletedAt: null,
    updatedAt: new Date("2024-01-18T00:00:00Z"),
    ...overrides,
  }
}

// ============================================================================
// 1. getPipelineStages — static config (no DB)
// ============================================================================

describe("getPipelineStages", () => {
  it("returns all 6 pipeline stages", async () => {
    const stages = await getPipelineStages()
    expect(stages).toHaveLength(6)
  })

  it("every stage has the required shape fields", async () => {
    const stages = await getPipelineStages()
    for (const stage of stages) {
      expect(stage.id).toBeDefined()
      expect(stage.name).toBeDefined()
      expect(stage.color).toBeDefined()
      expect(stage.description).toBeDefined()
    }
  })

  it("contains the six expected stage IDs", async () => {
    const stages = await getPipelineStages()
    const ids = stages.map((s) => s.id)
    expect(ids).toContain("prospecting")
    expect(ids).toContain("due_diligence")
    expect(ids).toContain("negotiation")
    expect(ids).toContain("closed")
    expect(ids).toContain("active")
    expect(ids).toContain("exit_planning")
  })
})

// ============================================================================
// 2. toDeal — DB row to Deal mapping (tested via getDeals)
// ============================================================================

describe("toDeal — DB row to Deal mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields correctly", async () => {
    const row = makeDbRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const deals = await getDeals()
    const deal = deals[0]

    expect(deal.id).toBe("deal-001")
    expect(deal.name).toBe("Manhattan Tower Acquisition")
    expect(deal.stage).toBe("due_diligence")
    expect(deal.type).toBe("real_estate")
    expect(deal.potentialValue).toBe(12_000_000)
    expect(deal.probability).toBe(65)
    expect(deal.assignee).toBe("Alice Advisor")
    expect(deal.dueDate).toBe("2024-04-30")
  })

  it("maps null assigneeName to empty string", async () => {
    const row = makeDbRow({ assigneeName: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const deals = await getDeals()
    expect(deals[0].assignee).toBe("")
  })

  it("maps null lastActivity to empty string", async () => {
    const row = makeDbRow({ lastActivity: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const deals = await getDeals()
    expect(deals[0].lastActivity).toBe("")
  })

  it("maps null notes to empty string", async () => {
    const row = makeDbRow({ notes: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const deals = await getDeals()
    expect(deals[0].notes).toBe("")
  })
})

// ============================================================================
// 3. getDeals
// ============================================================================

describe("getDeals", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no deals exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const deals = await getDeals()
    expect(deals).toEqual([])
  })

  it("returns all rows from the DB", async () => {
    const rows = [makeDbRow({ id: "d1" }), makeDbRow({ id: "d2" })]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const deals = await getDeals()
    expect(deals).toHaveLength(2)
  })

  it("applies deletedAt IS NULL filter", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getDeals()
    expect(chain.where).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("orderBy", [])
    chain.orderBy.mockRejectedValue(new Error("DB error"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getDeals()).rejects.toThrow("DB error")
  })
})

// ============================================================================
// 4. getDealById
// ============================================================================

describe("getDealById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns mapped Deal when found", async () => {
    const row = makeDbRow({ id: "deal-007" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const deal = await getDealById("deal-007")
    expect(deal).toBeDefined()
    expect(deal!.id).toBe("deal-007")
  })

  it("returns undefined when not found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const deal = await getDealById("no-such-deal")
    expect(deal).toBeUndefined()
  })
})

// ============================================================================
// 5. getDealsByStage
// ============================================================================

describe("getDealsByStage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns deals in the given stage", async () => {
    const rows = [
      makeDbRow({ id: "d1", stage: "negotiation" }),
      makeDbRow({ id: "d2", stage: "negotiation" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const deals = await getDealsByStage("negotiation")
    expect(deals).toHaveLength(2)
  })

  it("returns empty array when stage has no deals", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const deals = await getDealsByStage("exit_planning")
    expect(deals).toEqual([])
  })
})

// ============================================================================
// 6. getPipelineSummary — aggregation
// ============================================================================

describe("getPipelineSummary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all-zero summary when pipeline is empty", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const summary = await getPipelineSummary()
    expect(summary.totalDeals).toBe(0)
    expect(summary.totalValue).toBe(0)
    expect(summary.weightedValue).toBe(0)
    expect(summary.activeValue).toBe(0)
    expect(summary.negotiationValue).toBe(0)
    expect(summary.negotiationCount).toBe(0)
    expect(summary.activeCount).toBe(0)
  })

  it("calculates totalValue as sum of potentialValue", async () => {
    const rows = [
      makeDbRow({ id: "d1", potentialValue: 5_000_000, probability: 50, stage: "prospecting" }),
      makeDbRow({ id: "d2", potentialValue: 3_000_000, probability: 70, stage: "prospecting" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getPipelineSummary()
    expect(summary.totalValue).toBe(8_000_000)
  })

  it("calculates weightedValue as sum of (value * probability / 100)", async () => {
    const rows = [
      makeDbRow({ id: "d1", potentialValue: 1_000_000, probability: 50, stage: "prospecting" }),
      makeDbRow({ id: "d2", potentialValue: 2_000_000, probability: 100, stage: "prospecting" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getPipelineSummary()
    // 1_000_000 * 0.50 + 2_000_000 * 1.00 = 500_000 + 2_000_000 = 2_500_000
    expect(summary.weightedValue).toBe(2_500_000)
  })

  it("counts and sums only active stage deals", async () => {
    const rows = [
      makeDbRow({ id: "d1", stage: "active", potentialValue: 4_000_000, probability: 100 }),
      makeDbRow({ id: "d2", stage: "active", potentialValue: 6_000_000, probability: 100 }),
      makeDbRow({ id: "d3", stage: "prospecting", potentialValue: 1_000_000, probability: 20 }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getPipelineSummary()
    expect(summary.activeCount).toBe(2)
    expect(summary.activeValue).toBe(10_000_000)
  })

  it("counts and sums only negotiation stage deals", async () => {
    const rows = [
      makeDbRow({ id: "d1", stage: "negotiation", potentialValue: 2_000_000, probability: 80 }),
      makeDbRow({ id: "d2", stage: "active", potentialValue: 5_000_000, probability: 100 }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getPipelineSummary()
    expect(summary.negotiationCount).toBe(1)
    expect(summary.negotiationValue).toBe(2_000_000)
  })
})
