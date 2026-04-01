"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count, desc } from "drizzle-orm"
import { db } from "@/app/db"
import { conversations, messages } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { blockDemoMutation } from "@/lib/demo/guard"
import { createConversationSchema, sendMessageSchema } from "@/lib/validations/message.schema"
import type { ConversationRecord, MessageRecord, PaginatedResult } from "@/lib/types"

export async function getConversations(params?: {
  type?: string
  clientId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<ConversationRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 50, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(conversations.orgId, session.orgId!)]
  if (params?.type) conditions.push(eq(conversations.type, params.type as "client" | "team"))
  if (params?.clientId) conditions.push(eq(conversations.clientId, params.clientId))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(conversations).where(where).orderBy(desc(conversations.lastMessageAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(conversations).where(where),
  ])

  return { items: items as unknown as ConversationRecord[], totalCount: total, page, limit }
}

export async function getMessages(params: {
  conversationId: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<MessageRecord>> {
  const session = await requireAuth()
  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 100, 200)
  const offset = (page - 1) * limit

  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, params.conversationId), eq(conversations.orgId, session.orgId!)),
  })
  if (!conv) throw new Error("Conversation not found")

  const where = eq(messages.conversationId, params.conversationId)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(messages).where(where).orderBy(messages.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(messages).where(where),
  ])

  return { items: items as unknown as MessageRecord[], totalCount: total, page, limit }
}

export async function createConversation(input: unknown): Promise<ConversationRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const parsed = createConversationSchema.parse(input)

  const [created] = await db
    .insert(conversations)
    .values({
      ...parsed,
      orgId: session.orgId!,
      clientId: parsed.clientId ?? null,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  return created as unknown as ConversationRecord
}

export async function sendMessage(input: unknown): Promise<MessageRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const parsed = sendMessageSchema.parse(input)

  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, parsed.conversationId), eq(conversations.orgId, session.orgId!)),
  })
  if (!conv) throw new Error("Conversation not found")

  const now = new Date()

  const [created] = await db
    .insert(messages)
    .values({
      conversationId: parsed.conversationId,
      senderId: session.userId,
      senderType: parsed.senderType ?? "advisor",
      content: parsed.content,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  await db
    .update(conversations)
    .set({
      lastMessage: parsed.content,
      lastMessageAt: now,
      unreadCount: (conv.unreadCount ?? 0) + 1,
      updatedAt: now,
    })
    .where(eq(conversations.id, parsed.conversationId))

  captureServerEvent(session.userId, "message.sent", { sender_type: parsed.senderType ?? "advisor" })

  return created as unknown as MessageRecord
}

export async function markConversationRead(id: string): Promise<ConversationRecord> {
  const session = await requireAuth()
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.orgId, session.orgId!)),
  })
  if (!conv) throw new Error("Conversation not found")

  await db.update(messages).set({ read: true }).where(eq(messages.conversationId, id))

  const [updated] = await db
    .update(conversations)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning()

  return updated as unknown as ConversationRecord
}

export async function deleteConversation(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  blockDemoMutation(session.orgId)
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.orgId, session.orgId!)),
  })
  if (!conv) throw new Error("Conversation not found")
  await db.delete(conversations).where(eq(conversations.id, id))
  return true
}
