/**
 * ============================================================================
 * FILE: lib/validations/calendar-event.schema.ts
 * ============================================================================
 *
 * Zod validation schemas for calendar event creation and update.
 *
 * CONSUMERS:
 *   lib/graphql/resolvers/calendar-event.ts — validates mutation input
 */

import { z } from "zod"

const calendarEventTypes = [
  "meeting",
  "payment",
  "dividend",
  "deadline",
  "document",
  "call",
] as const

/**
 * createCalendarEventSchema — Validates input for creating a calendar event.
 *
 * Required: title, type, date
 * Optional: clientId, time, endTime, location, amount, description,
 *           attendees, reminder, metadata
 */
export const createCalendarEventSchema = z.object({
  clientId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  type: z.enum(calendarEventTypes),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  reminder: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>

/**
 * updateCalendarEventSchema — All fields optional for partial updates.
 */
export const updateCalendarEventSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).optional(),
  type: z.enum(calendarEventTypes).optional(),
  date: z.string().min(1).optional(),
  time: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  attendees: z.array(z.string()).optional(),
  reminder: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>
