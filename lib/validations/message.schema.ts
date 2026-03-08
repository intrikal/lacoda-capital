import { z } from "zod"

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const conversationTypeEnum = z.enum(["client", "team"])
export const messageSenderTypeEnum = z.enum(["advisor", "client", "team"])

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).trim(),
  type: conversationTypeEnum,
  clientId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string().min(1, "Message cannot be empty").max(10000),
  senderType: messageSenderTypeEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
