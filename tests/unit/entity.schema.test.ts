import { describe, it, expect } from "vitest"
import { createEntitySchema, updateEntitySchema } from "@/lib/validations/entity.schema"

describe("createEntitySchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createEntitySchema.safeParse({
      name: "Johnson Family Trust",
      entityType: "trust",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = createEntitySchema.safeParse({
      name: "Johnson Family Trust",
      entityType: "trust",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      jurisdiction: "Delaware",
      taxId: "12-3456789",
      metadata: { key: "value" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid entity types", () => {
    const types = ["personal", "llc", "trust", "corporation", "partnership", "foundation"]
    for (const entityType of types) {
      const result = createEntitySchema.safeParse({
        name: "Test",
        entityType,
        clientId: "550e8400-e29b-41d4-a716-446655440000",
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects missing name", () => {
    const result = createEntitySchema.safeParse({
      entityType: "trust",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid entityType", () => {
    const result = createEntitySchema.safeParse({
      name: "Test Entity",
      entityType: "hedge_fund",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid clientId (not a UUID)", () => {
    const result = createEntitySchema.safeParse({
      name: "Test Entity",
      entityType: "trust",
      clientId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })
})

describe("updateEntitySchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateEntitySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts a partial update with only name", () => {
    const result = updateEntitySchema.safeParse({ name: "Updated Name" })
    expect(result.success).toBe(true)
  })

  it("rejects invalid entityType in partial update", () => {
    const result = updateEntitySchema.safeParse({ entityType: "invalid" })
    expect(result.success).toBe(false)
  })

  it("does not accept clientId (omitted from update)", () => {
    const result = updateEntitySchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty("clientId")
    }
  })
})
