/**
 * ============================================================================
 * FILE: app/db/schema/calendar_events.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Drizzle ORM table definition for calendar events.
 *
 *   A "calendar event" is a scheduled entry — meetings, payment due dates,
 *   dividend payouts, deadlines, document signings, or calls.
 *
 * TABLE: calendar_events
 *   id              — UUID primary key (auto-generated)
 *   orgId           — FK to orgs.id (multi-tenant isolation, CASCADE)
 *   clientId        — optional FK to clients.id (SET NULL)
 *   title           — event name (required)
 *   type            — calendar_event_type enum (meeting | payment | ...)
 *   date            — ISO date string "YYYY-MM-DD" (stored as text for simplicity)
 *   time            — optional time string "HH:MM" or "9:00 AM"
 *   endTime         — optional end time string
 *   location        — optional location/venue
 *   amount          — optional dollar amount (for payment/dividend events)
 *   description     — optional event details
 *   attendees       — optional JSON array of attendee names
 *   reminder        — boolean flag for reminders (default true)
 *   metadata        — JSONB for extensible fields
 *   createdAt       — auto-set on insert
 *   updatedAt       — auto-set on insert (updated manually in resolver)
 *
 * RELATIONSHIPS:
 *   orgs          ← calendar_events.orgId    (one-to-many, CASCADE)
 *   clients       ← calendar_events.clientId (one-to-many, SET NULL)
 *
 * CONSUMERS:
 *   lib/graphql/resolvers/calendar-event.ts  — CRUD resolver
 *   lib/hooks/crud/use-calendar-events.ts    — React hooks
 */

import { pgTable, uuid, text, boolean, doublePrecision, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import type { InferSelectModel, InferInsertModel } from "drizzle-orm"
import { orgs } from "./orgs"
import { clients } from "./clients"
import { calendarEventTypeEnum } from "./00_enums"

// ─── METADATA TYPE ─────────────────────────────────────────────────────────

/** Extensible metadata for calendar events. */
export interface CalendarEventMetadata {
  [key: string]: unknown
}

// ─── TABLE ─────────────────────────────────────────────────────────────────

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    type: calendarEventTypeEnum("type").notNull().default("meeting"),
    date: text("date").notNull(),
    time: text("time"),
    endTime: text("end_time"),
    location: text("location"),
    amount: doublePrecision("amount"),
    description: text("description"),
    attendees: jsonb("attendees").$type<string[]>().default([]),
    reminder: boolean("reminder").notNull().default(true),
    metadata: jsonb("metadata").$type<CalendarEventMetadata>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("calendar_events_org_id_idx").on(table.orgId),
    index("calendar_events_client_id_idx").on(table.clientId),
    index("calendar_events_date_idx").on(table.date),
    index("calendar_events_type_idx").on(table.type),
  ]
)

// ─── RELATIONS ─────────────────────────────────────────────────────────────

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  org: one(orgs, {
    fields: [calendarEvents.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [calendarEvents.clientId],
    references: [clients.id],
  }),
}))

// ─── INFERRED TYPES ────────────────────────────────────────────────────────

export type CalendarEvent = InferSelectModel<typeof calendarEvents>
export type NewCalendarEvent = InferInsertModel<typeof calendarEvents>
