import { describe, it, expect } from "vitest"
import { createAssignmentSchema } from "@/lib/validations/assignment.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"
const UUID2 = "660e8400-e29b-41d4-a716-446655440000"

describe("createAssignmentSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createAssignmentSchema.safeParse({
      assistantMemberId: UUID,
      clientId: UUID2,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = createAssignmentSchema.safeParse({
      assistantMemberId: UUID,
      clientId: UUID2,
      notes: "Primary assistant for this client",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing assistantMemberId", () => {
    const result = createAssignmentSchema.safeParse({ clientId: UUID })
    expect(result.success).toBe(false)
  })

  it("rejects invalid assistantMemberId uuid", () => {
    const result = createAssignmentSchema.safeParse({
      assistantMemberId: "bad",
      clientId: UUID,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing clientId", () => {
    const result = createAssignmentSchema.safeParse({ assistantMemberId: UUID })
    expect(result.success).toBe(false)
  })

  it("rejects invalid clientId uuid", () => {
    const result = createAssignmentSchema.safeParse({
      assistantMemberId: UUID,
      clientId: "bad",
    })
    expect(result.success).toBe(false)
  })

  it("accepts null notes", () => {
    const result = createAssignmentSchema.safeParse({
      assistantMemberId: UUID,
      clientId: UUID2,
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects notes exceeding 1000 characters", () => {
    const result = createAssignmentSchema.safeParse({
      assistantMemberId: UUID,
      clientId: UUID2,
      notes: "A".repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})
