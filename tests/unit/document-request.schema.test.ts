import { describe, it, expect } from "vitest"
import {
  createDocumentRequestSchema,
  updateDocumentRequestSchema,
} from "@/lib/validations/document-request.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createDocumentRequestSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "Tax return 2024" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe("medium")
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createDocumentRequestSchema.safeParse({
      clientId: UUID,
      entityId: UUID,
      assetId: UUID,
      title: "W-2 Form",
      description: "Need W-2 for 2024 filing",
      documentType: "tax_form",
      priority: "high",
      dueDate: "2025-04-15",
      assignedTo: UUID,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing title", () => {
    const result = createDocumentRequestSchema.safeParse({ clientId: UUID })
    expect(result.success).toBe(false)
  })

  it("rejects empty title", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "" })
    expect(result.success).toBe(false)
  })

  it("rejects title exceeding 255 characters", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "A".repeat(256) })
    expect(result.success).toBe(false)
  })

  it("rejects invalid priority", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "Test", priority: "critical" })
    expect(result.success).toBe(false)
  })

  it("accepts all valid priorities", () => {
    for (const priority of ["low", "medium", "high", "urgent"]) {
      const result = createDocumentRequestSchema.safeParse({ title: "Test", priority })
      expect(result.success).toBe(true)
    }
  })

  it("accepts null clientId", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "Test", clientId: null })
    expect(result.success).toBe(true)
  })

  it("rejects invalid uuid for entityId", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "Test", entityId: "bad" })
    expect(result.success).toBe(false)
  })

  it("accepts null description", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "Test", description: null })
    expect(result.success).toBe(true)
  })

  it("rejects description exceeding 1000 characters", () => {
    const result = createDocumentRequestSchema.safeParse({
      title: "Test",
      description: "A".repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it("trims title whitespace", () => {
    const result = createDocumentRequestSchema.safeParse({ title: "  Tax Return  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("Tax Return")
    }
  })
})

describe("updateDocumentRequestSchema", () => {
  it("accepts an empty object", () => {
    const result = updateDocumentRequestSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status", () => {
    const result = updateDocumentRequestSchema.safeParse({ status: "approved" })
    expect(result.success).toBe(true)
  })

  it("accepts all valid statuses", () => {
    for (const status of ["pending", "sent", "received", "reviewed", "approved"]) {
      const result = updateDocumentRequestSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid status", () => {
    const result = updateDocumentRequestSchema.safeParse({ status: "cancelled" })
    expect(result.success).toBe(false)
  })

  it("rejects empty title", () => {
    const result = updateDocumentRequestSchema.safeParse({ title: "" })
    expect(result.success).toBe(false)
  })
})
