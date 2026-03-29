/**
 * Google Calendar Integration — Event Sync
 *
 * Google Calendar handles:
 * - Pulling events from a user's Google Calendar into calendar_events
 * - Pushing new events created in our app to Google Calendar
 * - Bi-directional sync with upsert (no duplicates)
 *
 * FLOW:
 *   1. Advisor clicks "Connect Google Calendar" -> OAuth consent flow
 *   2. User authorizes calendar access -> we store refresh token
 *   3. syncEvents() pulls events from Google -> upserts into calendar_events
 *   4. createEvent() pushes a new event to Google Calendar
 *
 * REQUIRED ENV VARS:
 *   GOOGLE_CLIENT_ID       -- already set (shared with Google OAuth sign-in & Drive)
 *   GOOGLE_CLIENT_SECRET   -- already set
 *   (Uses the same Google Cloud project, just adds Calendar scopes)
 */

import { db } from "@/app/db"
import { integrations, calendarEvents } from "@/app/db/schema"
import { eq, and } from "drizzle-orm"

// --- Configuration ------------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ")

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

// --- OAuth --------------------------------------------------------------------

/**
 * Build the Google OAuth URL with Calendar-specific scopes.
 * Separate from Drive OAuth -- requests calendar read + event write access.
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Calendar token exchange failed: ${error}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString(),
  })

  if (!res.ok) throw new Error("Google Calendar token refresh failed")

  const data = await res.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// --- Calendar API Helpers -----------------------------------------------------

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  attendees?: { email: string; displayName?: string; responseStatus?: string }[]
  status: string
  recurringEventId?: string
  recurrence?: string[]
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

/**
 * Get an active access token for a Google Calendar integration.
 * Auto-refreshes if the current token is expired (with 60s buffer).
 */
export async function getAccessToken(integrationId: string): Promise<string> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "google_calendar") {
    throw new Error("Google Calendar integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const expiresAt = settings.expires_at as number
  const refreshToken = settings._refresh_token as string

  // Return existing token if not expired
  if (Date.now() < expiresAt - 60_000) {
    return settings._access_token as string
  }

  // Refresh
  const refreshed = await refreshAccessToken(refreshToken)

  await db
    .update(integrations)
    .set({
      settings: {
        ...settings,
        _access_token: refreshed.accessToken,
        expires_at: Date.now() + refreshed.expiresIn * 1000,
      },
    })
    .where(eq(integrations.id, integrationId))

  return refreshed.accessToken
}

/**
 * Extract a "YYYY-MM-DD" date string from a Google Calendar event start/end.
 * For timed events, extracts the local date (before UTC conversion).
 * For all-day events, uses the date field directly.
 */
function extractLocalDate(
  dateField: { dateTime?: string; date?: string },
): string {
  if (dateField.date) return dateField.date
  if (dateField.dateTime) return dateField.dateTime.split("T")[0]
  throw new Error("Event has neither date nor dateTime")
}

/**
 * Extract a time string ("HH:MM") from a Google Calendar dateTime.
 * Returns null for all-day events.
 */
function extractTime(
  dateField: { dateTime?: string; date?: string },
): string | null {
  if (!dateField.dateTime) return null
  const match = dateField.dateTime.match(/T(\d{2}:\d{2})/)
  return match ? match[1] : null
}

/**
 * Convert Google's exclusive end date (for all-day events) to inclusive.
 * Google: 1-day event June 15 has end.date = "2024-06-16" (exclusive).
 * We store "2024-06-15" (inclusive).
 */
function toInclusiveEndDate(googleExclusiveEndDate: string): string {
  const date = new Date(googleExclusiveEndDate + "T00:00:00Z")
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().split("T")[0]
}

// --- Sync Events --------------------------------------------------------------

export interface SyncDateRange {
  from: Date
  to: Date
}

export interface SyncResult {
  status: "success" | "error" | "partial"
  syncedCount: number
  skippedCount?: number
  error?: string
}

/**
 * Pull events from Google Calendar and upsert into calendar_events.
 *
 * - Fetches events within the given date range
 * - Upserts by googleEventId in metadata (no duplicates)
 * - Cancelled events are soft-deleted
 */
export async function syncEvents(
  integrationId: string,
  dateRange: SyncDateRange,
): Promise<SyncResult> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration) throw new Error("Integration not found")

  const accessToken = await getAccessToken(integrationId)
  const orgId = integration.orgId

  let syncedCount = 0
  let skippedCount = 0
  let pageToken: string | undefined

  try {
    do {
      const params = new URLSearchParams({
        timeMin: dateRange.from.toISOString(),
        timeMax: dateRange.to.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      })

      if (pageToken) params.set("pageToken", pageToken)

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      if (res.status === 429) {
        return { status: "partial", syncedCount, skippedCount, error: "Rate limited by Google" }
      }

      if (res.status === 401) {
        const body = await res.json().catch(() => ({}))
        if (body.error === "invalid_grant") {
          // Token revoked -- mark integration as error
          await db
            .update(integrations)
            .set({ status: "error", statusMessage: "Google Calendar access was revoked. Please reconnect." })
            .where(eq(integrations.id, integrationId))
          return { status: "error", syncedCount: 0, error: "OAuth token revoked" }
        }
      }

      if (!res.ok) {
        const error = await res.text()
        throw new Error(`Google Calendar API error: ${res.status} ${error}`)
      }

      const data: GoogleCalendarListResponse = await res.json()

      for (const event of data.items) {
        try {
          await upsertCalendarEvent(orgId, event)
          syncedCount++
        } catch {
          skippedCount++
        }
      }

      pageToken = data.nextPageToken
    } while (pageToken)

    // Update last sync timestamp
    await db
      .update(integrations)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: skippedCount > 0 ? "partial" : "success",
        syncErrorMessage: null,
      })
      .where(eq(integrations.id, integrationId))

    return skippedCount > 0
      ? { status: "partial", syncedCount, skippedCount }
      : { status: "success", syncedCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error"

    await db
      .update(integrations)
      .set({ lastSyncStatus: "failed", syncErrorMessage: message })
      .where(eq(integrations.id, integrationId))

    return { status: "error", syncedCount, error: message }
  }
}

