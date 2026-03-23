"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notification.actions"
import type { NotificationRecord } from "@/lib/types"

export type { NotificationRecord }

export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "document_uploaded"
  | "document_expiring"
  | "document_requested"
  | "report_ready"
  | "compliance_alert"
  | "system"

export interface NotificationStats {
  total: number
  unread: number
  read: number
}

export function useNotifications(params?: { unreadOnly?: boolean }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getNotifications({ unreadOnly: params?.unreadOnly, limit: 100 })
      setNotifications(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [params?.unreadOnly])

  useEffect(() => { load() }, [load])

  const stats = useMemo<NotificationStats>(() => ({
    total: notifications.length,
    unread: notifications.filter((n) => !n.readAt).length,
    read: notifications.filter((n) => !!n.readAt).length,
  }), [notifications])

  return {
    notifications,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useMarkNotificationRead() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await markNotificationRead(id)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useMarkAllNotificationsRead() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await markAllNotificationsRead()
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}
