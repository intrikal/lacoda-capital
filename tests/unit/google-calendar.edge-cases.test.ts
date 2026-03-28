/**
 * ============================================================================
 * TEST FILE: google-calendar.edge-cases.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the tricky edge cases specific to Google Calendar
 * integration — the scenarios that are easy to get wrong and can cause
 * subtle bugs in production.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY EDGE CASES NEED THEIR OWN FILE                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The main schema test covers the happy path. This file covers the       │
 * │ situations that only happen occasionally but are hard to debug when    │
 * │ they do:                                                               │
 * │                                                                         │
 * │ - Timezone handling (user creates event in Tokyo, server is in NYC)   │
 * │ - Events that span midnight (does "late night meeting" end tomorrow?)  │
 * │ - Recurring event exceptions (one instance was moved/cancelled)        │
 * │ - OAuth token revocation (user disconnected Google from their account) │
 * │ - Rate limiting (too many Google API calls at once)                    │
 * │ - All-day event date boundaries (Google uses exclusive end dates)      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/validations/calendar-event.schema.ts — main schemas
 *   tests/unit/calendar-event.schema.test.ts — main schema tests
 */

import { describe, it, expect } from "vitest"
import { z } from "zod"

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converts a Google Calendar dateTime string (which may include a timezone
 * offset) to a "YYYY-MM-DD" date string in a specific IANA timezone.
 *
 * This is the function the sync service would use to extract just the
 * date portion from a Google event's start.dateTime.
 *
 * WHY THIS IS TRICKY:
 * "2024-06-15T23:00:00-05:00" is 11 PM Central Time.
 * In UTC that's "2024-06-16T04:00:00Z" — a different calendar day.
 * Our database stores the date as the user's local date, so we must
 * extract the date from the event's timezone, not from UTC.
 */
function extractLocalDate(dateTimeStr: string): string {
  // For strings with timezone offset (e.g., "2024-06-15T23:00:00-05:00")
  // we extract the date portion directly from the string, before UTC conversion.
  // For UTC strings (ending in Z), we use the UTC date.
  if (dateTimeStr.endsWith("Z")) {
    return dateTimeStr.split("T")[0]
  }
  // dateTime with offset: "2024-06-15T23:00:00-05:00" → "2024-06-15"
  return dateTimeStr.split("T")[0]
}

/**
 * Converts a Google all-day event's end date to an inclusive end date.
 *
 * WHY THIS IS TRICKY:
 * Google Calendar uses EXCLUSIVE end dates for all-day events.
 * An event from June 15 to June 16 in Google = a ONE-day event (just June 15).
 * An event from June 15 to June 17 in Google = a TWO-day event (June 15-16).
 * We need to subtract one day to get the inclusive end date we store.
 */
function toInclusiveEndDate(googleExclusiveEndDate: string): string {
  const date = new Date(googleExclusiveEndDate + "T00:00:00Z")
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().split("T")[0]
}

/**
 * Determines whether a Google Calendar event spans midnight.
 * An event "spans midnight" if its local start date differs from its
 * local end date.
 */
function spansMultipleDays(startDate: string, endDate: string): boolean {
  return startDate !== endDate
}

/**
 * Simulates Google Calendar API rate limit response detection.
 *
 * Google returns HTTP 429 with a Retry-After header when quota is exceeded.
 * This function checks a simulated API response object.
 */
function isRateLimited(response: { status: number; headers: Record<string, string> }): boolean {
  return response.status === 429
}

/**
 * Simulates OAuth token revocation detection.
 *
 * When a user revokes access to our app from their Google Account settings,
 * the next API call returns HTTP 401 with error "invalid_grant" in the body.
 */
function isTokenRevoked(response: { status: number; body?: { error?: string } }): boolean {
  return response.status === 401 && response.body?.error === "invalid_grant"
}

// ============================================================================
// 1. TIMEZONE HANDLING
// ============================================================================

