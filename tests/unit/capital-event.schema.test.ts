import { describe, it, expect } from "vitest"
import {
  createCapitalEventSchema,
  updateCapitalEventStatusSchema,
} from "@/lib/validations/capital-event.schema"

describe("createCapitalEventSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 2_000_000,
      currency: "USD",
      eventDate: "2024-06-15",
      dueDate: "2024-07-15",
      status: "pending",
      notes: "Q2 2024 capital call",
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (only required fields)", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "distribution",
      amount: 500_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid event types", () => {
    const eventTypes = ["capital_call", "distribution", "recallable"]
    for (const eventType of eventTypes) {
      const result = createCapitalEventSchema.safeParse({
        assetId: "550e8400-e29b-41d4-a716-446655440000",
        eventType,
        amount: 100_000,
        eventDate: "2024-06-15",
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts all valid statuses", () => {
    const statuses = ["pending", "paid", "received"]
    for (const status of statuses) {
      const result = createCapitalEventSchema.safeParse({
        assetId: "550e8400-e29b-41d4-a716-446655440000",
        eventType: "capital_call",
        amount: 100_000,
        eventDate: "2024-06-15",
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing assetId", () => {
    const result = createCapitalEventSchema.safeParse({
      eventType: "capital_call",
      amount: 100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing eventType", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing amount", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing eventDate", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 100_000,
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects non-UUID assetId", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "not-a-uuid",
      eventType: "capital_call",
      amount: 100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid eventType", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "dividend",
      amount: 100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects string amount", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: "100000",
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects zero amount", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 0,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative amount", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: -100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects currency shorter than 3 characters", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 100_000,
      eventDate: "2024-06-15",
      currency: "US",
    })
    expect(result.success).toBe(false)
  })

  it("rejects currency longer than 3 characters", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 100_000,
      eventDate: "2024-06-15",
      currency: "USDD",
    })
    expect(result.success).toBe(false)
  })

  it("defaults currency to USD", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe("USD")
    }
  })

  it("defaults status to pending", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 100_000,
      eventDate: "2024-06-15",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("pending")
    }
  })

  it("allows null dueDate", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "distribution",
      amount: 100_000,
      eventDate: "2024-06-15",
      dueDate: null,
    })
    expect(result.success).toBe(true)
  })

  it("allows null notes", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "distribution",
      amount: 100_000,
      eventDate: "2024-06-15",
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a Date object for eventDate", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "capital_call",
      amount: 100_000,
      eventDate: new Date("2024-06-15"),
    })
    expect(result.success).toBe(true)
  })
})

describe("updateCapitalEventStatusSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid status update", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "paid",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid statuses including overdue", () => {
    const statuses = ["pending", "paid", "received", "overdue"]
    for (const status of statuses) {
      const result = updateCapitalEventStatusSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing id", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      status: "paid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing status", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects non-UUID id", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "not-a-uuid",
      status: "paid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "cancelled",
    })
    expect(result.success).toBe(false)
  })
})