/**
 * Upsert a single Google Calendar event into our calendar_events table.
 * Uses metadata.googleEventId for dedup.
 */
async function upsertCalendarEvent(
  orgId: string,
  event: GoogleCalendarEvent,
): Promise<void> {
  const isAllDay = Boolean(event.start.date)
  const date = extractLocalDate(event.start)
  const time = extractTime(event.start)
  const endTime = isAllDay
    ? toInclusiveEndDate(event.end.date!)
    : extractTime(event.end)

  const attendeeNames = (event.attendees ?? []).map(
    (a) => a.displayName ?? a.email,
  )

  const metadata = {
    googleEventId: event.id,
    isRecurring: Boolean(event.recurringEventId || event.recurrence),
    ...(event.recurringEventId && { recurringEventId: event.recurringEventId }),
    ...(event.recurrence && { recurrenceRules: event.recurrence }),
    isAllDay,
    source: "google_calendar" as const,
  }

  // Check if event already exists by googleEventId
  const existing = await db.query.calendarEvents.findFirst({
    where: and(
      eq(calendarEvents.orgId, orgId),
      // Search in metadata JSONB for googleEventId
    ),
    // We need a raw SQL check for JSONB, but to keep it simple we'll query
    // all events and filter. For production, add a googleEventId column or index.
  })

  // For now, search by matching metadata googleEventId via a subquery approach.
  // Use a direct SQL approach for the JSONB lookup.
  const { sql } = await import("drizzle-orm")

  const existingRows = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.orgId, orgId),
        sql`${calendarEvents.metadata}->>'googleEventId' = ${event.id}`,
      ),
    )
    .limit(1)

  // Handle cancelled events
  if (event.status === "cancelled") {
    if (existingRows.length > 0) {
      await db
        .update(calendarEvents)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(calendarEvents.id, existingRows[0].id))
    }
    return
  }

  const eventData = {
    orgId,
    title: event.summary ?? "(No title)",
    type: "meeting" as const,
    date,
    time,
    endTime: typeof endTime === "string" ? endTime : null,
    location: event.location ?? null,
    description: event.description ?? null,
    attendees: attendeeNames,
    metadata,
    updatedAt: new Date(),
  }

  if (existingRows.length > 0) {
    // Update existing event
    await db
      .update(calendarEvents)
      .set({ ...eventData, deletedAt: null })
      .where(eq(calendarEvents.id, existingRows[0].id))
  } else {
    // Insert new event
    await db.insert(calendarEvents).values(eventData)
  }
}

// --- Create Event (push to Google) -------------------------------------------

export interface CreateGoogleEventInput {
  summary: string
  description?: string
  location?: string
  startDateTime: string // ISO 8601
  endDateTime: string   // ISO 8601
  timeZone?: string
  attendees?: string[]  // email addresses
}

/**
 * Create an event in Google Calendar and return the created event ID.
 */
export async function createEvent(
  integrationId: string,
  event: CreateGoogleEventInput,
): Promise<string> {
  const accessToken = await getAccessToken(integrationId)

  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.startDateTime,
      timeZone: event.timeZone ?? "America/New_York",
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: event.timeZone ?? "America/New_York",
    },
  }

  if (event.attendees?.length) {
    body.attendees = event.attendees.map((email) => ({ email }))
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to create Google Calendar event: ${error}`)
  }

  const created = await res.json()
  return created.id
}

// --- Connection Management ----------------------------------------------------

/**
 * Store Google Calendar connection after OAuth flow completes.
 */
export async function connectGoogleCalendar(
  orgId: string,
  connectedBy: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "google_calendar",
      name: "Google Calendar",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      settings: {
        _access_token: tokens.accessToken,
        _refresh_token: tokens.refreshToken,
        expires_at: Date.now() + tokens.expiresIn * 1000,
      },
    })
    .returning()

  return integration.id
}

/**
 * Disconnect Google Calendar -- clears tokens and sets status to disconnected.
 */
export async function disconnectGoogleCalendar(
  integrationId: string,
): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "google_calendar") {
    throw new Error("Google Calendar integration not found")
  }

  // Revoke the token with Google (best-effort)
  const settings = integration.settings as Record<string, unknown>
  const accessToken = settings._access_token as string
  if (accessToken) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
      { method: "POST" },
    ).catch(() => {
      // Best-effort revocation -- don't fail the disconnect
    })
  }

  await db
    .update(integrations)
    .set({ status: "disconnected", settings: {} })
    .where(eq(integrations.id, integrationId))
}
