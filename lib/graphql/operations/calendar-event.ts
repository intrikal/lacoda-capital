/**
 * ============================================================================
 * FILE: lib/graphql/operations/calendar-event.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for calendar events.
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/calendar-event.ts
 *           → Zod validation
 *           → Drizzle ORM → PostgreSQL (calendar_events table)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-calendar-events.ts — useQuery / useMutation hooks
 */

import { gql } from "@apollo/client"

/**
 * CALENDAR_EVENT_FIELDS — Reusable fragment for standard event fields.
 * Maps 1:1 to columns in the calendar_events table.
 */
export const CALENDAR_EVENT_FIELDS = gql`
  fragment CalendarEventFields on CalendarEvent {
    id
    orgId
    clientId
    title
    type
    date
    time
    endTime
    location
    amount
    description
    attendees
    reminder
    metadata
    createdAt
    updatedAt
  }
`

/**
 * GET_CALENDAR_EVENTS — Paginated, filterable list of events.
 *
 * Variables (all optional):
 *   clientId — filter by client
 *   type     — filter by event type
 *   dateFrom — start date (inclusive)
 *   dateTo   — end date (inclusive)
 *   page     — page number (default 1)
 *   limit    — items per page (default 100)
 */
export const GET_CALENDAR_EVENTS = gql`
  ${CALENDAR_EVENT_FIELDS}
  query GetCalendarEvents(
    $clientId: ID
    $type: String
    $dateFrom: String
    $dateTo: String
    $page: Int
    $limit: Int
  ) {
    calendarEvents(
      clientId: $clientId
      type: $type
      dateFrom: $dateFrom
      dateTo: $dateTo
      page: $page
      limit: $limit
    ) {
      items {
        ...CalendarEventFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_CALENDAR_EVENT — Single event by ID with client relation.
 */
export const GET_CALENDAR_EVENT = gql`
  ${CALENDAR_EVENT_FIELDS}
  query GetCalendarEvent($id: ID!) {
    calendarEvent(id: $id) {
      ...CalendarEventFields
      client {
        id
        displayName
      }
    }
  }
`

/**
 * CREATE_CALENDAR_EVENT — Inserts a new calendar event.
 * Requires role: admin | assistant.
 */
export const CREATE_CALENDAR_EVENT = gql`
  ${CALENDAR_EVENT_FIELDS}
  mutation CreateCalendarEvent($input: CreateCalendarEventInput!) {
    createCalendarEvent(input: $input) {
      ...CalendarEventFields
    }
  }
`

/**
 * UPDATE_CALENDAR_EVENT — Partially updates an existing event.
 * Requires role: admin | assistant.
 */
export const UPDATE_CALENDAR_EVENT = gql`
  ${CALENDAR_EVENT_FIELDS}
  mutation UpdateCalendarEvent($id: ID!, $input: UpdateCalendarEventInput!) {
    updateCalendarEvent(id: $id, input: $input) {
      ...CalendarEventFields
    }
  }
`

/**
 * DELETE_CALENDAR_EVENT — Hard-deletes an event.
 * Requires role: admin | assistant.
 */
export const DELETE_CALENDAR_EVENT = gql`
  mutation DeleteCalendarEvent($id: ID!) {
    deleteCalendarEvent(id: $id)
  }
`
