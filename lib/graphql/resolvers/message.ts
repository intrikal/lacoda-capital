/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/message.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   GraphQL resolvers for the messaging system. Handles conversations (threads)
 *   and messages (individual chat entries) with org-scoped access control.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Apollo Client (browser)                                      │
 *   │   useQuery(GET_CONVERSATIONS) / useMutation(SEND_MESSAGE)    │
 *   │         ↓                                                    │
 *   │ POST /api/graphql                                            │
 *   │         ↓                                                    │
 *   │ messageResolvers (this file)                                 │
 *   │   requireAuth() → session.orgId                             │
 *   │         ↓                                                    │
 *   │ Drizzle ORM → conversations + messages tables → PostgreSQL  │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * DENORMALIZATION:
 *   When a message is sent, the resolver also updates the parent conversation:
 *     - conversations.lastMessage  → content of the new message
 *     - conversations.lastMessageAt → timestamp of the new message
 *     - conversations.unreadCount  → incremented by 1
 *   This avoids expensive JOINs when rendering the conversation sidebar.
 *
 *   markConversationRead resets unreadCount to 0 and marks all messages
 *   in the conversation as read.
 *
 * SECURITY:
 *   - All queries/mutations require authentication (requireAuth)
 *   - All DB queries filter by session.orgId (multi-tenant isolation)
 *   - Create/Send require "admin" or "assistant" role
 *   - Delete requires "admin" role
 */

import { eq, and, count, desc } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { conversations, messages, clients, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createConversationSchema,
  sendMessageSchema,
} from "@/lib/validations/message.schema"
import type { GraphQLContext } from "./context"

export const messageResolvers = {
  Query: {
    /**
     * conversations — Paginated list of conversations for the caller's org.
     * Sorted by lastMessageAt descending (most recent first).
     *
     * Optional filters:
     *   type     — "client" or "team"
     *   clientId — only conversations linked to this client
     */
    conversations: async (
      _: unknown,
      args: {
        type?: string
        clientId?: string
        page?: number
        limit?: number
      },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 50, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(conversations.orgId, session.orgId)]
      if (args.type)
        conditions.push(
          eq(conversations.type, args.type as "client" | "team")
        )
      if (args.clientId)
        conditions.push(eq(conversations.clientId, args.clientId))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(conversations)
          .where(where)
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(conversations).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /**
     * conversation — Single conversation by ID, org-scoped.
     */
    conversation: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, args.id),
            eq(conversations.orgId, session.orgId)
          ),
        })) ?? null
      )
    },

    /**
     * messages — Paginated messages for a specific conversation.
     * Sorted by createdAt ascending (oldest first, like a chat).
     *
     * Verifies the conversation belongs to the caller's org before returning.
     */
    messages: async (
      _: unknown,
      args: { conversationId: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)

      // Verify conversation belongs to org
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, args.conversationId),
          eq(conversations.orgId, session.orgId)
        ),
      })
      if (!conv)
        throw new GraphQLError("Conversation not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 100, 200)
      const offset = (page - 1) * limit

      const where = eq(messages.conversationId, args.conversationId)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(messages)
          .where(where)
          .orderBy(messages.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(messages).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },
  },

  Mutation: {
    /**
     * createConversation — Creates a new conversation thread.
     * Requires role: admin | assistant.
     */
    createConversation: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createConversationSchema.parse(args.input)

      const [created] = await db
        .insert(conversations)
        .values({
          ...parsed,
          orgId: session.orgId,
          clientId: parsed.clientId ?? null,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /**
     * sendMessage — Sends a message in a conversation.
     * Requires role: admin | assistant.
     *
     * Side effects:
     *   1. Inserts the message row
     *   2. Updates conversation.lastMessage and lastMessageAt
     *   3. Increments conversation.unreadCount
     */
    sendMessage: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = sendMessageSchema.parse(args.input)

      // Verify conversation belongs to org
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, parsed.conversationId),
          eq(conversations.orgId, session.orgId)
        ),
      })
      if (!conv)
        throw new GraphQLError("Conversation not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const now = new Date()

      // Insert message
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

      // Update conversation denormalized fields
      await db
        .update(conversations)
        .set({
          lastMessage: parsed.content,
          lastMessageAt: now,
          unreadCount: (conv.unreadCount ?? 0) + 1,
          updatedAt: now,
        })
        .where(eq(conversations.id, parsed.conversationId))

      return created
    },

    /**
     * markConversationRead — Resets unread count and marks all messages as read.
     * Any authenticated user can mark conversations read.
     */
    markConversationRead: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, args.id),
          eq(conversations.orgId, session.orgId)
        ),
      })
      if (!conv)
        throw new GraphQLError("Conversation not found", {
          extensions: { code: "NOT_FOUND" },
        })

      // Mark all messages in conversation as read
      await db
        .update(messages)
        .set({ read: true })
        .where(eq(messages.conversationId, args.id))

      // Reset conversation unread count
      const [updated] = await db
        .update(conversations)
        .set({ unreadCount: 0, updatedAt: new Date() })
        .where(eq(conversations.id, args.id))
        .returning()

      return updated
    },

    /**
     * deleteConversation — Deletes a conversation and all its messages.
     * Requires role: admin.
     * Messages cascade-delete automatically (ON DELETE CASCADE).
     */
    deleteConversation: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, args.id),
          eq(conversations.orgId, session.orgId)
        ),
      })
      if (!conv)
        throw new GraphQLError("Conversation not found", {
          extensions: { code: "NOT_FOUND" },
        })

      await db.delete(conversations).where(eq(conversations.id, args.id))
      return true
    },
  },

  /**
   * Conversation — Field resolvers.
   */
  Conversation: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
    messages: async (parent: { id: string }) => {
      return db.query.messages.findMany({
        where: eq(messages.conversationId, parent.id),
        orderBy: messages.createdAt,
      })
    },
  },

  /**
   * Message — Field resolvers.
   */
  Message: {
    sender: async (parent: { senderId: string | null }) => {
      if (!parent.senderId) return null
      return db.query.users.findFirst({
        where: eq(users.id, parent.senderId),
      })
    },
  },
}
