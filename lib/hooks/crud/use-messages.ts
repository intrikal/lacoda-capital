"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  markConversationRead,
  deleteConversation,
} from "@/lib/actions/message.actions"
import type { ConversationRecord, MessageRecord } from "@/lib/types"
import type {
  CreateConversationInput,
  SendMessageInput,
} from "@/lib/validations/message.schema"

export type { ConversationRecord, MessageRecord }

export interface MessageAttachmentRecord {
  name: string
  size: string
  type: string
}

export function useConversations(params?: {
  type?: string
  clientId?: string
}) {
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getConversations(params)
      setConversations(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.type, params?.clientId])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => ({
    total: conversations.length,
    unread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    clientThreads: conversations.filter((c) => c.type === "client").length,
    teamThreads: conversations.filter((c) => c.type === "team").length,
  }), [conversations])

  return {
    conversations,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useConversationMessages(conversationId: string | null | undefined) {
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!conversationId) return
    setIsLoading(true)
    try {
      const result = await getMessages({ conversationId })
      setMessages(result.items)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  useEffect(() => { load() }, [load])

  return { messages, isLoading, refetch: load }
}

export function useSendMessage() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: SendMessageInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await sendMessage(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useCreateConversation() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateConversationInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createConversation(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useMarkConversationRead() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await markConversationRead(id)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteConversation() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteConversation(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
