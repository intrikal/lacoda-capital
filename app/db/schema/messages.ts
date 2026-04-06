/**
 * ============================================================================
 * FILE: app/db/schema/messages.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Drizzle ORM table definitions for the messaging system.
 *   Two tables: conversations (threads) and messages (individual chat entries).
 *
 * DATA MODEL:
 *   ┌──────────────────┐      ┌──────────────────┐
 *   │  conversations   │ ───< │    messages       │
 *   │     (ONE)        │      │     (MANY)        │
 *   │ id, orgId, name  │      │ conversationId    │
 *   │ type, clientId   │      │ senderId, content │
 *   │ lastMessage      │      │ senderType, read  │
 *   └──────────────────┘      └──────────────────┘
 *
 *   Each conversation belongs to an org (multi-tenant).
 *   Client conversations optionally link to a client record.
 *   Team conversations are internal-only (no clientId).
 *
 * DENORMALIZATION:
 *   conversations.lastMessage and conversations.lastMessageAt are denormalized
 *   copies of the most recent message's content and timestamp. This avoids an
 *   expensive JOIN/subquery when rendering the conversation list sidebar, which
 *   needs to show the last message preview for every thread.
 *
 *   conversations.unreadCount is a denormalized count of unread messages. The
 *   resolver increments it on new messages and resets it via markConversationRead.
 *
 * CONSUMERS:
 *   - lib/actions/message.actions.ts    (CRUD server actions)
 *   - lib/hooks/crud/use-messages.ts    (React hooks via server actions)
 *   - app/(dashboard)/app/messages/     (advisor messaging page)
 *   - app/(client)/client/messages/     (client portal messaging page)
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { conversationTypeEnum, messageSenderTypeEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";
import { users } from "./users";

// ─── CONVERSATIONS TABLE ──────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    /** id — Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId — Multi-tenancy anchor. Cascades on org delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * name — Display name for the conversation.
     * For client conversations: typically the client's display name.
     * For team conversations: the team member's name or a group name.
     */
    name: text("name").notNull(),

    /**
     * type — "client" or "team".
     * Client conversations appear in the client portal.
     * Team conversations are internal-only (advisor ↔ advisor).
     */
    type: conversationTypeEnum("type").notNull(),

    /**
     * clientId — Optional link to a client record.
     * Set for client conversations so the client portal can filter
     * conversations belonging to the logged-in client.
     * Null for team conversations.
     */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /**
     * lastMessage — Denormalized preview of the most recent message.
     * Updated by the sendMessage resolver after each new message.
     * Shown in the conversation list sidebar without joining messages.
     */
    lastMessage: text("last_message"),

    /**
     * lastMessageAt — Timestamp of the most recent message.
     * Used for sorting conversations by recency in the sidebar.
     */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),

    /**
     * unreadCount — Number of unread messages in this conversation.
     * Incremented by sendMessage, reset to 0 by markConversationRead.
     */
    unreadCount: integer("unread_count").notNull().default(0),

    /** metadata — Extensible JSON for future use (e.g., pinned, muted). */
    metadata: jsonb("metadata").$type<ConversationMetadata>().default({}),

    /** Standard audit timestamps. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * SOFT DELETE — see documents.ts deletedAt for full explanation.
     * NULL = active row. NOT NULL = "deleted" at that timestamp.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("conversations_org_id_idx").on(table.orgId),
    index("conversations_client_id_idx").on(table.clientId),
    index("conversations_type_idx").on(table.type),
    index("conversations_last_message_at_idx").on(table.lastMessageAt),
  ]
);

// ─── MESSAGES TABLE ───────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    /** id — Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** conversationId — Which conversation this message belongs to. */
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    /**
     * senderId — Who sent this message. FK to users table.
     * Null for system-generated messages (if any).
     */
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * senderType — Categorizes the sender for UI rendering:
     *   "advisor" → displayed on the right side (tiffany colored)
     *   "client"  → displayed on the left side
     *   "team"    → displayed on the left side (internal thread)
     */
    senderType: messageSenderTypeEnum("sender_type").notNull(),

    /** content — The message text content. */
    content: text("content").notNull(),

    /**
     * read — Whether the message has been read by the recipient.
     * For simplicity, this is a single boolean (not per-user tracking).
     */
    read: boolean("read").notNull().default(false),

    /**
     * metadata — Extensible JSON for attachments and rich content.
     * Attachment schema: { attachments: [{ name, size, type }] }
     */
    metadata: jsonb("metadata").$type<MessageMetadata>().default({}),

    /** createdAt — When the message was sent. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * SOFT DELETE — see documents.ts deletedAt for full explanation.
     * NULL = active row. NOT NULL = "deleted" at that timestamp.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_sender_id_idx").on(table.senderId),
    index("messages_created_at_idx").on(table.createdAt),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  org: one(orgs, {
    fields: [conversations.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [conversations.clientId],
    references: [clients.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ConversationMetadata {
  [key: string]: unknown;
}

export interface MessageAttachment {
  name: string;
  size: string;
  type: string;
}

export interface MessageMetadata {
  attachments?: MessageAttachment[];
  [key: string]: unknown;
}

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
