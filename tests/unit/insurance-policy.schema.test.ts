import { describe, it, expect } from "vitest"
import {
  createInsurancePolicySchema,
  updateInsurancePolicySchema,
} from "@/lib/validations/insurance-policy.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createInsurancePolicySchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Home Insurance",
      policyType: "home",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.deductible).toBe(0)
      expect(result.data.premiumFrequency).toBe("annual")
      expect(result.data.coveredAssets).toEqual([])
      expect(result.data.beneficiaries).toEqual([])
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createInsurancePolicySchema.safeParse({
      clientId: UUID,
      name: "Life Insurance",
      policyType: "life",
      provider: "MetLife",
      policyNumber: "LI-99999",
      coverageAmount: 1000000,
      deductible: 500,
      premium: 200,
      premiumFrequency: "monthly",
      effectiveDate: "2025-01-01",
      expirationDate: "2055-01-01",
      coveredAssets: ["house", "car"],
      beneficiaries: ["Jane Doe", "John Doe"],
      agent: { name: "Bob Agent", phone: "555-0100", email: "bob@agency.com" },
      notes: "Term life policy",
      metadata: { term: 30 },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const result = createInsurancePolicySchema.safeParse({
      policyType: "home",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing policyType", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid policyType", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "dental",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid policy types", () => {
    for (const policyType of ["home", "auto", "life", "umbrella", "liability", "health", "business", "property"]) {
      const result = createInsurancePolicySchema.safeParse({
        name: "Test",
        policyType,
        provider: "Test Co",
        policyNumber: "P-001",
        coverageAmount: 100000,
        premium: 500,
        effectiveDate: "2025-01-01",
        expirationDate: "2026-01-01",
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects missing provider", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing policyNumber", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "State Farm",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative coverageAmount", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: -1,
      premium: 1200,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative premium", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: -100,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing effectiveDate", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      expirationDate: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing expirationDate", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "State Farm",
      policyNumber: "HO-12345",
      coverageAmount: 500000,
      premium: 1200,
      effectiveDate: "2025-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid premium frequencies", () => {
    for (const premiumFrequency of ["monthly", "quarterly", "annual"]) {
      const result = createInsurancePolicySchema.safeParse({
        name: "Test",
        policyType: "home",
        provider: "Test Co",
        policyNumber: "P-001",
        coverageAmount: 100000,
        premium: 500,
        premiumFrequency,
        effectiveDate: "2025-01-01",
        expirationDate: "2026-01-01",
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid agent email", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "Test Co",
      policyNumber: "P-001",
      coverageAmount: 100000,
      premium: 500,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
      agent: { name: "Bob", phone: "555-0100", email: "not-email" },
    })
    expect(result.success).toBe(false)
  })

  it("accepts null agent", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "Test Co",
      policyNumber: "P-001",
      coverageAmount: 100000,
      premium: 500,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
      agent: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts null notes", () => {
    const result = createInsurancePolicySchema.safeParse({
      name: "Test",
      policyType: "home",
      provider: "Test Co",
      policyNumber: "P-001",
      coverageAmount: 100000,
      premium: 500,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-01-01",
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})

describe("updateInsurancePolicySchema", () => {
  it("accepts an empty object", () => {
    const result = updateInsurancePolicySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status", () => {
    const result = updateInsurancePolicySchema.safeParse({ status: "expired" })
    expect(result.success).toBe(true)
  })

  it("accepts all valid statuses", () => {
    for (const status of ["active", "expiring", "expired", "pending"]) {
      const result = updateInsurancePolicySchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid status", () => {
    const result = updateInsurancePolicySchema.safeParse({ status: "cancelled" })
    expect(result.success).toBe(false)
  })

  it("rejects negative coverageAmount", () => {
    const result = updateInsurancePolicySchema.safeParse({ coverageAmount: -1 })
    expect(result.success).toBe(false)
  })
})
