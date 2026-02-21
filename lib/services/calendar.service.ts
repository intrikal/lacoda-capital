// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockCalendarEvents } from "@/lib/mock/data"
import type { CalendarEvent, CalendarEventType } from "@/lib/mock/types"

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  // REAL: return db.query.calendarEvents.findMany({ orderBy: asc(events.date) })
  return mockCalendarEvents
}

export async function getCalendarEventsByType(type: CalendarEventType): Promise<CalendarEvent[]> {
  // REAL: return db.query.calendarEvents.findMany({ where: eq(events.type, type) })
  return mockCalendarEvents.filter((e) => e.type === type)
}

export async function getUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  // REAL: return db.query.calendarEvents.findMany({
  //         where: and(gte(events.date, now), lte(events.date, cutoff)),
  //         orderBy: asc(events.date),
  //       })
  return mockCalendarEvents.filter((e) => {
    const d = new Date(e.date)
    return d >= now && d <= cutoff
  })
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