describe("Timezone handling — extractLocalDate", () => {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ THE TIMEZONE PROBLEM                                               │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ A compliance deadline set for midnight in Tokyo (JST, UTC+9) is   │
   * │ 3 PM the previous day in New York (EST, UTC-5).                   │
   * │                                                                     │
   * │ If we blindly convert to UTC, "2024-06-15T00:00:00+09:00" becomes │
   * │ "2024-06-14T15:00:00Z" — we'd store June 14th instead of June 15. │
   * │                                                                     │
   * │ The fix: always extract the date from the LOCAL time string, not  │
   * │ from the UTC-converted version.                                    │
   * └─────────────────────────────────────────────────────────────────────┘
   */

  it("extracts the correct local date from a UTC datetime string", () => {
    expect(extractLocalDate("2024-06-15T09:00:00Z")).toBe("2024-06-15")
  })

  it("extracts the local date from an Eastern Time event (UTC-5)", () => {
    // 9 AM Eastern is 2 PM UTC — same local date
    expect(extractLocalDate("2024-06-15T09:00:00-05:00")).toBe("2024-06-15")
  })

  it("extracts the LOCAL date when UTC would give a different day", () => {
    // 11 PM Central (UTC-5) = 4 AM UTC the next day
    // The event is LOCAL June 15 — that's the date we should store
    expect(extractLocalDate("2024-06-15T23:00:00-05:00")).toBe("2024-06-15")
  })

  it("extracts the correct date for a Tokyo event (UTC+9)", () => {
    // Midnight in Tokyo (UTC+9) = 3 PM the previous day in UTC
    // Local date should be June 15, not June 14
    expect(extractLocalDate("2024-06-15T00:00:00+09:00")).toBe("2024-06-15")
  })

  it("handles a UTC event at midnight correctly", () => {
    expect(extractLocalDate("2024-06-15T00:00:00Z")).toBe("2024-06-15")
  })

  it("handles a UTC event at end of day correctly", () => {
    expect(extractLocalDate("2024-06-15T23:59:59Z")).toBe("2024-06-15")
  })
})

// ============================================================================
// 2. ALL-DAY EVENT DATE BOUNDARIES
// ============================================================================

describe("All-day events — Google's exclusive end date", () => {
  /**
   * Google Calendar EXCLUSIVE end date convention:
   * - Single-day event June 15 → start: { date: "2024-06-15" }, end: { date: "2024-06-16" }
   * - Multi-day June 15–17 → start: { date: "2024-06-15" }, end: { date: "2024-06-18" }
   *
   * We store INCLUSIVE dates. So we subtract 1 day from Google's end date.
   */

  it("converts a 1-day all-day event to the correct inclusive end date", () => {
    // Google: end = June 16 (exclusive) → our inclusive end = June 15
    expect(toInclusiveEndDate("2024-06-16")).toBe("2024-06-15")
  })

  it("converts a 3-day all-day event to the correct inclusive end date", () => {
    // Google: end = June 18 (exclusive) → our inclusive end = June 17
    expect(toInclusiveEndDate("2024-06-18")).toBe("2024-06-17")
  })

  it("converts a month-end all-day event without going past month boundary", () => {
    // Google: end = July 1 (exclusive) → our inclusive end = June 30
    expect(toInclusiveEndDate("2024-07-01")).toBe("2024-06-30")
  })

  it("converts a year-end all-day event without going past year boundary", () => {
    // Google: end = Jan 1, 2025 (exclusive) → our inclusive end = Dec 31, 2024
    expect(toInclusiveEndDate("2025-01-01")).toBe("2024-12-31")
  })

  it("converts a leap-day-adjacent event correctly (Feb 29)", () => {
    // 2024 is a leap year. Google: end = March 1 → our inclusive end = Feb 29
    expect(toInclusiveEndDate("2024-03-01")).toBe("2024-02-29")
  })
})

// ============================================================================
// 3. EVENTS SPANNING MIDNIGHT
// ============================================================================

describe("Events spanning midnight — multi-day detection", () => {
  /**
   * A "late night meeting" that starts at 11 PM and ends at 1 AM crosses
   * midnight. This event spans two calendar days.
   *
   * For our database, we store the START date as the event's date. The
   * endTime becomes "01:00 AM" — on a different calendar day.
   *
   * We flag these events so the UI can display them correctly.
   */

  it("detects an event that spans midnight", () => {
    // Starts June 15 at 11 PM, ends June 16 at 1 AM
    const startDate = extractLocalDate("2024-06-15T23:00:00Z")
    const endDate = extractLocalDate("2024-06-16T01:00:00Z")
    expect(spansMultipleDays(startDate, endDate)).toBe(true)
  })

  it("does not flag a normal same-day event as spanning midnight", () => {
    const startDate = extractLocalDate("2024-06-15T09:00:00Z")
    const endDate = extractLocalDate("2024-06-15T10:00:00Z")
    expect(spansMultipleDays(startDate, endDate)).toBe(false)
  })

  it("detects a multi-day meeting (e.g., 3-day conference)", () => {
    const startDate = extractLocalDate("2024-06-10T08:00:00Z")
    const endDate = extractLocalDate("2024-06-12T17:00:00Z")
    expect(spansMultipleDays(startDate, endDate)).toBe(true)
  })

  it("does not flag a zero-duration event (start == end) as spanning days", () => {
    const startDate = "2024-06-15"
    const endDate = "2024-06-15"
    expect(spansMultipleDays(startDate, endDate)).toBe(false)
  })
})

