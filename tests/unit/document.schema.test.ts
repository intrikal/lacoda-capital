import { describe, it, expect } from "vitest"
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validations/document.schema"

describe("createDocumentSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createDocumentSchema.safeParse({
      name: "Tax Return 2024",
      storagePath: "/uploads/tax-return-2024.pdf",
    })
    expect(result.success).toBe(true)
  })

  it("applies default status", () => {
    const result = createDocumentSchema.safeParse({
      name: "Tax Return 2024",
      storagePath: "/uploads/tax-return-2024.pdf",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("pending")
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createDocumentSchema.safeParse({
      name: "Tax Return 2024",
      storagePath: "/uploads/tax-return-2024.pdf",
      description: "Federal tax return for FY 2024",
      status: "verified",
      mimeType: "application/pdf",
      fileSize: "1024000",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      entityId: "550e8400-e29b-41d4-a716-446655440001",
      expiresAt: "2025-12-31",
      tags: ["tax", "2024"],
      metadata: { year: 2024 },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const result = createDocumentSchema.safeParse({
      storagePath: "/uploads/doc.pdf",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing storagePath", () => {
    const result = createDocumentSchema.safeParse({
      name: "Test Document",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status", () => {
    const result = createDocumentSchema.safeParse({
      name: "Test",
      storagePath: "/uploads/doc.pdf",
      status: "deleted",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid statuses", () => {
    const statuses = ["pending", "verified", "expired", "rejected"]
    for (const status of statuses) {
      const result = createDocumentSchema.safeParse({
        name: "Test",
        storagePath: "/uploads/doc.pdf",
        status,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe("updateDocumentSchema", () => {
  it("accepts an empty object", () => {
    const result = updateDocumentSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status only", () => {
    const result = updateDocumentSchema.safeParse({ status: "verified" })
    expect(result.success).toBe(true)
  })

  it("does not accept storagePath (omitted from update)", () => {
    const result = updateDocumentSchema.safeParse({
      storagePath: "/new/path.pdf",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty("storagePath")
    }
  })
})
