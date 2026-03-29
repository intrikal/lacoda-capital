import { describe, it, expect } from "vitest"
import { createTaxDeductionSchema, updateTaxDeductionSchema } from "@/lib/validations/tax-deduction.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createTaxDeductionSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Home Office",
      taxYear: "2025",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe("other")
      expect(result.data.type).toBe("personal")
      expect(result.data.status).toBe("eligible")
      expect(result.data.amount).toBe(0)
      expect(result.data.estimatedSavings).toBe(0)
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Charitable Donations",
      category: "charitable",
      type: "business",
      status: "claimed",
      amount: 10000,
      estimatedSavings: 2500,
      taxYear: "2024",
      description: "Annual charitable giving",
      notes: "Receipts on file",
      metadata: { charityName: "Red Cross" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing clientId", () => {
    const result = createTaxDeductionSchema.safeParse({
      name: "Test",
      taxYear: "2025",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid clientId", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: "bad",
      name: "Test",
      taxYear: "2025",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing name", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      taxYear: "2025",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "",
      taxYear: "2025",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing taxYear", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid taxYear format", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "25",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-numeric taxYear", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "abcd",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative amount", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "2025",
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative estimatedSavings", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "2025",
      estimatedSavings: -50,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid category", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "2025",
      category: "crypto",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid categories", () => {
    for (const category of [
      "home_office", "vehicle", "travel", "equipment", "professional",
      "education", "healthcare", "meals", "utilities", "charitable",
      "retirement", "taxes", "other",
    ]) {
      const result = createTaxDeductionSchema.safeParse({
        clientId: UUID,
        name: "Test",
        taxYear: "2025",
        category,
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid type", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "2025",
      type: "corporate",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid types", () => {
    for (const type of ["personal", "business"]) {
      const result = createTaxDeductionSchema.safeParse({
        clientId: UUID,
        name: "Test",
        taxYear: "2025",
        type,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts all valid statuses", () => {
    for (const status of ["eligible", "pending_review", "claimed", "ineligible"]) {
      const result = createTaxDeductionSchema.safeParse({
        clientId: UUID,
        name: "Test",
        taxYear: "2025",
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts null description", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "2025",
      description: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects description exceeding 500 characters", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "Test",
      taxYear: "2025",
      description: "A".repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it("trims name whitespace", () => {
    const result = createTaxDeductionSchema.safeParse({
      clientId: UUID,
      name: "  Home Office  ",
      taxYear: "2025",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Home Office")
    }
  })
})

describe("updateTaxDeductionSchema", () => {
  it("accepts an empty object", () => {
    const result = updateTaxDeductionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with amount only", () => {
    const result = updateTaxDeductionSchema.safeParse({ amount: 5000 })
    expect(result.success).toBe(true)
  })

  it("rejects invalid taxYear format", () => {
    const result = updateTaxDeductionSchema.safeParse({ taxYear: "25" })
    expect(result.success).toBe(false)
  })

  it("rejects negative amount", () => {
    const result = updateTaxDeductionSchema.safeParse({ amount: -1 })
    expect(result.success).toBe(false)
  })
})
