/**
 * ============================================================================
 * TEST FILE: transfers.service.test.ts
 * ============================================================================
 *
 * Kevin, the transfers service now queries the transfers table in the
 * database, so we mock the db to control what rows are returned.
 * We verify filtering, lookup, and the computed summary stat cards.
 *
 * RELATED FILES:
 *   lib/services/transfers.service.ts  — service under test
 *   app/db/schema/transfers.ts         — table definition
 *   lib/types/mock.ts                  — ClientTransfer type
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock the database ──────────��───────────────────────────────��─────────
vi.mock("@/app/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  }
  return {
    db: {
      select: vi.fn(() => selectChain),
    },
  }
})

import { db } from "@/app/db"
import {
  getClientTransfers,
  getTransferById,
  getTransferSummary,
} from "@/lib/services/transfers.service"

// ============================================================================
// FIXTURES — sample transfer DB rows
// ============================================================================

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "txfr-uuid-001",
    orgId: "org-uuid-001",
    clientId: "client-uuid-001",
    type: "deposit",
    amount: 25_000,
    fromAccount: "Chase Bank ****4532",
    toAccount: "Brokerage Account",
    status: "processing",
    frequency: "One-time",
    reference: "DEP-2024-0120",
    completedAt: null,
    createdAt: new Date("2024-01-20T10:30:00Z"),
    updatedAt: new Date("2024-01-20T10:30:00Z"),
    deletedAt: null,
    ...overrides,
  }
}

/** Five transfer rows matching the old seed data's variety. */
const seedRows = [
  makeDbRow({
    id: "txfr-uuid-001",
    type: "deposit",
    amount: 25_000,
    fromAccount: "Chase Bank ****4532",
    toAccount: "Brokerage Account",
    status: "processing",
    frequency: "One-time",
    reference: "DEP-2024-0120",
    completedAt: null,
    createdAt: new Date("2024-01-20T10:30:00Z"),
  }),
  makeDbRow({
    id: "txfr-uuid-002",
    type: "transfer",
    amount: 10_000,
    fromAccount: "Brokerage Account",
    toAccount: "Roth IRA",
    status: "pending",
    frequency: "One-time",
    reference: "INT-2024-0122",
    completedAt: null,
    createdAt: new Date("2024-01-22T14:15:00Z"),
  }),
  makeDbRow({
    id: "txfr-uuid-003",
    type: "deposit",
    amount: 5_000,
    fromAccount: "Bank of America ****7891",
    toAccount: "Retirement IRA",
    status: "completed",
    frequency: "Monthly",
    reference: "DEP-2024-0101",
    completedAt: new Date("2024-01-03T16:45:00Z"),
    createdAt: new Date("2024-01-01T09:00:00Z"),
  }),
  makeDbRow({
    id: "txfr-uuid-004",
    type: "withdrawal",
    amount: 8_500,
    fromAccount: "Brokerage Account",
    toAccount: "Chase Bank ****4532",
    status: "completed",
    frequency: "One-time",
    reference: "WDR-2023-1228",
    completedAt: new Date("2023-12-30T14:20:00Z"),
    createdAt: new Date("2023-12-28T11:00:00Z"),
  }),
  makeDbRow({
    id: "txfr-uuid-005",
    type: "deposit",
    amount: 15_000,
    fromAccount: "Chase Bank ****4532",
    toAccount: "Brokerage Account",
    status: "completed",
    frequency: "One-time",
    reference: "DEP-2023-1215",
    completedAt: new Date("2023-12-17T11:00:00Z"),
    createdAt: new Date("2023-12-15T09:30:00Z"),
  }),
]

// ============================================================================
// HELPER — drill into the mocked select chain
// ============================================================================

function getSelectChain() {
  return (db.select as ReturnType<typeof vi.fn>)()
}

// ============================================================================
// 1. getClientTransfers — full list
// ============================================================================

