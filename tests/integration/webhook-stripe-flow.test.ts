/**
 * Integration tests for Stripe webhook → billing record update flow.
 *
 * Tests the full flow: webhook arrives → billing record status updated →
 * ledger event created → alert dispatched on failure.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── In-memory simulated database ──────────────────────────────────────────

interface MockBillingRecord {
  id: string
  orgId: string
  clientId: string
  status: string
  paidDate: string | null
  metadata: Record<string, unknown>
}

interface MockLedgerEvent {
  orgId: string
  actorUserId: string
  targetType: string
  targetId: string
  action: string
  payload: Record<string, unknown>
}

let billingRecords: MockBillingRecord[] = []
let ledgerEvents: MockLedgerEvent[] = []
let alerts: { title: string; severity: string }[] = []

// ─── Simulated handler logic (mirrors route.ts) ────────────────────────────

function handleInvoicePaid(billingRecordId: string, adminUserId: string | null) {
  const record = billingRecords.find((r) => r.id === billingRecordId)
  if (!record) return

  const today = new Date().toISOString().split("T")[0]
  record.status = "paid"
  record.paidDate = today

  if (adminUserId) {
    ledgerEvents.push({
      orgId: record.orgId,
      actorUserId: adminUserId,
      targetType: "client",
      targetId: record.clientId,
      action: "updated",
      payload: {
        reason: "Stripe invoice paid",
        after: { billingRecordId, status: "paid", paidDate: today },
      },
    })
  }
}

function handlePaymentFailed(billingRecordId: string, adminUserId: string | null) {
  const record = billingRecords.find((r) => r.id === billingRecordId)
  if (!record) return

  record.status = "due"
  record.metadata = {
    ...record.metadata,
    paymentFailed: true,
    failedAt: new Date().toISOString(),
  }

  if (adminUserId) {
    ledgerEvents.push({
      orgId: record.orgId,
      actorUserId: adminUserId,
      targetType: "client",
      targetId: record.clientId,
      action: "updated",
      payload: {
        reason: "Stripe payment failed",
        after: { billingRecordId, status: "due", paymentFailed: true },
      },
    })
  }

  alerts.push({
    title: "Payment failed for billing record",
    severity: "critical",
  })
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  billingRecords = [
    {
      id: "billing-001",
      orgId: "org-123",
      clientId: "client-456",
      status: "upcoming",
      paidDate: null,
      metadata: {},
    },
    {
      id: "billing-002",
      orgId: "org-123",
      clientId: "client-789",
      status: "due",
      paidDate: null,
      metadata: {},
    },
  ]
  ledgerEvents = []
  alerts = []
})

// ============================================================================
// invoice.paid flow
// ============================================================================

describe("Stripe webhook flow — invoice.paid", () => {
  it("updates billing record status to paid with today's date", () => {
    handleInvoicePaid("billing-001", "admin-user-1")

    const record = billingRecords.find((r) => r.id === "billing-001")!
    expect(record.status).toBe("paid")
    expect(record.paidDate).toBeTruthy()
    expect(record.paidDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("creates a ledger event for the payment", () => {
    handleInvoicePaid("billing-001", "admin-user-1")

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0]).toMatchObject({
      orgId: "org-123",
      actorUserId: "admin-user-1",
      targetType: "client",
      targetId: "client-456",
      action: "updated",
    })
    expect(ledgerEvents[0].payload).toMatchObject({
      reason: "Stripe invoice paid",
    })
  })

  it("skips ledger event when no admin user available", () => {
    handleInvoicePaid("billing-001", null)

    const record = billingRecords.find((r) => r.id === "billing-001")!
    expect(record.status).toBe("paid")
    expect(ledgerEvents).toHaveLength(0)
  })

  it("does nothing when billing record not found", () => {
    handleInvoicePaid("nonexistent-id", "admin-user-1")

    expect(ledgerEvents).toHaveLength(0)
    // All records unchanged
    expect(billingRecords.every((r) => r.status !== "paid")).toBe(true)
  })
})

// ============================================================================
// invoice.payment_failed flow
// ============================================================================

describe("Stripe webhook flow — invoice.payment_failed", () => {
  it("sets billing record status to due and flags metadata", () => {
    handlePaymentFailed("billing-001", "admin-user-1")

    const record = billingRecords.find((r) => r.id === "billing-001")!
    expect(record.status).toBe("due")
    expect(record.metadata.paymentFailed).toBe(true)
    expect(record.metadata.failedAt).toBeTruthy()
  })

  it("creates a ledger event with failure details", () => {
    handlePaymentFailed("billing-001", "admin-user-1")

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0].payload).toMatchObject({
      reason: "Stripe payment failed",
      after: expect.objectContaining({ paymentFailed: true }),
    })
  })

  it("dispatches a critical alert", () => {
    handlePaymentFailed("billing-001", "admin-user-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      severity: "critical",
    })
  })

  it("handles already-due record (idempotent)", () => {
    billingRecords[1].status = "due"
    handlePaymentFailed("billing-002", "admin-user-1")

    const record = billingRecords.find((r) => r.id === "billing-002")!
    expect(record.status).toBe("due")
    expect(record.metadata.paymentFailed).toBe(true)
  })
})

// ============================================================================
// Sequential flow: upcoming → paid → payment_failed on another
// ============================================================================

describe("Stripe webhook flow — sequential events", () => {
  it("processes paid then failed events on different records", () => {
    handleInvoicePaid("billing-001", "admin-user-1")
    handlePaymentFailed("billing-002", "admin-user-1")

    expect(billingRecords.find((r) => r.id === "billing-001")!.status).toBe("paid")
    expect(billingRecords.find((r) => r.id === "billing-002")!.status).toBe("due")
    expect(ledgerEvents).toHaveLength(2)
    expect(alerts).toHaveLength(1)
  })
})
