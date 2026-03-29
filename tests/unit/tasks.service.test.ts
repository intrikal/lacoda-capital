/**
 * ============================================================================
 * TEST FILE: tasks.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the tasks service which reads from the `tasks` DB table.
 * We mock `@/app/db` so no real database is needed.
 *
 * Query chain patterns in this service:
 *   getTasks            → db.select().from(tasks).orderBy(asc)       terminal: orderBy
 *   getTaskById         → db.select().from(tasks).where(eq)          terminal: where
 *   getTasksByAssignee  → db.select().from(tasks).where(eq)          terminal: where
 *   getPendingTasks     → db.select().from(tasks).where(eq)          terminal: where
 *   getHighPriorityTasks→ db.select().from(tasks).where(eq)          terminal: where
 *
 * RELATED FILES:
 *   lib/services/tasks.service.ts  — service under test
 *   app/db/schema/tasks.ts         — tasks table definition
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock the database ───────────────────────────────────────────────────────

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getTasks,
  getTaskById,
  getTasksByAssignee,
  getPendingTasks,
  getHighPriorityTasks,
} from "@/lib/services/tasks.service"

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a mock Drizzle select chain where the named `terminal` method
 * resolves (returns a Promise) while all other methods return `this`.
 */
function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-001",
    title: "Review Q1 Report",
    description: "Review the Q1 portfolio report before client meeting",
    dueDate: new Date("2024-03-15T00:00:00Z"),
    assignedTo: "user-advisor-001",
    priority: "high",
    status: "pending",
    clientId: "client-001",
    entityId: null,
    assetId: null,
    ...overrides,
  }
}

// ============================================================================
// 1. toTask — DB row to Task mapping (tested via getTasks)
// ============================================================================

describe("toTask — DB row to Task mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields correctly", async () => {
    const row = makeDbRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    const task = tasks[0]

    expect(task.id).toBe("task-001")
    expect(task.title).toBe("Review Q1 Report")
    expect(task.description).toBe("Review the Q1 portfolio report before client meeting")
    expect(task.assignedTo).toBe("user-advisor-001")
    expect(task.priority).toBe("high")
    expect(task.status).toBe("pending")
  })

  it("converts dueDate Date to ISO string", async () => {
    const row = makeDbRow({ dueDate: new Date("2024-03-15T00:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].dueDate).toBe("2024-03-15T00:00:00.000Z")
  })

  it("maps null dueDate to empty string", async () => {
    const row = makeDbRow({ dueDate: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].dueDate).toBe("")
  })

  it("maps null description to empty string", async () => {
    const row = makeDbRow({ description: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].description).toBe("")
  })

  it("maps null assignedTo to empty string", async () => {
    const row = makeDbRow({ assignedTo: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].assignedTo).toBe("")
  })

  it("prefers clientId for relatedEntity over entityId and assetId", async () => {
    const row = makeDbRow({ clientId: "client-001", entityId: "entity-001", assetId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].relatedEntity).toBe("client-001")
  })

  it("falls back to entityId when clientId is null", async () => {
    const row = makeDbRow({ clientId: null, entityId: "entity-001", assetId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].relatedEntity).toBe("entity-001")
  })

  it("falls back to assetId when clientId and entityId are null", async () => {
    const row = makeDbRow({ clientId: null, entityId: null, assetId: "asset-001" })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].relatedEntity).toBe("asset-001")
  })

  it("relatedEntity is undefined when all FK columns are null", async () => {
    const row = makeDbRow({ clientId: null, entityId: null, assetId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const tasks = await getTasks()
    expect(tasks[0].relatedEntity).toBeUndefined()
  })
})

// ============================================================================
// 2. getTasks
// ============================================================================

describe("getTasks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns an empty array when the table is empty", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const tasks = await getTasks()
    expect(tasks).toEqual([])
  })

  it("returns all rows from the DB", async () => {
    const rows = [
      makeDbRow({ id: "t1" }),
      makeDbRow({ id: "t2" }),
      makeDbRow({ id: "t3" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const tasks = await getTasks()
    expect(tasks).toHaveLength(3)
  })

  it("applies orderBy for due date sorting", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getTasks()
    expect(chain.orderBy).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("orderBy", [])
    chain.orderBy.mockRejectedValue(new Error("Connection refused"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getTasks()).rejects.toThrow("Connection refused")
  })
})

// ============================================================================
// 3. getTaskById
// ============================================================================

describe("getTaskById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns the mapped Task when a row is found", async () => {
    const row = makeDbRow({ id: "task-007" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const task = await getTaskById("task-007")
    expect(task).toBeDefined()
    expect(task!.id).toBe("task-007")
  })

  it("returns undefined when no row is found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const task = await getTaskById("non-existent")
    expect(task).toBeUndefined()
  })

  it("applies the where filter", async () => {
    const chain = makeChain("where", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getTaskById("task-001")
    expect(chain.where).toHaveBeenCalled()
  })
})

// ============================================================================
// 4. getTasksByAssignee
// ============================================================================

describe("getTasksByAssignee", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns tasks for the given assignee", async () => {
    const rows = [
      makeDbRow({ id: "t1", assignedTo: "advisor-alice" }),
      makeDbRow({ id: "t2", assignedTo: "advisor-alice" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const tasks = await getTasksByAssignee("advisor-alice")
    expect(tasks).toHaveLength(2)
    expect(tasks[0].assignedTo).toBe("advisor-alice")
  })

  it("returns empty array when assignee has no tasks", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const tasks = await getTasksByAssignee("nobody")
    expect(tasks).toEqual([])
  })
})

// ============================================================================
// 5. getPendingTasks
// ============================================================================

describe("getPendingTasks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns only rows with status pending", async () => {
    const rows = [makeDbRow({ status: "pending" }), makeDbRow({ id: "t2", status: "pending" })]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const tasks = await getPendingTasks()
    expect(tasks).toHaveLength(2)
    for (const t of tasks) {
      expect(t.status).toBe("pending")
    }
  })

  it("returns empty array when no pending tasks", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const tasks = await getPendingTasks()
    expect(tasks).toEqual([])
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("where", [])
    chain.where.mockRejectedValue(new Error("Query timeout"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getPendingTasks()).rejects.toThrow("Query timeout")
  })
})

// ============================================================================
// 6. getHighPriorityTasks
// ============================================================================

describe("getHighPriorityTasks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns only rows with priority high", async () => {
    const rows = [makeDbRow({ priority: "high" }), makeDbRow({ id: "t2", priority: "high" })]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const tasks = await getHighPriorityTasks()
    expect(tasks).toHaveLength(2)
    for (const t of tasks) {
      expect(t.priority).toBe("high")
    }
  })

  it("returns empty array when no high-priority tasks", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const tasks = await getHighPriorityTasks()
    expect(tasks).toEqual([])
  })

  it("applies the where filter", async () => {
    const chain = makeChain("where", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getHighPriorityTasks()
    expect(chain.where).toHaveBeenCalled()
  })
})
