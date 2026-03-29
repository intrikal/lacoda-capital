import { describe, it, expect } from "vitest"
import { createBillingRecordSchema, updateBillingRecordSchema } from "@/lib/validations/billing-record.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createBillingRecordSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("upcoming")
      expect(result.data.aum).toBe(0)
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      aum: 1000000,
      status: "paid",
      dueDate: "2025-03-31",
      paidDate: "2025-03-15",
      effectiveRate: 0.01,
      description: "Advisory fee",
      notes: "Quarterly billing",
      metadata: { invoiceId: "INV-001" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing clientId", () => {
    const result = createBillingRecordSchema.safeParse({
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing period", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty period", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing amount", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative amount", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: -100,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing dueDate", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid dueDate format", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "03/31/2025",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing effectiveRate", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative effectiveRate", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: -0.01,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
      status: "overdue",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid statuses", () => {
    for (const status of ["paid", "upcoming", "due"]) {
      const result = createBillingRecordSchema.safeParse({
        clientId: UUID,
        period: "Q1 2025",
        amount: 5000,
        dueDate: "2025-03-31",
        effectiveRate: 0.01,
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts null paidDate", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
      paidDate: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid paidDate format", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: UUID,
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
      paidDate: "March 15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid clientId uuid", () => {
    const result = createBillingRecordSchema.safeParse({
      clientId: "not-a-uuid",
      period: "Q1 2025",
      amount: 5000,
      dueDate: "2025-03-31",
      effectiveRate: 0.01,
    })
    expect(result.success).toBe(false)
  })
})

describe("updateBillingRecordSchema", () => {
  it("accepts an empty object", () => {
    const result = updateBillingRecordSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with amount only", () => {
    const result = updateBillingRecordSchema.safeParse({ amount: 7500 })
    expect(result.success).toBe(true)
  })

  it("rejects negative amount", () => {
    const result = updateBillingRecordSchema.safeParse({ amount: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid dueDate format", () => {
    const result = updateBillingRecordSchema.safeParse({ dueDate: "bad-date" })
    expect(result.success).toBe(false)
  })
})
