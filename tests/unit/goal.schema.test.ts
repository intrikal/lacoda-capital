import { describe, it, expect } from "vitest"
import { createGoalSchema, updateGoalSchema } from "@/lib/validations/goal.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createGoalSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createGoalSchema.safeParse({
      name: "Retirement Fund",
      targetAmount: 1000000,
      targetDate: "2045-01-01",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe("custom")
      expect(result.data.priority).toBe("medium")
      expect(result.data.currentAmount).toBe(0)
      expect(result.data.monthlyContribution).toBe(0)
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createGoalSchema.safeParse({
      clientId: UUID,
      name: "College Fund",
      category: "education",
      priority: "high",
      targetAmount: 200000,
      currentAmount: 50000,
      monthlyContribution: 1500,
      targetDate: "2035-09-01",
      notes: "529 plan",
      metadata: { planType: "529" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const result = createGoalSchema.safeParse({
      targetAmount: 100000,
      targetDate: "2030-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = createGoalSchema.safeParse({
      name: "",
      targetAmount: 100000,
      targetDate: "2030-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing targetAmount", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetDate: "2030-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects zero targetAmount", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 0,
      targetDate: "2030-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative targetAmount", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: -1000,
      targetDate: "2030-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing targetDate", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 100000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty targetDate", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 100000,
      targetDate: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid category", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 100000,
      targetDate: "2030-01-01",
      category: "wealth",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid categories", () => {
    for (const category of [
      "retirement", "education", "realestate", "emergency",
      "travel", "vehicle", "investment", "custom",
    ]) {
      const result = createGoalSchema.safeParse({
        name: "Test",
        targetAmount: 100000,
        targetDate: "2030-01-01",
        category,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts all valid priorities", () => {
    for (const priority of ["high", "medium", "low"]) {
      const result = createGoalSchema.safeParse({
        name: "Test",
        targetAmount: 100000,
        targetDate: "2030-01-01",
        priority,
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects negative currentAmount", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 100000,
      targetDate: "2030-01-01",
      currentAmount: -100,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative monthlyContribution", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 100000,
      targetDate: "2030-01-01",
      monthlyContribution: -50,
    })
    expect(result.success).toBe(false)
  })

  it("accepts null notes", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      targetAmount: 100000,
      targetDate: "2030-01-01",
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})

describe("updateGoalSchema", () => {
  it("accepts an empty object", () => {
    const result = updateGoalSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status", () => {
    const result = updateGoalSchema.safeParse({ status: "completed" })
    expect(result.success).toBe(true)
  })

  it("accepts all valid statuses", () => {
    for (const status of ["on_track", "ahead", "behind", "completed"]) {
      const result = updateGoalSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid status", () => {
    const result = updateGoalSchema.safeParse({ status: "failed" })
    expect(result.success).toBe(false)
  })

  it("rejects zero targetAmount", () => {
    const result = updateGoalSchema.safeParse({ targetAmount: 0 })
    expect(result.success).toBe(false)
  })
})