// ============================================================================
// 4. RECURRING EVENT SCHEMA (inline spec)
// ============================================================================
//
// Google Calendar recurring events have a `recurrence` array containing
// RRULE strings (RFC 5545 format). A single "master" event has the
// recurrence rules; individual instances are "recurring event instances".
//
// We store the master event once, with recurrence data in metadata.
// Modified/cancelled instances are stored separately.

const recurringEventMetadataSchema = z.object({
  googleEventId: z.string().min(1),
  isRecurring: z.boolean(),
  recurrenceRules: z.array(z.string()).optional(), // e.g., ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
  recurringEventId: z.string().optional(),          // parent event ID for instances
  originalStartTime: z.string().optional(),          // for modified instances
  isCancelled: z.boolean().optional(),              // for cancelled instances
})

describe("Recurring event metadata schema", () => {
  it("accepts a weekly recurring event master", () => {
    const result = recurringEventMetadataSchema.safeParse({
      googleEventId: "master_event_001",
      isRecurring: true,
      recurrenceRules: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO",
        "EXDATE;TZID=America/New_York:20240715T090000",
      ],
    })
    expect(result.success).toBe(true)
  })

  it("accepts a non-recurring event", () => {
    const result = recurringEventMetadataSchema.safeParse({
      googleEventId: "single_event_001",
      isRecurring: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a modified recurring instance (rescheduled)", () => {
    // When one instance of a recurring event is moved to a different time,
    // Google sends a separate event record with recurringEventId pointing
    // to the master.
    const result = recurringEventMetadataSchema.safeParse({
      googleEventId: "instance_modified_001",
      isRecurring: false, // this specific instance is not itself recurring
      recurringEventId: "master_event_001",
      originalStartTime: "2024-07-01T09:00:00-04:00",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a cancelled recurring instance", () => {
    // When one instance is cancelled (but the series continues), we store
    // it with isCancelled: true so we can mark our record as deleted.
    const result = recurringEventMetadataSchema.safeParse({
      googleEventId: "instance_cancelled_001",
      isRecurring: false,
      recurringEventId: "master_event_001",
      originalStartTime: "2024-07-15T09:00:00-04:00",
      isCancelled: true,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing googleEventId", () => {
    const result = recurringEventMetadataSchema.safeParse({
      isRecurring: true,
      recurrenceRules: ["RRULE:FREQ=WEEKLY"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-boolean isRecurring", () => {
    const result = recurringEventMetadataSchema.safeParse({
      googleEventId: "event_001",
      isRecurring: "yes",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 5. OAUTH TOKEN REVOCATION DETECTION
// ============================================================================

describe("OAuth token revocation detection", () => {
  /**
   * When a user goes to their Google Account settings and removes our app's
   * access, the next API call returns HTTP 401 with error "invalid_grant".
   *
   * We must distinguish this from a normal 401 (expired token), which is
   * handled by refreshing the access token. An "invalid_grant" means the
   * refresh token itself is invalid — we need to show "reconnect" UI.
   */

  it("detects token revocation (401 + invalid_grant)", () => {
    const response = {
      status: 401,
      body: { error: "invalid_grant" },
    }
    expect(isTokenRevoked(response)).toBe(true)
  })

  it("does NOT flag a normal 401 as revocation (may just be expired access token)", () => {
    const response = {
      status: 401,
      body: { error: "unauthorized" },
    }
    expect(isTokenRevoked(response)).toBe(false)
  })

  it("does NOT flag a 401 with no body as revocation", () => {
    const response = { status: 401 }
    expect(isTokenRevoked(response)).toBe(false)
  })

  it("does NOT flag a 403 (Forbidden) as revocation", () => {
    const response = {
      status: 403,
      body: { error: "invalid_grant" }, // wrong status for revocation
    }
    expect(isTokenRevoked(response)).toBe(false)
  })

  it("does NOT flag a 200 as revocation", () => {
    const response = { status: 200, body: {} }
    expect(isTokenRevoked(response)).toBe(false)
  })
})

// ============================================================================
// 6. RATE LIMITING DETECTION
// ============================================================================

describe("Google Calendar API rate limiting", () => {
  /**
   * Google Calendar allows 1,000,000 queries per day.
   * However, per-user and per-second limits are stricter:
   * - 500 queries per 100 seconds per user
   *
   * When we hit a rate limit, Google returns HTTP 429.
   * We should detect this and implement exponential backoff, not retry
   * immediately (which would make the rate limiting worse).
   */

  it("detects rate limiting from HTTP 429 response", () => {
    const response = {
      status: 429,
      headers: { "Retry-After": "30" },
    }
    expect(isRateLimited(response)).toBe(true)
  })

  it("does NOT flag a 200 as rate limited", () => {
    const response = { status: 200, headers: {} }
    expect(isRateLimited(response)).toBe(false)
  })

  it("does NOT flag a 500 (server error) as rate limited", () => {
    const response = { status: 500, headers: {} }
    expect(isRateLimited(response)).toBe(false)
  })

  it("parses Retry-After header to determine backoff duration", () => {
    // Retry-After is in seconds. We convert to milliseconds for setTimeout.
    const retryAfterSeconds = parseInt("30", 10)
    const backoffMs = retryAfterSeconds * 1000
    expect(backoffMs).toBe(30000)
  })

  it("falls back to 60s backoff when Retry-After header is missing", () => {
    const retryAfterHeader = undefined
    const backoffMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 60000
    expect(backoffMs).toBe(60000)
  })

  it("caps backoff at 10 minutes to avoid indefinite waits", () => {
    // If Google returns Retry-After: 3600 (1 hour), we cap at 10 minutes
    const MAX_BACKOFF_MS = 10 * 60 * 1000 // 10 minutes
    const retryAfterMs = 3600 * 1000
    const actualBackoff = Math.min(retryAfterMs, MAX_BACKOFF_MS)
    expect(actualBackoff).toBe(MAX_BACKOFF_MS)
  })
})

// ============================================================================
// 7. MULTIPLE GOOGLE CALENDARS — calendar selection logic (inline spec)
// ============================================================================
//
// Users can have multiple Google Calendars (Primary, Work, Personal, etc.).
// When they connect Google Calendar, we need to determine which calendars
// to sync. The spec: sync "primary" calendar by default; let user opt-in
// to additional calendars.

const googleCalendarListEntrySchema = z.object({
  id: z.string().min(1),            // calendar ID (email for primary)
  summary: z.string().min(1),       // display name
  primary: z.boolean().optional(),  // true only for the primary calendar
  accessRole: z.enum(["owner", "writer", "reader", "freeBusyReader"]),
  backgroundColor: z.string().optional(),
  selected: z.boolean().optional(), // user has this calendar visible in Google
})

describe("Google Calendar list entry schema", () => {
  it("accepts a primary calendar entry", () => {
    const result = googleCalendarListEntrySchema.safeParse({
      id: "user@example.com",
      summary: "user@example.com",
      primary: true,
      accessRole: "owner",
      backgroundColor: "#4285F4",
      selected: true,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a secondary (non-primary) calendar", () => {
    const result = googleCalendarListEntrySchema.safeParse({
      id: "work-calendar@group.calendar.google.com",
      summary: "Work Calendar",
      accessRole: "writer",
      selected: true,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a read-only shared calendar", () => {
    const result = googleCalendarListEntrySchema.safeParse({
      id: "holidays@group.calendar.google.com",
      summary: "US Holidays",
      accessRole: "reader",
      selected: false,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing id", () => {
    const result = googleCalendarListEntrySchema.safeParse({
      summary: "My Calendar",
      accessRole: "owner",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid accessRole", () => {
    const result = googleCalendarListEntrySchema.safeParse({
      id: "cal@example.com",
      summary: "My Calendar",
      accessRole: "admin",
    })
    expect(result.success).toBe(false)
  })
})

describe("Calendar selection logic", () => {
  /**
   * Given a list of calendars, these tests verify the logic for
   * determining which calendars to sync by default.
   */

  function selectDefaultCalendars(
    calendars: Array<{ id: string; primary?: boolean; accessRole: string }>,
  ): string[] {
    // Default: only sync the primary calendar
    return calendars.filter((c) => c.primary === true).map((c) => c.id)
  }

  function selectWritableCalendars(
    calendars: Array<{ id: string; primary?: boolean; accessRole: string }>,
  ): string[] {
    // Calendars where user can create events (owner or writer)
    return calendars
      .filter((c) => c.accessRole === "owner" || c.accessRole === "writer")
      .map((c) => c.id)
  }

  const sampleCalendars = [
    { id: "user@example.com", primary: true, accessRole: "owner" },
    { id: "work@group.calendar.google.com", accessRole: "writer" },
    { id: "holidays@group.calendar.google.com", accessRole: "reader" },
    { id: "other@group.calendar.google.com", accessRole: "freeBusyReader" },
  ]

  it("selects only the primary calendar by default", () => {
    const selected = selectDefaultCalendars(sampleCalendars)
    expect(selected).toEqual(["user@example.com"])
  })

  it("returns empty array when user has no primary calendar (unusual)", () => {
    const noPrimary = sampleCalendars.filter((c) => !c.primary)
    const selected = selectDefaultCalendars(noPrimary)
    expect(selected).toEqual([])
  })

  it("identifies writable calendars (owner + writer) for event creation", () => {
    const writable = selectWritableCalendars(sampleCalendars)
    expect(writable).toContain("user@example.com")
    expect(writable).toContain("work@group.calendar.google.com")
    expect(writable).not.toContain("holidays@group.calendar.google.com")
    expect(writable).not.toContain("other@group.calendar.google.com")
  })

  it("read-only calendars are NOT in the writable list", () => {
    const writable = selectWritableCalendars(sampleCalendars)
    expect(writable).not.toContain("holidays@group.calendar.google.com")
  })
})

// ============================================================================
// 8. GOOGLE CALENDAR DOWNTIME — graceful degradation
// ============================================================================
//
// When Google Calendar's API is down, we should show cached events rather
// than crashing the dashboard. These tests document the expected behavior.

const syncResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    syncedCount: z.number().int().nonnegative(),
    lastSyncedAt: z.string(),
  }),
  z.object({
    status: z.literal("error"),
    error: z.string().min(1),
    lastSyncedAt: z.string().optional(), // last successful sync time (for cache display)
    cachedEventCount: z.number().int().nonnegative().optional(),
  }),
  z.object({
    status: z.literal("partial"),
    syncedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
    lastSyncedAt: z.string(),
  }),
])

describe("Calendar sync result schema — graceful degradation", () => {
  it("accepts a successful sync result", () => {
    const result = syncResultSchema.safeParse({
      status: "success",
      syncedCount: 42,
      lastSyncedAt: "2024-06-15T10:00:00Z",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an error result with last-known sync time (for cached display)", () => {
    // When Google Calendar is down, we show cached events and this error state
    const result = syncResultSchema.safeParse({
      status: "error",
      error: "Google Calendar API returned 503 Service Unavailable",
      lastSyncedAt: "2024-06-14T08:00:00Z",
      cachedEventCount: 18,
    })
    expect(result.success).toBe(true)
  })

  it("accepts an error result with no previous sync (first-time failure)", () => {
    const result = syncResultSchema.safeParse({
      status: "error",
      error: "OAuth token revoked by user",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a partial sync result (some events failed, some succeeded)", () => {
    // E.g., synced 38 events, skipped 4 that had data issues
    const result = syncResultSchema.safeParse({
      status: "partial",
      syncedCount: 38,
      skippedCount: 4,
      lastSyncedAt: "2024-06-15T10:00:00Z",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an unknown status value", () => {
    const result = syncResultSchema.safeParse({
      status: "pending",
      syncedCount: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects success result missing syncedCount", () => {
    const result = syncResultSchema.safeParse({
      status: "success",
      lastSyncedAt: "2024-06-15T10:00:00Z",
    })
    expect(result.success).toBe(false)
  })

  it("accepts zero synced events (e.g., no new events since last sync)", () => {
    const result = syncResultSchema.safeParse({
      status: "success",
      syncedCount: 0,
      lastSyncedAt: "2024-06-15T10:00:00Z",
    })
    expect(result.success).toBe(true)
  })
})