describe("getClientTransfers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns all 5 transfers", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    expect(transfers).toHaveLength(5)
  })

  it("every transfer has the required shape fields", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    for (const t of transfers) {
      expect(t.id).toBeDefined()
      expect(t.type).toMatch(/^(deposit|withdrawal|transfer)$/)
      expect(typeof t.amount).toBe("number")
      expect(t.fromAccount).toBeDefined()
      expect(t.toAccount).toBeDefined()
      expect(t.status).toBeDefined()
      expect(t.createdAt).toBeDefined()
    }
  })

  it("returns a copy of the data each call", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const a = await getClientTransfers()
    getSelectChain().where.mockResolvedValue(seedRows)
    const b = await getClientTransfers()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it("contains deposits, withdrawals and internal transfers", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    const types = new Set(transfers.map((t) => t.type))
    expect(types.has("deposit")).toBe(true)
    expect(types.has("withdrawal")).toBe(true)
    expect(types.has("transfer")).toBe(true)
  })

  it("all amounts are positive numbers", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    for (const t of transfers) {
      expect(t.amount).toBeGreaterThan(0)
    }
  })

  it("returns empty array when no transfers exist", async () => {
    getSelectChain().where.mockResolvedValue([])
    const transfers = await getClientTransfers()
    expect(transfers).toEqual([])
  })
})

// ============================================================================
// 2. getTransferById — lookup
// ============================================================================

describe("getTransferById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the correct transfer for a known id", async () => {
    getSelectChain().where.mockResolvedValue([seedRows[0]])
    const t = await getTransferById("txfr-uuid-001")
    expect(t).toBeDefined()
    expect(t!.amount).toBe(25_000)
    expect(t!.type).toBe("deposit")
  })

  it("returns undefined for an unknown id", async () => {
    getSelectChain().where.mockResolvedValue([])
    const t = await getTransferById("does-not-exist")
    expect(t).toBeUndefined()
  })

  it("finds the withdrawal transfer", async () => {
    getSelectChain().where.mockResolvedValue([seedRows[3]])
    const t = await getTransferById("txfr-uuid-004")
    expect(t).toBeDefined()
    expect(t!.type).toBe("withdrawal")
  })

  it("finds the internal transfer", async () => {
    getSelectChain().where.mockResolvedValue([seedRows[1]])
    const t = await getTransferById("txfr-uuid-002")
    expect(t).toBeDefined()
    expect(t!.type).toBe("transfer")
  })

  it("all 5 seed transfers are findable by id", async () => {
    for (const row of seedRows) {
      getSelectChain().where.mockResolvedValue([row])
      const t = await getTransferById(row.id as string)
      expect(t).toBeDefined()
      expect(t!.id).toBe(row.id)
    }
  })
})

// ============================================================================
// 3. getTransferSummary — computed aggregations
// ============================================================================

describe("getTransferSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("pendingCount is the number of pending or processing transfers", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    const expected = transfers.filter(
      (t) => t.status === "pending" || t.status === "processing",
    ).length
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getTransferSummary()
    expect(summary.pendingCount).toBe(expected)
  })

  it("pendingTotal is the sum of pending/processing amounts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    const expected = transfers
      .filter((t) => t.status === "pending" || t.status === "processing")
      .reduce((sum, t) => sum + t.amount, 0)
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getTransferSummary()
    expect(summary.pendingTotal).toBe(expected)
  })

  it("all numeric summary fields are non-negative", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getTransferSummary()
    expect(summary.pendingCount).toBeGreaterThanOrEqual(0)
    expect(summary.pendingTotal).toBeGreaterThanOrEqual(0)
    expect(summary.completedThisMonthCount).toBeGreaterThanOrEqual(0)
    expect(summary.completedThisMonthTotal).toBeGreaterThanOrEqual(0)
  })

  it("pendingCount plus completed transfers equals total transfers", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    const pending = transfers.filter(
      (t) => t.status === "pending" || t.status === "processing",
    )
    const completed = transfers.filter((t) => t.status === "completed")
    expect(pending.length + completed.length).toBe(transfers.length)
  })

  it("completed this month count does not exceed total completed count", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const transfers = await getClientTransfers()
    const totalCompleted = transfers.filter((t) => t.status === "completed").length
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getTransferSummary()
    expect(summary.completedThisMonthCount).toBeLessThanOrEqual(totalCompleted)
  })

  it("returns all-zero summary when no transfers exist", async () => {
    getSelectChain().where.mockResolvedValue([])
    const summary = await getTransferSummary()
    expect(summary.pendingCount).toBe(0)
    expect(summary.pendingTotal).toBe(0)
    expect(summary.completedThisMonthCount).toBe(0)
    expect(summary.completedThisMonthTotal).toBe(0)
  })
})

// ============================================================================
// 4. Error handling — database failures
// ============================================================================

describe("transfers service ��� error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getClientTransfers propagates database errors", async () => {
    getSelectChain().where.mockRejectedValue(new Error("Connection refused"))
    await expect(getClientTransfers()).rejects.toThrow("Connection refused")
  })
})
