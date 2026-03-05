/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-messages.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Messages pages to the GraphQL API.
 *   Provides hooks for conversations (threads) and messages (chat entries).
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Messages Page                                                     │
 *   │   └── useConversations()       → fetches conversation list        │
 *   │   └── useConversationMessages()→ fetches messages for a thread    │
 *   │   └── useSendMessage()         → sends a new message              │
 *   │   └── useMarkConversationRead()→ marks all messages as read       │
 *   │   └── useCreateConversation()  → creates a new thread             │
 *   │   └── useDeleteConversation()  → removes a thread                 │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ messageResolvers → Drizzle ORM → PostgreSQL                       │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file previously used useReducer + mock data from messages.service.ts.
 *   It has been rewritten to use Apollo Client for real database persistence.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/messages/page.tsx  (advisor messaging)
 *   - app/(client)/client/messages/page.tsx  (client portal messaging)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_CONVERSATIONS,
  GET_MESSAGES,
  CREATE_CONVERSATION,
  SEND_MESSAGE,
  MARK_CONVERSATION_READ,
  DELETE_CONVERSATION,
} from "@/lib/graphql/operations/message"
import type {
  CreateConversationInput,
  SendMessageInput,
} from "@/lib/validations/message.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** Attachment stored in message metadata. */
export interface MessageAttachmentRecord {
  name: string
  size: string
  type: string
}

/**
 * ConversationRecord — Shape of a conversation returned by the GraphQL API.
 *
 * Denormalized fields for sidebar rendering:
 *   lastMessage   — preview text of the most recent message
 *   lastMessageAt — timestamp for sorting and display
 *   unreadCount   — badge count for unread messages
 */
export interface ConversationRecord {
  id: string
  orgId: string
  name: string
  type: "client" | "team"
  clientId: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/**
 * MessageRecord — Shape of a message returned by the GraphQL API.
 *
 * senderType drives the bubble position in the UI:
 *   "advisor" → right side (tiffany colored)
 *   "client" | "team" → left side
 */
export interface MessageRecord {
  id: string
  conversationId: string
  senderId: string | null
  senderType: "advisor" | "client" | "team"
  content: string
  read: boolean
  metadata: { attachments?: MessageAttachmentRecord[] } & Record<string, unknown> | null
  createdAt: string
}

/** Apollo response shape for GET_CONVERSATIONS. */
interface GetConversationsData {
  conversations: {
    items: ConversationRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

/** Apollo response shape for GET_MESSAGES. */
interface GetMessagesData {
  messages: {
    items: MessageRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useConversations — Fetches the list of conversations for the sidebar.
 *
 * @param params — Optional filters:
 *   type     — "client" or "team"
 *   clientId — conversations for a specific client
 *
 * @returns
 *   conversations — Array of ConversationRecord (empty while loading)
 *   isLoading     — True during the initial fetch
 *   isError       — True if the query failed
 *   error         — The ApolloError object (null if no error)
 *   stats         — { total, unread, clientThreads, teamThreads }
 */
export function useConversations(params?: {
  type?: string
  clientId?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.type) variables.type = params.type
  if (params?.clientId) variables.clientId = params.clientId

  const { data, loading, error } = useQuery<GetConversationsData>(
    GET_CONVERSATIONS,
    { variables }
  )

  const conversations = data?.conversations?.items ?? []

  const stats = useMemo(() => ({
    total: conversations.length,
    unread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    clientThreads: conversations.filter((c) => c.type === "client").length,
    teamThreads: conversations.filter((c) => c.type === "team").length,
  }), [conversations])

  return {
    conversations,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useConversationMessages — Fetches messages for a specific conversation.
 *
 * @param conversationId — Which conversation to load messages for.
 *   Pass null/undefined to skip the query (no conversation selected).
 *
 * @returns
 *   messages  — Array of MessageRecord (empty while loading or if no ID)
 *   isLoading — True during the fetch
 */
export function useConversationMessages(conversationId: string | null | undefined) {
  const { data, loading } = useQuery<GetMessagesData>(GET_MESSAGES, {
    variables: { conversationId },
    skip: !conversationId,
  })

  return {
    messages: data?.messages?.items ?? [],
    isLoading: loading,
  }
}

/**
 * useSendMessage — Mutation hook for sending a message in a conversation.
 *
 * The resolver also updates the conversation's denormalized fields
 * (lastMessage, lastMessageAt, unreadCount).
 *
 * Refetches both conversations (for sidebar update) and messages.
 */
export function useSendMessage() {
  const [sendMessageMutation, { loading }] = useMutation(SEND_MESSAGE, {
    refetchQueries: [
      { query: GET_CONVERSATIONS },
    ],
  })

  const mutate = useCallback(
    (input: SendMessageInput) => {
      return sendMessageMutation({
        variables: { input },
        // Also refetch messages for the specific conversation
        refetchQueries: [
          { query: GET_CONVERSATIONS },
          { query: GET_MESSAGES, variables: { conversationId: input.conversationId } },
        ],
      })
    },
    [sendMessageMutation]
  )

  return { mutate, isPending: loading }
}

/**
 * useCreateConversation — Mutation hook for creating a new conversation thread.
 * Requires role: admin | assistant.
 */
export function useCreateConversation() {
  const [createConv, { loading }] = useMutation(CREATE_CONVERSATION, {
    refetchQueries: [{ query: GET_CONVERSATIONS }],
  })

  const mutate = useCallback(
    (input: CreateConversationInput) => {
      return createConv({ variables: { input } })
    },
    [createConv]
  )

  return { mutate, isPending: loading }
}

/**
 * useMarkConversationRead — Resets unread count and marks all messages as read.
 */
export function useMarkConversationRead() {
  const [markRead, { loading }] = useMutation(MARK_CONVERSATION_READ, {
    refetchQueries: [{ query: GET_CONVERSATIONS }],
  })

  const mutate = useCallback(
    (id: string) => {
      return markRead({ variables: { id } })
    },
    [markRead]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteConversation — Deletes a conversation and all its messages.
 * Requires role: admin.
 */
export function useDeleteConversation() {
  const [deleteConv, { loading }] = useMutation(DELETE_CONVERSATION, {
    refetchQueries: [{ query: GET_CONVERSATIONS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteConv({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteConv]
  )

  return { mutate, isPending: loading }
}
