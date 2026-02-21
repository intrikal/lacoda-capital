// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockConversations, mockMessages } from "@/lib/mock/data"
import type { Conversation, Message } from "@/lib/mock/types"

export async function getConversations(): Promise<Conversation[]> {
  // REAL: return db.query.conversations.findMany({
  //         where: eq(conversations.orgId, orgId),
  //         orderBy: desc(conversations.timestamp),
  //       })
  return mockConversations
}

export async function getConversationById(id: string): Promise<Conversation | undefined> {
  // REAL: return db.query.conversations.findFirst({ where: eq(conversations.id, id) })
  return mockConversations.find((c) => c.id === id)
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  // REAL: return db.query.messages.findMany({
  //         where: eq(messages.conversationId, conversationId),
  //         orderBy: asc(messages.timestamp),
  //       })
  return mockMessages.filter((m) => m.conversationId === conversationId)
}

export async function getUnreadMessageCount(): Promise<number> {
  // REAL: SELECT SUM(unread_count) FROM conversations WHERE org_id = orgId
  return mockConversations.reduce((sum, c) => sum + c.unread, 0)
}
