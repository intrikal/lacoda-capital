"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getAlerts } from "@/lib/services/alerts.service"
import type { Alert } from "@/lib/mock/types"

export function useAlerts() {
  const { data, isLoading, update, remove, getById } = useCrudState<Alert>(getAlerts)

  const markAsRead = useCallback(
    (id: string) => {
      update(id, { isRead: true })
    },
    [update]
  )

  const dismissAlert = useCallback(
    (id: string) => {
      remove(id)
    },
    [remove]
  )

  const stats = useMemo(() => ({
    total: data.length,
    unread: data.filter((a) => !a.isRead).length,
    critical: data.filter((a) => a.severity === "critical").length,
    warning: data.filter((a) => a.severity === "warning").length,
  }), [data])

  return {
    alerts: data,
    isLoading,
    markAsRead,
    dismissAlert,
    getAlertById: getById,
    stats,
  }
}
