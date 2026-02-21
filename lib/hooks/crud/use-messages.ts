"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import { getConversations, getMessagesByConversation } from "@/lib/services/messages.service"
import type { Conversation, Message } from "@/lib/mock/types"

interface MessagesState {
  conversations: Conversation[]
  messages: Message[]
  isLoading: boolean
}

type MessagesAction =
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_LOADING"; payload: boolean }

function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload, isLoading: false }
    case "SET_MESSAGES":
      return { ...state, messages: action.payload }
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        conversations: state.conversations.map((c) =>
          c.id === action.payload.conversationId
            ? { ...c, lastMessage: action.payload.content, timestamp: action.payload.timestamp }
            : c
        ),
      }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

export function useMessages() {
  const [state, dispatch] = useReducer(messagesReducer, {
    conversations: [],
    messages: [],
    isLoading: true,
  })

  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    getConversations().then((convos) => {
      dispatch({ type: "SET_CONVERSATIONS", payload: convos })
    })
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    const msgs = await getMessagesByConversation(conversationId)
    dispatch({ type: "SET_MESSAGES", payload: msgs })
  }, [])

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      const newMessage: Message = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId,
        sender: "Alexander Ward",
        senderType: "advisor",
        content,
        timestamp: new Date().toISOString(),
        read: true,
      }
      dispatch({ type: "ADD_MESSAGE", payload: newMessage })
    },
    []
  )

  return {
    conversations: state.conversations,
    messages: state.messages,
    isLoading: state.isLoading,
    loadMessages,
    sendMessage,
  }
}
