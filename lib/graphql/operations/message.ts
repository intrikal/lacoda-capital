/**
 * ============================================================================
 * FILE: lib/graphql/operations/message.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for the messaging
 *   system. Covers conversations (threads) and messages (individual entries).
 *
 * DATA MODEL:
 *   Conversation — a messaging thread (client or team type)
 *   Message      — a single chat entry within a conversation
 *
 *   Conversations have denormalized fields (lastMessage, lastMessageAt,
 *   unreadCount) for efficient sidebar rendering without JOINing messages.
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/message.ts (resolver)
 *           → Drizzle ORM → PostgreSQL (conversations + messages tables)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-messages.ts — useQuery / useMutation hooks
 */

import { gql } from "@apollo/client"

// ─── FRAGMENTS ────────────────────────────────────────────────────────────────

/**
 * CONVERSATION_FIELDS — Fields needed for the conversation sidebar list.
 *
 * Includes denormalized lastMessage/lastMessageAt for the preview line,
 * unreadCount for the badge, and type for filtering (client | team).
 */
export const CONVERSATION_FIELDS = gql`
  fragment ConversationFields on Conversation {
    id
    orgId
    name
    type
    clientId
    lastMessage
    lastMessageAt
    unreadCount
    metadata
    createdAt
    updatedAt
  }
`

/**
 * MESSAGE_FIELDS — Fields for a single message in the chat view.
 *
 * senderType drives the bubble position:
 *   "advisor" → right side (tiffany colored)
 *   "client" | "team" → left side
 */
export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id
    conversationId
    senderId
    senderType
    content
    read
    metadata
    createdAt
  }
`

// ─── QUERIES ──────────────────────────────────────────────────────────────────

/**
 * GET_CONVERSATIONS — Paginated list of conversations sorted by recency.
 *
 * Variables (all optional):
 *   type     — "client" or "team" filter
 *   clientId — filter conversations for a specific client
 *   page     — page number (default 1)
 *   limit    — items per page (default 50, max 100)
 */
export const GET_CONVERSATIONS = gql`
  ${CONVERSATION_FIELDS}
  query GetConversations(
    $type: String
    $clientId: ID
    $page: Int
    $limit: Int
  ) {
    conversations(
      type: $type
      clientId: $clientId
      page: $page
      limit: $limit
    ) {
      items {
        ...ConversationFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_MESSAGES — Paginated messages for a specific conversation.
 * Sorted by createdAt ascending (oldest first, like a chat).
 *
 * Variables:
 *   conversationId (required) — which conversation to load messages for
 *   page, limit — pagination
 */
export const GET_MESSAGES = gql`
  ${MESSAGE_FIELDS}
  query GetMessages(
    $conversationId: ID!
    $page: Int
    $limit: Int
  ) {
    messages(
      conversationId: $conversationId
      page: $page
      limit: $limit
    ) {
      items {
        ...MessageFields
      }
      totalCount
      page
      limit
    }
  }
`

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

/**
 * CREATE_CONVERSATION — Creates a new messaging thread.
 * Requires role: admin | assistant.
 */
export const CREATE_CONVERSATION = gql`
  ${CONVERSATION_FIELDS}
  mutation CreateConversation($input: CreateConversationInput!) {
    createConversation(input: $input) {
      ...ConversationFields
    }
  }
`

/**
 * SEND_MESSAGE — Sends a message in a conversation.
 * Also updates the conversation's denormalized fields
 * (lastMessage, lastMessageAt, unreadCount).
 */
export const SEND_MESSAGE = gql`
  ${MESSAGE_FIELDS}
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      ...MessageFields
    }
  }
`

/**
 * MARK_CONVERSATION_READ — Resets unread count and marks all messages as read.
 */
export const MARK_CONVERSATION_READ = gql`
  ${CONVERSATION_FIELDS}
  mutation MarkConversationRead($id: ID!) {
    markConversationRead(id: $id) {
      ...ConversationFields
    }
  }
`

/**
 * DELETE_CONVERSATION — Hard-deletes a conversation and all its messages.
 * Requires role: admin.
 */
export const DELETE_CONVERSATION = gql`
  mutation DeleteConversation($id: ID!) {
    deleteConversation(id: $id)
  }
`
