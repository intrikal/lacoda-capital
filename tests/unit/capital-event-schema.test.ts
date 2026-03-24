import { describe, it, expect } from "vitest"
import { createCapitalEventSchema, updateCapitalEventStatusSchema } from "@/lib/validations/capital-event.schema"

/**
 * Unit tests for capital event validation schemas.
 */

describe("createCapitalEventSchema", () => {
  it("validates a valid capital call", () => {
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

  it("validates a valid distribution", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "distribution",
      amount: 500_000,
      eventDate: "2024-06-15",
      status: "received",
    })

    expect(result.success).toBe(true)
  })

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

  it("rejects invalid event type", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "invalid_type",
      amount: 100_000,
      eventDate: "2024-06-15",
    })

    expect(result.success).toBe(false)
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

  it("accepts recallable event type", () => {
    const result = createCapitalEventSchema.safeParse({
      assetId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "recallable",
      amount: 100_000,
      eventDate: "2024-06-15",
    })

    expect(result.success).toBe(true)
  })
})

describe("updateCapitalEventStatusSchema", () => {
  it("validates a valid status update", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "paid",
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid status", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "cancelled",
    })

    expect(result.success).toBe(false)
  })

  it("accepts overdue status", () => {
    const result = updateCapitalEventStatusSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "overdue",
    })

    expect(result.success).toBe(true)
  })
})
