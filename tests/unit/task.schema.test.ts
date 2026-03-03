import { describe, it, expect } from "vitest"
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/task.schema"

describe("createTaskSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createTaskSchema.safeParse({
      title: "Review annual report",
    })
    expect(result.success).toBe(true)
  })

  it("applies defaults for status and priority", () => {
    const result = createTaskSchema.safeParse({
      title: "Review annual report",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("pending")
      expect(result.data.priority).toBe("medium")
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createTaskSchema.safeParse({
      title: "Review annual report",
      description: "Review and approve the Q4 annual report",
      priority: "high",
      status: "in_progress",
      dueDate: "2024-12-31",
      assignedTo: "550e8400-e29b-41d4-a716-446655440000",
      clientId: "550e8400-e29b-41d4-a716-446655440001",
      entityId: "550e8400-e29b-41d4-a716-446655440002",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing title", () => {
    const result = createTaskSchema.safeParse({
      priority: "high",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid priority", () => {
    const result = createTaskSchema.safeParse({
      title: "Test task",
      priority: "critical",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid statuses", () => {
    const statuses = ["pending", "in_progress", "completed", "cancelled"]
    for (const status of statuses) {
      const result = createTaskSchema.safeParse({
        title: "Test",
        status,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe("updateTaskSchema", () => {
  it("accepts an empty object", () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status only", () => {
    const result = updateTaskSchema.safeParse({ status: "completed" })
    expect(result.success).toBe(true)
  })

  it("rejects invalid status in partial update", () => {
    const result = updateTaskSchema.safeParse({ status: "done" })
    expect(result.success).toBe(false)
  })

  it("accepts completedAt in update", () => {
    const result = updateTaskSchema.safeParse({
      status: "completed",
      completedAt: "2024-12-31T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })
})
