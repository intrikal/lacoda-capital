import { describe, it, expect } from "vitest"
import { createNotificationSchema } from "@/lib/validations/notification.schema"

describe("createNotificationSchema", () => {
  it("accepts a valid payload", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "task_assigned",
      title: "New task assigned",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid notification types", () => {
    const types = [
      "task_assigned", "task_due", "document_uploaded",
      "document_expiring", "document_requested", "report_ready",
      "compliance_alert", "system",
    ]
    for (const type of types) {
      const result = createNotificationSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        type,
        title: "Test notification",
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects missing userId", () => {
    const result = createNotificationSchema.safeParse({
      type: "system",
      title: "Test",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid notification type", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "custom_alert",
      title: "Test",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing title", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "system",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty title", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "system",
      title: "",
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional message and payload", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "task_assigned",
      title: "New task",
      message: "You have been assigned a new task",
      payload: { taskId: "task-123" },
    })
    expect(result.success).toBe(true)
  })
})
