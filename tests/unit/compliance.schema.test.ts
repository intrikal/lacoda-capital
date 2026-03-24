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

  it("accepts a fully populated payload with new fields", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "KYC-001",
      name: "KYC Verification",
      category: "kyc",
      framework: "SOC2",
      assigneeId: "550e8400-e29b-41d4-a716-446655440000",
      dueDate: "2026-06-30",
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

  it("accepts null framework and assigneeId", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "KYC-001",
      name: "KYC Verification",
      framework: null,
      assigneeId: null,
      dueDate: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid assigneeId", () => {
    const result = createComplianceControlSchema.safeParse({
      code: "KYC-001",
      name: "KYC Verification",
      assigneeId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
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

  it("accepts status update with valid enum values", () => {
    const validStatuses = ["not_started", "in_progress", "implemented", "verified"]
    for (const status of validStatuses) {
      const result = updateComplianceControlSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid status", () => {
    const result = updateComplianceControlSchema.safeParse({ status: "invalid" })
    expect(result.success).toBe(false)
  })

  it("accepts framework + assigneeId + dueDate updates", () => {
    const result = updateComplianceControlSchema.safeParse({
      framework: "SOC2",
      assigneeId: "550e8400-e29b-41d4-a716-446655440000",
      dueDate: "2026-04-30",
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
      status: "approved",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing documentId", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      status: "approved",
    })
    expect(result.success).toBe(false)
  })

  it("accepts missing clientId (nullable optional)", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      documentId: "550e8400-e29b-41d4-a716-446655440001",
      status: "approved",
    })
    expect(result.success).toBe(true)
  })

  it("defaults status to pending", () => {
    const result = createComplianceEvidenceSchema.safeParse({
      controlId: "550e8400-e29b-41d4-a716-446655440000",
      documentId: "550e8400-e29b-41d4-a716-446655440001",
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
      validFrom: "2024-01-01",
      validUntil: "2025-01-01",
      reviewNotes: "Approved after manual review",
    })
    expect(result.success).toBe(true)
  })
})
