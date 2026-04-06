/**
 * Personal Google Calendar Helper
 *
 * This is separate from lib/integrations/google-calendar.ts, which handles
 * per-org OAuth stored in the database. This module uses env vars to create
 * events on YOUR personal calendar when you approve a booking request.
 *
 * ── ONE-TIME SETUP ───────────────────────────────────────────────────────────
 *
 * You need a refresh token scoped to Google Calendar. The easiest way:
 *
 *   1. Go to https://developers.google.com/oauthplayground
 *   2. Click the gear icon (top right) → check "Use your own OAuth credentials"
 *   3. Enter your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 *   4. In the left panel, find "Calendar API v3" → select:
 *        https://www.googleapis.com/auth/calendar.events
 *   5. Click "Authorize APIs" → sign in with your personal Google account
 *   6. Click "Exchange authorization code for tokens"
 *   7. Copy the "Refresh token" value
 *   8. Add to your Vercel env vars (and .env.local):
 *        PERSONAL_GOOGLE_REFRESH_TOKEN=<paste here>
 *        PERSONAL_GOOGLE_CALENDAR_ID=primary
 *
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are already in your env.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const REFRESH_TOKEN = process.env.PERSONAL_GOOGLE_REFRESH_TOKEN ?? ""
const CALENDAR_ID = process.env.PERSONAL_GOOGLE_CALENDAR_ID ?? "primary"

export function isPersonalCalendarConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN)
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google token refresh failed: ${error}`)
  }

  const data = await res.json()
  return data.access_token as string
}

export interface BookingEventInput {
  summary: string       // e.g. "Call with Jane Smith"
  description?: string  // reason for the call
  startDateTime: string // ISO 8601, e.g. "2026-04-01T14:00:00-05:00"
  endDateTime: string   // ISO 8601
  attendeeEmail: string // requester's email — they get a calendar invite
  timeZone?: string     // defaults to America/New_York
}

/**
 * Create an event on your personal Google Calendar.
 * Returns the created event's Google ID.
 */
export async function createBookingEvent(
  input: BookingEventInput,
): Promise<string> {
  const accessToken = await getAccessToken()

  const body = {
    summary: input.summary,
    description: input.description,
    start: {
      dateTime: input.startDateTime,
      timeZone: input.timeZone ?? "America/New_York",
    },
    end: {
      dateTime: input.endDateTime,
      timeZone: input.timeZone ?? "America/New_York",
    },
    attendees: [{ email: input.attendeeEmail }],
    // Sends email invites to attendees automatically
    sendUpdates: "all",
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
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
  return created.id as string
}

/**
 * Build ISO 8601 end dateTime from a start dateTime + duration in minutes.
 */
export function buildEndDateTime(
  startIso: string,
  durationMinutes: number,
): string {
  const start = new Date(startIso)
  start.setMinutes(start.getMinutes() + durationMinutes)
  return start.toISOString()
}
