"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar-event.actions"
import type { CalendarEventRecord } from "@/lib/types"
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/lib/validations/calendar-event.schema"

export type { CalendarEventRecord }
export type CalendarEventType = "meeting" | "payment" | "dividend" | "deadline" | "document" | "call"

export function useCalendarEvents(params?: {
  clientId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}) {
  const [events, setEvents] = useState<CalendarEventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getCalendarEvents(params)
      setEvents(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.type, params?.dateFrom, params?.dateTo])

  useEffect(() => { load() }, [load])

  return {
    events,
    isLoading,
    isError: !!error,
    error,
    refetch: load,
  }
}

export function useCreateCalendarEvent() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateCalendarEventInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createCalendarEvent(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateCalendarEvent() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateCalendarEventInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateCalendarEvent(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteCalendarEvent() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteCalendarEvent(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
