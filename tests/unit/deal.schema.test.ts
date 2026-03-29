import { describe, it, expect } from "vitest"
import { createDealSchema, updateDealSchema } from "@/lib/validations/deal.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createDealSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createDealSchema.safeParse({
      name: "Acme Acquisition",
      type: "private_equity",
      potentialValue: 5000000,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = createDealSchema.safeParse({
      clientId: UUID,
      name: "Downtown Office",
      stage: "due_diligence",
      type: "real_estate",
      potentialValue: 10000000,
      probability: 75,
      assigneeName: "John Smith",
      dueDate: "2025-06-30",
      notes: "Prime location downtown",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const result = createDealSchema.safeParse({
      type: "private_equity",
      potentialValue: 5000000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = createDealSchema.safeParse({
      name: "",
      type: "private_equity",
      potentialValue: 5000000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing type", () => {
    const result = createDealSchema.safeParse({
      name: "Test Deal",
      potentialValue: 5000000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid type", () => {
    const result = createDealSchema.safeParse({
      name: "Test Deal",
      type: "crypto",
      potentialValue: 5000000,
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid types", () => {
    for (const type of ["real_estate", "private_equity", "venture_capital", "fixed_income"]) {
      const result = createDealSchema.safeParse({
        name: "Test",
        type,
        potentialValue: 1000,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts all valid stages", () => {
    for (const stage of ["prospecting", "due_diligence", "negotiation", "closed", "active", "exit_planning"]) {
      const result = createDealSchema.safeParse({
        name: "Test",
        type: "real_estate",
        potentialValue: 1000,
        stage,
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid stage", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "real_estate",
      potentialValue: 1000,
      stage: "won",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing potentialValue", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative potentialValue", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: -100,
    })
    expect(result.success).toBe(false)
  })

  it("rejects probability over 100", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      probability: 101,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative probability", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      probability: -1,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer probability", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      probability: 50.5,
    })
    expect(result.success).toBe(false)
  })

  it("accepts null clientId", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      clientId: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts null dueDate", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      dueDate: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts null notes", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects notes exceeding 5000 characters", () => {
    const result = createDealSchema.safeParse({
      name: "Test",
      type: "private_equity",
      potentialValue: 1000,
      notes: "A".repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it("trims name whitespace", () => {
    const result = createDealSchema.safeParse({
      name: "  Deal Name  ",
      type: "private_equity",
      potentialValue: 1000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Deal Name")
    }
  })
})

describe("updateDealSchema", () => {
  it("accepts an empty object", () => {
    const result = updateDealSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with name only", () => {
    const result = updateDealSchema.safeParse({ name: "Updated Deal" })
    expect(result.success).toBe(true)
  })

  it("rejects invalid type", () => {
    const result = updateDealSchema.safeParse({ type: "crypto" })
    expect(result.success).toBe(false)
  })

  it("rejects negative potentialValue", () => {
    const result = updateDealSchema.safeParse({ potentialValue: -1 })
    expect(result.success).toBe(false)
  })

  it("accepts lastActivity field", () => {
    const result = updateDealSchema.safeParse({ lastActivity: "Called client" })
    expect(result.success).toBe(true)
  })
})
