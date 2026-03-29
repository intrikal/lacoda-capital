/**
 * ============================================================================
 * TEST FILE: goals.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the goals service which reads from the `goals` DB table.
 *
 * Query chain patterns:
 *   getGoals           → .from().where(isNull).orderBy(desc)   terminal: orderBy
 *   getGoalById        → .from().where(eq)                     terminal: where
 *   getGoalsByCategory → .from().where(eq)                     terminal: where
 *   getGoalsSummary    → calls getGoals() internally           terminal: orderBy
 *
 * RELATED FILES:
 *   lib/services/goals.service.ts  — service under test
 *   app/db/schema/goals.ts         — goals table definition
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getGoals,
  getGoalById,
  getGoalsByCategory,
  getGoalsSummary,
} from "@/lib/services/goals.service"

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
    id: "goal-001",
    name: "Retirement Fund",
    category: "retirement",
    targetAmount: 2_000_000,
    currentAmount: 1_200_000,
    targetDate: "2035-01-01",
    monthlyContribution: 5_000,
    priority: "high",
    status: "on_track",
    notes: "Primary retirement goal",
    deletedAt: null,
    ...overrides,
  }
}

// ============================================================================
// 1. toFinancialGoal — DB row to FinancialGoal mapping
// ============================================================================

describe("toFinancialGoal — DB row to FinancialGoal mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields correctly", async () => {
    const row = makeDbRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const goals = await getGoals()
    const goal = goals[0]

    expect(goal.id).toBe("goal-001")
    expect(goal.name).toBe("Retirement Fund")
    expect(goal.category).toBe("retirement")
    expect(goal.targetAmount).toBe(2_000_000)
    expect(goal.currentAmount).toBe(1_200_000)
    expect(goal.targetDate).toBe("2035-01-01")
    expect(goal.monthlyContribution).toBe(5_000)
    expect(goal.priority).toBe("high")
    expect(goal.status).toBe("on_track")
  })

  it("maps null notes to undefined", async () => {
    const row = makeDbRow({ notes: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const goals = await getGoals()
    expect(goals[0].notes).toBeUndefined()
  })

  it("milestones is always undefined (not stored in DB yet)", async () => {
    const row = makeDbRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const goals = await getGoals()
    expect(goals[0].milestones).toBeUndefined()
  })
})

// ============================================================================
// 2. getGoals
// ============================================================================

describe("getGoals", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no goals exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const goals = await getGoals()
    expect(goals).toEqual([])
  })

  it("returns all rows from the DB", async () => {
    const rows = [makeDbRow({ id: "g1" }), makeDbRow({ id: "g2" })]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const goals = await getGoals()
    expect(goals).toHaveLength(2)
  })

  it("applies deletedAt IS NULL filter (where was called)", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getGoals()
    expect(chain.where).toHaveBeenCalled()
  })

  it("applies orderBy for targetDate sorting", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getGoals()
    expect(chain.orderBy).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("orderBy", [])
    chain.orderBy.mockRejectedValue(new Error("Connection refused"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getGoals()).rejects.toThrow("Connection refused")
  })
})

// ============================================================================
// 3. getGoalById
// ============================================================================

describe("getGoalById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns mapped FinancialGoal when found", async () => {
    const row = makeDbRow({ id: "goal-007" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const goal = await getGoalById("goal-007")
    expect(goal).toBeDefined()
    expect(goal!.id).toBe("goal-007")
  })

  it("returns undefined when not found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const goal = await getGoalById("does-not-exist")
    expect(goal).toBeUndefined()
  })
})

// ============================================================================
// 4. getGoalsByCategory
// ============================================================================

describe("getGoalsByCategory", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns goals for the given category", async () => {
    const rows = [
      makeDbRow({ id: "g1", category: "education" }),
      makeDbRow({ id: "g2", category: "education" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const goals = await getGoalsByCategory("education")
    expect(goals).toHaveLength(2)
  })

  it("returns empty array when category has no goals", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const goals = await getGoalsByCategory("philanthropy")
    expect(goals).toEqual([])
  })
})

// ============================================================================
// 5. getGoalsSummary — aggregation
// ============================================================================

describe("getGoalsSummary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all-zero summary when no goals exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const summary = await getGoalsSummary()
    expect(summary.total).toBe(0)
    expect(summary.totalTargetAmount).toBe(0)
    expect(summary.totalCurrentAmount).toBe(0)
    expect(summary.overallProgress).toBe(0)
    expect(summary.onTrack).toBe(0)
    expect(summary.behind).toBe(0)
    expect(summary.totalMonthlyContribution).toBe(0)
  })

  it("overallProgress is 0 when totalTargetAmount is 0 (avoids div-by-zero)", async () => {
    const rows = [makeDbRow({ targetAmount: 0, currentAmount: 0 })]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.overallProgress).toBe(0)
  })

  it("calculates totalTargetAmount correctly", async () => {
    const rows = [
      makeDbRow({ id: "g1", targetAmount: 1_000_000, currentAmount: 0, monthlyContribution: 1_000 }),
      makeDbRow({ id: "g2", targetAmount: 500_000, currentAmount: 0, monthlyContribution: 500 }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.totalTargetAmount).toBe(1_500_000)
  })

  it("calculates totalCurrentAmount correctly", async () => {
    const rows = [
      makeDbRow({ id: "g1", targetAmount: 1_000_000, currentAmount: 600_000, monthlyContribution: 1_000 }),
      makeDbRow({ id: "g2", targetAmount: 500_000, currentAmount: 200_000, monthlyContribution: 500 }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.totalCurrentAmount).toBe(800_000)
  })

  it("calculates overallProgress as a rounded percentage", async () => {
    const rows = [
      makeDbRow({ id: "g1", targetAmount: 1_000_000, currentAmount: 500_000, monthlyContribution: 1_000 }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.overallProgress).toBe(50)
  })

  it("counts onTrack goals (status on_track or ahead)", async () => {
    const rows = [
      makeDbRow({ id: "g1", status: "on_track" }),
      makeDbRow({ id: "g2", status: "ahead" }),
      makeDbRow({ id: "g3", status: "behind" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.onTrack).toBe(2)
  })

  it("counts behind goals", async () => {
    const rows = [
      makeDbRow({ id: "g1", status: "behind" }),
      makeDbRow({ id: "g2", status: "behind" }),
      makeDbRow({ id: "g3", status: "on_track" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.behind).toBe(2)
  })

  it("sums totalMonthlyContribution correctly", async () => {
    const rows = [
      makeDbRow({ id: "g1", monthlyContribution: 3_000 }),
      makeDbRow({ id: "g2", monthlyContribution: 2_000 }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.totalMonthlyContribution).toBe(5_000)
  })

  it("total matches the number of rows", async () => {
    const rows = [makeDbRow({ id: "g1" }), makeDbRow({ id: "g2" }), makeDbRow({ id: "g3" })]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const summary = await getGoalsSummary()
    expect(summary.total).toBe(3)
  })
})
