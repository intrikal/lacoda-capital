/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-notifications.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Notifications page to the GraphQL API.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Notifications Page                                                │
 *   │   └── useNotifications()          → fetches notification list     │
 *   │   └── useMarkNotificationRead()   → marks one as read            │
 *   │   └── useMarkAllNotificationsRead() → marks all as read          │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ notificationResolvers → Drizzle ORM → PostgreSQL                  │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/notifications/page.tsx
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from "@/lib/graphql/operations/notification"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * NotificationType — The eight supported notification categories.
 */
export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "document_uploaded"
  | "document_expiring"
  | "document_requested"
  | "report_ready"
  | "compliance_alert"
  | "system"

/**
 * NotificationRecord — Shape of a notification returned by the GraphQL API.
 *
 * readAt: null = unread, ISO timestamp = read.
 * payload: type-specific data (e.g., { taskId: "...", clientName: "..." }).
 */
export interface NotificationRecord {
  id: string
  userId: string
  orgId: string
  type: NotificationType
  title: string
  message: string | null
  readAt: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

/**
 * NotificationStats — Aggregate counts computed client-side.
 */
export interface NotificationStats {
  total: number
  unread: number
  read: number
}

/** Apollo response shape for GET_NOTIFICATIONS. */
interface GetNotificationsData {
  notifications: {
    items: NotificationRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useNotifications — Fetches the list of notifications for the current user.
 *
 * @param params — Optional filters:
 *   unreadOnly — if true, only return unread notifications
 *
 * @returns
 *   notifications — Array of NotificationRecord (empty while loading)
 *   isLoading     — True during the initial fetch
 *   isError       — True if the query failed
 *   error         — The ApolloError object (null if no error)
 *   stats         — { total, unread, read }
 */
export function useNotifications(params?: { unreadOnly?: boolean }) {
  const variables: Record<string, unknown> = { limit: 100 }
  if (params?.unreadOnly) variables.unreadOnly = true

  const { data, loading, error } = useQuery<GetNotificationsData>(
    GET_NOTIFICATIONS,
    { variables }
  )

  const notifications = data?.notifications?.items ?? []

  const stats = useMemo<NotificationStats>(() => ({
    total: notifications.length,
    unread: notifications.filter((n) => !n.readAt).length,
    read: notifications.filter((n) => !!n.readAt).length,
  }), [notifications])

  return {
    notifications,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useMarkNotificationRead — Marks a single notification as read.
 * Sets readAt to the current timestamp server-side.
 */
export function useMarkNotificationRead() {
  const [markRead, { loading }] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [{ query: GET_NOTIFICATIONS }],
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
 * useMarkAllNotificationsRead — Marks all unread notifications as read.
 */
export function useMarkAllNotificationsRead() {
  const [markAll, { loading }] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [{ query: GET_NOTIFICATIONS }],
  })

  const mutate = useCallback(() => {
    return markAll()
  }, [markAll])

  return { mutate, isPending: loading }
}
