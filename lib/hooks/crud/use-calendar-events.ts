/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-calendar-events.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Calendar pages to the GraphQL API.
 *   Each hook wraps an Apollo Client operation and exposes a simple interface
 *   that page components consume.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Calendar Page                                                     │
 *   │   └── useCalendarEvents()       → fetches events list             │
 *   │   └── useCreateCalendarEvent()  → creates a new event             │
 *   │   └── useUpdateCalendarEvent()  → edits an existing event         │
 *   │   └── useDeleteCalendarEvent()  → removes an event                │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ calendarEventResolvers → Drizzle ORM → PostgreSQL                 │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file previously used useCrudState + mock data from calendar.service.ts.
 *   It has been rewritten to use Apollo Client for real database persistence.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/calendar/page.tsx  (advisor calendar)
 *   - app/(client)/client/calendar/page.tsx  (client portal calendar)
 */

"use client"

import { useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_CALENDAR_EVENTS,
  CREATE_CALENDAR_EVENT,
  UPDATE_CALENDAR_EVENT,
  DELETE_CALENDAR_EVENT,
} from "@/lib/graphql/operations/calendar-event"
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/lib/validations/calendar-event.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * CalendarEventType — The six supported event types.
 */
export type CalendarEventType =
  | "meeting"
  | "payment"
  | "dividend"
  | "deadline"
  | "document"
  | "call"

/**
 * CalendarEventRecord — Shape of a calendar event returned by the GraphQL API.
 * Maps 1:1 to the CALENDAR_EVENT_FIELDS fragment.
 */
export interface CalendarEventRecord {
  id: string
  orgId: string
  clientId: string | null
  title: string
  type: CalendarEventType
  date: string
  time: string | null
  endTime: string | null
  location: string | null
  amount: number | null
  description: string | null
  attendees: string[] | null
  reminder: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/** Apollo response shape for GET_CALENDAR_EVENTS. */
interface GetCalendarEventsData {
  calendarEvents: {
    items: CalendarEventRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useCalendarEvents — Fetches the list of calendar events.
 *
 * @param params — Optional filters:
 *   clientId — events for a specific client
 *   type     — filter by event type
 *   dateFrom — start date (inclusive)
 *   dateTo   — end date (inclusive)
 *
 * @returns
 *   events    — Array of CalendarEventRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 */
export function useCalendarEvents(params?: {
  clientId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.type) variables.type = params.type
  if (params?.dateFrom) variables.dateFrom = params.dateFrom
  if (params?.dateTo) variables.dateTo = params.dateTo

  const { data, loading, error } = useQuery<GetCalendarEventsData>(
    GET_CALENDAR_EVENTS,
    { variables }
  )

  return {
    events: data?.calendarEvents?.items ?? [],
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
  }
}

/**
 * useCreateCalendarEvent — Mutation hook for creating a new calendar event.
 * Requires role: admin | assistant.
 */
export function useCreateCalendarEvent() {
  const [createEvent, { loading }] = useMutation(CREATE_CALENDAR_EVENT, {
    refetchQueries: [{ query: GET_CALENDAR_EVENTS }],
  })

  const mutate = useCallback(
    (input: CreateCalendarEventInput) => {
      return createEvent({ variables: { input } })
    },
    [createEvent]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateCalendarEvent — Mutation hook for editing a calendar event.
 * Requires role: admin | assistant.
 */
export function useUpdateCalendarEvent() {
  const [updateEvent, { loading }] = useMutation(UPDATE_CALENDAR_EVENT, {
    refetchQueries: [{ query: GET_CALENDAR_EVENTS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateCalendarEventInput }) => {
      return updateEvent({ variables: { id, input } })
    },
    [updateEvent]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteCalendarEvent — Mutation hook for removing a calendar event.
 * Requires role: admin | assistant.
 */
export function useDeleteCalendarEvent() {
  const [deleteEvent, { loading }] = useMutation(DELETE_CALENDAR_EVENT, {
    refetchQueries: [{ query: GET_CALENDAR_EVENTS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteEvent({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteEvent]
  )

  return { mutate, isPending: loading }
}
