import { describe, it, expect } from "vitest"
import {
  createComplianceControlSchema,
  updateComplianceControlSchema,
  createComplianceEvidenceSchema,
} from "@/lib/validations/compliance.schema"

describe("createComplianceControlSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "KYC-001",
      name: "KYC Verification",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "KYC-001",
      name: "KYC Verification",
      category: "kyc",
      description: "Verify client identity",
      frequency: "annual",
      requiredDocumentTypes: ["passport", "utility_bill"],
      metadata: { region: "US" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing code", () => {
    const result = createComplianceControlSchema.safeParse({
      name: "KYC Verification",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing name", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "KYC-001",
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from code and name", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "  KYC-001  ",
      name: "  KYC Verification  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe("KYC-001")
      expect(result.data.name).toBe("KYC Verification")
    }
  })
})

describe("updateComplianceControlSchema", () => {
  it("accepts an empty object", () => {
    const result = updateComplianceControlSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update", () => {
    const result = updateComplianceControlSchema.safeParse({
      name: "Updated Name",
      isActive: false,
    })
    expect(result.success).toBe(true)
  })
})

describe("createComplianceEvidenceSchema", () => {
  it("accepts a valid payload", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      documentId: "550e8400-e29b-41d4-a716-446655440001",
      clientId: "550e8400-e29b-41d4-a716-446655440002",
      status: "approved",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing controlId", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440001",
      clientId: "550e8400-e29b-41d4-a716-446655440002",
      status: "approved",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing documentId", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      clientId: "550e8400-e29b-41d4-a716-446655440002",
      status: "approved",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing clientId", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      documentId: "550e8400-e29b-41d4-a716-446655440001",
      status: "approved",
    })
    expect(result.success).toBe(false)
  })

  it("defaults status to pending", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      documentId: "550e8400-e29b-41d4-a716-446655440001",
      clientId: "550e8400-e29b-41d4-a716-446655440002",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("pending")
    }
  })

  it("accepts optional date fields", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      documentId: "550e8400-e29b-41d4-a716-446655440001",
      clientId: "550e8400-e29b-41d4-a716-446655440002",
      validFrom: "2024-01-01",
      validUntil: "2025-01-01",
      reviewNotes: "Approved after manual review",
    })
    expect(result.success).toBe(true)
  })
})
