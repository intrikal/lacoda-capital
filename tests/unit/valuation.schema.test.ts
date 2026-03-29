import { describe, it, expect } from "vitest"
import { createValuationSchema } from "@/lib/validations/valuation.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createValuationSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe("USD")
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
      currency: "EUR",
      source: "Bloomberg",
      notes: "Q1 valuation",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing assetId", () => {
    const result = createValuationSchema.safeParse({
      asOfDate: "2025-03-15",
      value: 150000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid assetId uuid", () => {
    const result = createValuationSchema.safeParse({
      assetId: "not-a-uuid",
      asOfDate: "2025-03-15",
      value: 150000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing asOfDate", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      value: 150000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty asOfDate", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "",
      value: 150000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing value", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative value", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: -100,
    })
    expect(result.success).toBe(false)
  })

  it("accepts zero value", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 0,
    })
    expect(result.success).toBe(true)
  })

  it("rejects currency exceeding 10 characters", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
      currency: "A".repeat(11),
    })
    expect(result.success).toBe(false)
  })

  it("accepts null source", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
      source: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects source exceeding 200 characters", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
      source: "A".repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it("accepts null notes", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects notes exceeding 1000 characters", () => {
    const result = createValuationSchema.safeParse({
      assetId: UUID,
      asOfDate: "2025-03-15",
      value: 150000,
      notes: "A".repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})
