"use server"

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { conversations, messages } from "@/app/db/schema"
import { eq, desc, asc, isNull, sum } from "drizzle-orm"
import type { Conversation, Message } from "@/lib/types/mock"

/** Map a DB conversations row to the Conversation mock type shape. */
function toConversation(row: typeof conversations.$inferSelect): Conversation {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Conversation["type"],
    avatar: row.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    avatarColor: "bg-tiffany-500/20 text-tiffany-500",
    lastMessage: row.lastMessage ?? "",
    timestamp: (row.lastMessageAt ?? row.createdAt).toISOString(),
    unread: row.unreadCount,
    online: false,
    aum: undefined,
  }
}

/** Map a DB messages row to the Message mock type shape. */
function toMessage(row: typeof messages.$inferSelect): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    sender: row.senderId ?? "system",
    senderType: row.senderType as Message["senderType"],
    content: row.content,
    timestamp: row.createdAt.toISOString(),
    read: row.read,
    attachments: ((row.metadata as Record<string, unknown>)?.attachments as Message["attachments"]) ?? undefined,
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const rows = await db
    .select()
    .from(conversations)
    .where(isNull(conversations.deletedAt))
    .orderBy(desc(conversations.lastMessageAt))
  return rows.map(toConversation)
}

export async function getConversationById(id: string): Promise<Conversation | undefined> {
  const rows = await db.select().from(conversations).where(eq(conversations.id, id))
  return rows[0] ? toConversation(rows[0]) : undefined
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
  return rows.map(toMessage)
}

export async function getUnreadMessageCount(): Promise<number> {
  const result = await db
    .select({ total: sum(conversations.unreadCount) })
    .from(conversations)
    .where(isNull(conversations.deletedAt))
  return Number(result[0]?.total ?? 0)
}
