"use server"

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { calendarEvents } from "@/app/db/schema"
import { asc, and, gte, lte, eq, isNull } from "drizzle-orm"
import type { CalendarEvent, CalendarEventType } from "@/lib/types/mock"

/** Map a DB calendar_events row to the CalendarEvent mock type shape. */
function toCalendarEvent(row: typeof calendarEvents.$inferSelect): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    type: row.type as CalendarEventType,
    date: row.date,
    time: row.time ?? undefined,
    endTime: row.endTime ?? undefined,
    location: row.location ?? undefined,
    amount: row.amount ?? undefined,
    description: row.description ?? undefined,
    attendees: (row.attendees as string[]) ?? undefined,
    reminder: row.reminder,
  }
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(isNull(calendarEvents.deletedAt))
    .orderBy(asc(calendarEvents.date))
  return rows.map(toCalendarEvent)
}

export async function getCalendarEventsByType(type: CalendarEventType): Promise<CalendarEvent[]> {
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.type, type), isNull(calendarEvents.deletedAt)))
    .orderBy(asc(calendarEvents.date))
  return rows.map(toCalendarEvent)
}

export async function getUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  const nowStr = now.toISOString().split("T")[0]
  const cutoffStr = cutoff.toISOString().split("T")[0]
  // date is stored as text "YYYY-MM-DD" — use string comparison
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        gte(calendarEvents.date, nowStr),
        lte(calendarEvents.date, cutoffStr),
        isNull(calendarEvents.deletedAt),
      ),
    )
    .orderBy(asc(calendarEvents.date))
  return rows.map(toCalendarEvent)
}

export async function getCalendarSummary() {
  const upcoming = await getUpcomingEvents(7)
  const payments = upcoming.filter((e) => e.type === "payment")
  const dividends = upcoming.filter((e) => e.type === "dividend")
  const meetings = upcoming.filter((e) => e.type === "meeting")
  const deadlines = upcoming.filter((e) => e.type === "deadline")
  return {
    upcomingCount: upcoming.length,
    paymentsTotal: payments.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    dividendsTotal: dividends.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    meetingCount: meetings.length,
    deadlineCount: deadlines.length,
  }
}
