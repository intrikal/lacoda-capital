/**
 * ============================================================================
 * TEST FILE: transfers.service.test.ts
 * ============================================================================
 *
 * Kevin, the transfers service uses a static seed array (no database calls),
 * so no vi.mock() is needed. We verify filtering, lookup, and the computed
 * summary stat cards.
 *
 * RELATED FILES:
 *   lib/services/transfers.service.ts  — service under test
 *   lib/types/mock.ts                  — ClientTransfer type
 */

import { describe, it, expect } from "vitest"
import {
  getClientTransfers,
  getTransferById,
  getTransferSummary,
} from "@/lib/services/transfers.service"

// ============================================================================
// 1. getClientTransfers — full seed
// ============================================================================

describe("getClientTransfers", () => {
  it("returns all 5 seed transfers", async () => {
    const transfers = await getClientTransfers()
    expect(transfers).toHaveLength(5)
  })

  it("every transfer has the required shape fields", async () => {
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

  it("returns a copy of the seed array each call", async () => {
    const a = await getClientTransfers()
    const b = await getClientTransfers()
    expect(a).not.toBe(b)   // spread produces new array
    expect(a).toEqual(b)
  })

  it("contains deposits, withdrawals and internal transfers", async () => {
    const transfers = await getClientTransfers()
    const types = new Set(transfers.map((t) => t.type))
    expect(types.has("deposit")).toBe(true)
    expect(types.has("withdrawal")).toBe(true)
    expect(types.has("transfer")).toBe(true)
  })

  it("all amounts are positive numbers", async () => {
    const transfers = await getClientTransfers()
    for (const t of transfers) {
      expect(t.amount).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// 2. getTransferById — lookup
// ============================================================================

describe("getTransferById", () => {
  it("returns the correct transfer for a known id", async () => {
    const t = await getTransferById("txfr-001")
    expect(t).toBeDefined()
    expect(t!.amount).toBe(25_000)
    expect(t!.type).toBe("deposit")
  })

  it("returns undefined for an unknown id", async () => {
    const t = await getTransferById("does-not-exist")
    expect(t).toBeUndefined()
  })

  it("finds the withdrawal transfer", async () => {
    const t = await getTransferById("txfr-004")
    expect(t).toBeDefined()
    expect(t!.type).toBe("withdrawal")
  })

  it("finds the internal transfer", async () => {
    const t = await getTransferById("txfr-002")
    expect(t).toBeDefined()
    expect(t!.type).toBe("transfer")
  })

  it("all 5 seed transfers are findable by id", async () => {
    const ids = ["txfr-001", "txfr-002", "txfr-003", "txfr-004", "txfr-005"]
    for (const id of ids) {
      const t = await getTransferById(id)
      expect(t).toBeDefined()
      expect(t!.id).toBe(id)
    }
  })
})

// ============================================================================
// 3. getTransferSummary — computed aggregations
// ============================================================================

describe("getTransferSummary", () => {
  it("pendingCount is the number of pending or processing transfers", async () => {
    const transfers = await getClientTransfers()
    const expected = transfers.filter(
      (t) => t.status === "pending" || t.status === "processing",
    ).length
    const summary = await getTransferSummary()
    expect(summary.pendingCount).toBe(expected)
  })

  it("pendingTotal is the sum of pending/processing amounts", async () => {
    const transfers = await getClientTransfers()
    const expected = transfers
      .filter((t) => t.status === "pending" || t.status === "processing")
      .reduce((sum, t) => sum + t.amount, 0)
    const summary = await getTransferSummary()
    expect(summary.pendingTotal).toBe(expected)
  })

  it("all numeric summary fields are non-negative", async () => {
    const summary = await getTransferSummary()
    expect(summary.pendingCount).toBeGreaterThanOrEqual(0)
    expect(summary.pendingTotal).toBeGreaterThanOrEqual(0)
    expect(summary.completedThisMonthCount).toBeGreaterThanOrEqual(0)
    expect(summary.completedThisMonthTotal).toBeGreaterThanOrEqual(0)
  })

  it("pendingCount plus completed transfers equals total transfers", async () => {
    const transfers = await getClientTransfers()
    const pending = transfers.filter(
      (t) => t.status === "pending" || t.status === "processing",
    )
    const completed = transfers.filter((t) => t.status === "completed")
    expect(pending.length + completed.length).toBe(transfers.length)
  })

  it("completed this month count does not exceed total completed count", async () => {
    const transfers = await getClientTransfers()
    const totalCompleted = transfers.filter((t) => t.status === "completed").length
    const summary = await getTransferSummary()
    expect(summary.completedThisMonthCount).toBeLessThanOrEqual(totalCompleted)
  })
})
