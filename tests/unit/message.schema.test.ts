import { describe, it, expect } from "vitest"
import { createConversationSchema, sendMessageSchema } from "@/lib/validations/message.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createConversationSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createConversationSchema.safeParse({
      name: "Client Discussion",
      type: "client",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = createConversationSchema.safeParse({
      name: "Team Chat",
      type: "team",
      clientId: UUID,
      metadata: { topic: "quarterly review" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const result = createConversationSchema.safeParse({ type: "client" })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = createConversationSchema.safeParse({ name: "", type: "client" })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 255 characters", () => {
    const result = createConversationSchema.safeParse({
      name: "A".repeat(256),
      type: "client",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing type", () => {
    const result = createConversationSchema.safeParse({ name: "Test" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid type", () => {
    const result = createConversationSchema.safeParse({ name: "Test", type: "group" })
    expect(result.success).toBe(false)
  })

  it("accepts all valid types", () => {
    for (const type of ["client", "team"]) {
      const result = createConversationSchema.safeParse({ name: "Test", type })
      expect(result.success).toBe(true)
    }
  })

  it("accepts null clientId", () => {
    const result = createConversationSchema.safeParse({
      name: "Test",
      type: "client",
      clientId: null,
    })
    expect(result.success).toBe(true)
  })

  it("trims name whitespace", () => {
    const result = createConversationSchema.safeParse({
      name: "  Chat Room  ",
      type: "team",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Chat Room")
    }
  })
})

describe("sendMessageSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: UUID,
      content: "Hello!",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: UUID,
      content: "Meeting at 3pm",
      senderType: "advisor",
      metadata: { priority: "high" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing conversationId", () => {
    const result = sendMessageSchema.safeParse({ content: "Hello" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid conversationId", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "not-a-uuid",
      content: "Hello",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing content", () => {
    const result = sendMessageSchema.safeParse({ conversationId: UUID })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: UUID,
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects content exceeding 10000 characters", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: UUID,
      content: "A".repeat(10001),
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid senderType", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: UUID,
      content: "Hello",
      senderType: "bot",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid sender types", () => {
    for (const senderType of ["advisor", "client", "team"]) {
      const result = sendMessageSchema.safeParse({
        conversationId: UUID,
        content: "Hello",
        senderType,
      })
      expect(result.success).toBe(true)
    }
  })
})
