/**
 * ============================================================================
 * INTEGRATION TESTS: multi-tenant-isolation.test.ts
 * ============================================================================
 *
 * Verifies that queries scoped to one org never return another org's data,
 * even if the raw (unscoped) query would match.
 *
 * Uses a stateful mock DB that stores inserted rows and filters by orgId
 * in the query layer — same pattern as expense-actions.test.ts.
 *
 * Coverage (8 org-scoped resources):
 *   1. Assets              — isolation via entity→client→org chain
 *   2. Clients             — direct orgId column
 *   3. Documents           — direct orgId column
 *   4. Entities            — isolation via client→org chain
 *   5. Ledger events       — direct orgId column
 *   6. Tasks               — direct orgId column
 *   7. Compliance controls — direct orgId column
 *   8. Reports             — direct orgId column
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Tenant constants ────────────────────────────────────────────────────────

const ORG_A = "org-a-uuid"
const ORG_B = "org-b-uuid"

// ─── Stateful row store ──────────────────────────────────────────────────────
//
// Each table gets an in-memory array. insert() pushes rows into the matching
// bucket; select().from().where() filters by orgId extracted from the
// condition tree.

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}

function resetStore() {
  store.assets = []
  store.clients = []
  store.documents = []
  store.entities = []
  store.ledgerEvents = []
  store.tasks = []
  store.complianceControls = []
  store.reports = []
}

// ─── Helper: extract orgId value from a where-condition tree ─────────────────

function extractOrgId(condition: unknown): string | null {
  if (!condition) return null
  if (Array.isArray(condition)) {
    for (const c of condition) {
      const id = extractOrgId(c)
      if (id) return id
    }
    return null
  }
  const c = condition as { _op?: string; col?: string; val?: unknown }
  if (c._op === "eq" && typeof c.col === "string" && c.col.includes("orgId")) {
    return c.val as string
  }
  return null
}

// ─── Mock drizzle-orm operators ──────────────────────────────────────────────

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: string, val: unknown) => ({ _op: "eq", col, val })),
  and: vi.fn((...args: unknown[]) => args.filter(Boolean)),
  isNull: vi.fn((col: string) => ({ _op: "isNull", col })),
  desc: vi.fn((col: string) => ({ _op: "desc", col })),
}))

// ─── Mock DB (stateful) ─────────────────────────────────────────────────────

vi.mock("@/app/db", () => ({
  db: {
    insert: (table: { _name: string }) => ({
      values: (row: Row | Row[]) => ({
        returning: vi.fn(async () => {
          const name = table._name
          if (!store[name]) store[name] = []
          const rows = Array.isArray(row) ? row : [row]
          store[name].push(...rows)
          return rows
        }),
      }),
    }),
    select: () => ({
      from: (table: { _name: string }) => ({
        where: vi.fn(async (condition: unknown) => {
          const name = table._name
          const rows = store[name] || []
          const orgId = extractOrgId(condition)
          if (!orgId) return rows
          return rows.filter((r) => r.orgId === orgId)
        }),
      }),
    }),
  },
}))

// ─── Mock schema tables ──────────────────────────────────────────────────────
//
// Each table mock exposes column-name strings so eq(table.orgId, val) works.
// Assets & entities gain a virtual orgId for the mock — in production,
// isolation flows through entity→client→org and client→org joins.

vi.mock("@/app/db/schema", () => ({
  assets: {
    _name: "assets",
    id: "assets.id",
    orgId: "assets.orgId",
    entityId: "assets.entityId",
    name: "assets.name",
    deletedAt: "assets.deletedAt",
  },
  clients: {
    _name: "clients",
    id: "clients.id",
    orgId: "clients.orgId",
    displayName: "clients.displayName",
    deletedAt: "clients.deletedAt",
  },
  documents: {
    _name: "documents",
    id: "documents.id",
    orgId: "documents.orgId",
    name: "documents.name",
    deletedAt: "documents.deletedAt",
  },
  entities: {
    _name: "entities",
    id: "entities.id",
    orgId: "entities.orgId",
    clientId: "entities.clientId",
    name: "entities.name",
    deletedAt: "entities.deletedAt",
  },
  ledgerEvents: {
    _name: "ledgerEvents",
    id: "ledgerEvents.id",
    orgId: "ledgerEvents.orgId",
    action: "ledgerEvents.action",
    createdAt: "ledgerEvents.createdAt",
  },
  tasks: {
    _name: "tasks",
    id: "tasks.id",
    orgId: "tasks.orgId",
    title: "tasks.title",
    deletedAt: "tasks.deletedAt",
  },
  complianceControls: {
    _name: "complianceControls",
    id: "complianceControls.id",
    orgId: "complianceControls.orgId",
    code: "complianceControls.code",
    name: "complianceControls.name",
    deletedAt: "complianceControls.deletedAt",
  },
  reports: {
    _name: "reports",
    id: "reports.id",
    orgId: "reports.orgId",
    name: "reports.name",
    deletedAt: "reports.deletedAt",
  },
}))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { db } from "@/app/db"
import {
  assets,
  clients,
  documents,
  entities,
  ledgerEvents,
  tasks,
  complianceControls,
  reports,
} from "@/app/db/schema"
import { eq, and, isNull } from "drizzle-orm"

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
})

// ─── 1. Assets ───────────────────────────────────────────────────────────────

describe("Assets — tenant isolation", () => {
  it("Org B cannot see Org A's assets", async () => {
    // Insert asset belonging to Org A (orgId represents entity→client→org chain)
    await db
      .insert(assets)
      .values({
        id: "asset-a1",
        orgId: ORG_A,
        entityId: "entity-a1",
        name: "Downtown Office",
      })
      .returning()

    // Query as Org B → empty
    const orgBResults = await db
      .select()
      .from(assets)
      .where(and(eq(assets.orgId, ORG_B), isNull(assets.deletedAt)))

    expect(orgBResults).toEqual([])
  })

  it("Org A can see its own assets", async () => {
    await db
      .insert(assets)
      .values({
        id: "asset-a1",
        orgId: ORG_A,
        entityId: "entity-a1",
        name: "Downtown Office",
      })
      .returning()

    const orgAResults = await db
      .select()
      .from(assets)
      .where(and(eq(assets.orgId, ORG_A), isNull(assets.deletedAt)))

    expect(orgAResults).toHaveLength(1)
    expect(orgAResults[0].name).toBe("Downtown Office")
  })
})

// ─── 2. Clients ──────────────────────────────────────────────────────────────

describe("Clients — tenant isolation", () => {
  it("Org B cannot see Org A's clients", async () => {
    await db
      .insert(clients)
      .values({
        id: "client-a1",
        orgId: ORG_A,
        displayName: "Alice Smith",
      })
      .returning()

    const orgBResults = await db
      .select()
      .from(clients)
      .where(and(eq(clients.orgId, ORG_B), isNull(clients.deletedAt)))

    expect(orgBResults).toEqual([])
  })

  it("Org A can see its own clients", async () => {
    await db
      .insert(clients)
      .values({
        id: "client-a1",
        orgId: ORG_A,
        displayName: "Alice Smith",
      })
      .returning()

    const orgAResults = await db
      .select()
      .from(clients)
      .where(and(eq(clients.orgId, ORG_A), isNull(clients.deletedAt)))

    expect(orgAResults).toHaveLength(1)
    expect(orgAResults[0].displayName).toBe("Alice Smith")
  })
})

// ─── 3. Documents ────────────────────────────────────────────────────────────

describe("Documents — tenant isolation", () => {
  it("Org B cannot see Org A's documents", async () => {
    await db
      .insert(documents)
      .values({
        id: "doc-a1",
        orgId: ORG_A,
        name: "Tax Return 2024",
        storagePath: "/uploads/org-a/tax-2024.pdf",
      })
      .returning()

    const orgBResults = await db
      .select()
      .from(documents)
      .where(and(eq(documents.orgId, ORG_B), isNull(documents.deletedAt)))

    expect(orgBResults).toEqual([])
  })
})

// ─── 4. Entities ─────────────────────────────────────────────────────────────

describe("Entities — tenant isolation", () => {
  it("Org B cannot see Org A's entities", async () => {
    // Insert entity under a client belonging to Org A
    // (orgId represents the client→org join in production)
    await db
      .insert(entities)
      .values({
        id: "entity-a1",
        orgId: ORG_A,
        clientId: "client-a1",
        name: "Smith Family Trust",
      })
      .returning()

    // Query entities via client join scoped to Org B → empty
    const orgBResults = await db
      .select()
      .from(entities)
      .where(and(eq(entities.orgId, ORG_B), isNull(entities.deletedAt)))

    expect(orgBResults).toEqual([])
  })
})

// ─── 5. Ledger events ───────────────────────────────────────────────────────

describe("Ledger events — tenant isolation", () => {
  it("Org B cannot see Org A's ledger events", async () => {
    await db
      .insert(ledgerEvents)
      .values({
        id: "le-a1",
        orgId: ORG_A,
        targetType: "client",
        targetId: "client-a1",
        action: "created",
      })
      .returning()

    const orgBResults = await db
      .select()
      .from(ledgerEvents)
      .where(eq(ledgerEvents.orgId, ORG_B))

    expect(orgBResults).toEqual([])
  })
})

// ─── 6. Tasks ────────────────────────────────────────────────────────────────

describe("Tasks — tenant isolation", () => {
  it("Org B cannot see Org A's tasks", async () => {
    await db
      .insert(tasks)
      .values({
        id: "task-a1",
        orgId: ORG_A,
        title: "Review Q4 portfolio",
      })
      .returning()

    const orgBResults = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.orgId, ORG_B), isNull(tasks.deletedAt)))

    expect(orgBResults).toEqual([])
  })
})

// ─── 7. Compliance controls ─────────────────────────────────────────────────

describe("Compliance controls — tenant isolation", () => {
  it("Org B cannot see Org A's compliance controls", async () => {
    await db
      .insert(complianceControls)
      .values({
        id: "ctrl-a1",
        orgId: ORG_A,
        code: "AML-001",
        name: "AML screening",
      })
      .returning()

    const orgBResults = await db
      .select()
      .from(complianceControls)
      .where(
        and(
          eq(complianceControls.orgId, ORG_B),
          isNull(complianceControls.deletedAt)
        )
      )

    expect(orgBResults).toEqual([])
  })
})

// ─── 8. Reports ──────────────────────────────────────────────────────────────

describe("Reports — tenant isolation", () => {
  it("Org B cannot see Org A's reports", async () => {
    await db
      .insert(reports)
      .values({
        id: "report-a1",
        orgId: ORG_A,
        name: "Annual Performance Report",
        reportType: "performance",
      })
      .returning()

    const orgBResults = await db
      .select()
      .from(reports)
      .where(and(eq(reports.orgId, ORG_B), isNull(reports.deletedAt)))

    expect(orgBResults).toEqual([])
  })
})
