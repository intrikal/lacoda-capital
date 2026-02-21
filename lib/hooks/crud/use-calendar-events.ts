"use client"

import { useCallback } from "react"
import { useCrudState } from "./use-crud-state"
import { getCalendarEvents } from "@/lib/services/calendar.service"
import type { CalendarEvent } from "@/lib/mock/types"

function generateId(): string {
  return `cal-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateCalendarEventInput = Omit<CalendarEvent, "id">

export function useCalendarEvents() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<CalendarEvent>(getCalendarEvents)

  const addEvent = useCallback(
    (input: CreateCalendarEventInput): CalendarEvent => {
      const newEvent: CalendarEvent = {
        ...input,
        id: generateId(),
      }
      add(newEvent)
      return newEvent
    },
    [add]
  )

  return {
    events: data,
    isLoading,
    addEvent,
    updateEvent: update,
    deleteEvent: remove,
    getEventById: getById,
  }
}
