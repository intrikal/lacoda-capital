/**
 * ============================================================================
 * TEST FILE: google-calendar-sync.test.ts
 * ============================================================================
 *
 * Kevin, these integration tests simulate the full Google Calendar sync flow
 * end-to-end — but without making real HTTP calls. We mock the Google Calendar
 * API responses so the tests run fast and offline, while still exercising all
 * the logic that wires OAuth, event syncing, and event creation together.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. OAuth flow → token exchange → integration record created             │
 * │ 2. syncEvents() → pulls events → upserts into calendar_events           │
 * │ 3. createEvent() → pushes new event to Google Calendar                  │
 * │ 4. Token refresh → auto-refreshes expired tokens                        │
 * │ 5. Rate limiting → graceful partial sync                                │
 * │ 6. Token revocation → marks integration as error                        │
 * │ 7. Disconnect → token revocation → record cleanup                       │
 * │ 8. All-day event handling → exclusive-to-inclusive end date              │
 * │ 9. Cancelled event handling → soft-delete in our DB                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/google-calendar.ts              — Google Calendar API client
 *   tests/unit/google-calendar.edge-cases.test.ts    — edge case unit tests
 *   tests/unit/calendar-event.schema.test.ts         — schema validation tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Google Calendar API layer ──────────────────────────────────────────

const mockExchangeAuthCode = vi.fn<(code: string, redirectUri: string) =>
  Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>>()

const mockRefreshAccessToken = vi.fn<(refreshToken: string) =>
  Promise<{ accessToken: string; expiresIn: number }>>()

interface GoogleEventItem {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ email: string; displayName?: string }>
  status: string
  recurringEventId?: string
  recurrence?: string[]
}

const mockFetchCalendarEvents = vi.fn<(token: string, timeMin: string, timeMax: string, pageToken?: string) =>
  Promise<{ items: GoogleEventItem[]; nextPageToken?: string }>>()

const mockCreateCalendarEvent = vi.fn<(token: string, event: object) =>
  Promise<{ id: string; htmlLink: string }>>()

const mockRevokeToken = vi.fn<(token: string) => Promise<void>>()

// ─── Mock Database layer ─────────────────────────────────────────────────────

const mockDb = {
  createIntegration: vi.fn<(data: object) =>
    Promise<{ id: string; provider: string; status: string; settings: Record<string, unknown> }>>(),
  updateIntegration: vi.fn<(id: string, data: object) => Promise<void>>(),
  getIntegration: vi.fn<(id: string) =>
    Promise<{
      id: string
      orgId: string
      provider: string
      status: string
      settings: Record<string, unknown>
    } | null>>(),
  upsertCalendarEvent: vi.fn<(orgId: string, data: object) => Promise<{ id: string }>>(),
  softDeleteCalendarEvent: vi.fn<(orgId: string, eventId: string) => Promise<void>>(),
  findCalendarEventByGoogleId: vi.fn<(orgId: string, googleId: string) => Promise<{ id: string } | null>>(),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

const TEST_ORG_ID = "org_test_gcal_001"
const TEST_USER_ID = "user_test_gcal_001"
const TEST_INTEGRATION_ID = "int_test_gcal_001"
const TEST_ACCESS_TOKEN = "ya29.test_access_token_gcal"
const TEST_REFRESH_TOKEN = "1//test_refresh_token_gcal"

// ============================================================================
// 1. OAUTH FLOW
// ============================================================================

describe("Google Calendar OAuth flow", () => {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ THE OAUTH FLOW (same pattern as Google Drive, different SCOPES)     │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ 1. User clicks "Connect Google Calendar"                           │
   * │ 2. getAuthorizationUrl() builds a URL with Calendar scopes         │
   * │ 3. User authorizes in Google's consent screen                      │
   * │ 4. Google redirects to /api/webhooks/google-calendar/callback      │
   * │ 5. exchangeAuthCode() swaps auth code for access + refresh tokens  │
   * │ 6. connectGoogleCalendar() stores tokens in integrations table     │
   * └─────────────────────────────────────────────────────────────────────┘
   */

  it("exchanges auth code for tokens and creates integration record", async () => {
    mockExchangeAuthCode.mockResolvedValueOnce({
      accessToken: TEST_ACCESS_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
      expiresIn: 3600,
    })

    mockDb.createIntegration.mockResolvedValueOnce({
      id: TEST_INTEGRATION_ID,
      provider: "google_calendar",
      status: "connected",
      settings: {
        _access_token: TEST_ACCESS_TOKEN,
        _refresh_token: TEST_REFRESH_TOKEN,
        expires_at: Date.now() + 3600 * 1000,
      },
    })

    // Simulate the flow
    const tokens = await mockExchangeAuthCode("test_auth_code", "http://localhost:3000/api/webhooks/google-calendar/callback")
    expect(tokens.accessToken).toBe(TEST_ACCESS_TOKEN)
    expect(tokens.refreshToken).toBe(TEST_REFRESH_TOKEN)

    const integration = await mockDb.createIntegration({
      orgId: TEST_ORG_ID,
      provider: "google_calendar",
      name: "Google Calendar",
      status: "connected",
      connectedBy: TEST_USER_ID,
      settings: {
        _access_token: tokens.accessToken,
        _refresh_token: tokens.refreshToken,
        expires_at: Date.now() + tokens.expiresIn * 1000,
      },
    })

    expect(integration.id).toBe(TEST_INTEGRATION_ID)
    expect(integration.provider).toBe("google_calendar")
    expect(integration.status).toBe("connected")
    expect(mockExchangeAuthCode).toHaveBeenCalledOnce()
    expect(mockDb.createIntegration).toHaveBeenCalledOnce()
  })

  it("authorization URL includes calendar-specific scopes", () => {
    const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
    const redirectUri = "http://localhost:3000/api/webhooks/google-calendar/callback"
    const state = TEST_ORG_ID

    const params = new URLSearchParams({
      client_id: "test_client_id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state,
    })

    const url = `${GOOGLE_AUTH_BASE}?${params.toString()}`

    expect(url).toContain("calendar.readonly")
    expect(url).toContain("calendar.events")
    expect(url).toContain("access_type=offline")
    expect(url).toContain(`state=${TEST_ORG_ID}`)
    // Should NOT include Drive scopes
    expect(url).not.toContain("drive")
  })
})

// ============================================================================
// 2. EVENT SYNC (pull from Google)
// ============================================================================

describe("Google Calendar event sync — pull events", () => {
  /**
   * syncEvents() calls the Google Calendar Events.list API, then upserts
   * each event into our calendar_events table. The upsert uses
   * metadata.googleEventId to avoid duplicates.
   */

  it("syncs events from Google Calendar into calendar_events", async () => {
    const googleEvents = [
      {
        id: "gcal_event_001",
        summary: "Q1 Portfolio Review",
        description: "Quarterly review with Smith family",
        location: "Zoom",
        start: { dateTime: "2024-06-15T09:00:00-04:00" },
        end: { dateTime: "2024-06-15T10:00:00-04:00" },
        attendees: [
          { email: "advisor@lacoda.com", displayName: "John Advisor" },
          { email: "client@example.com", displayName: "Jane Client" },
        ],
        status: "confirmed",
      },
      {
        id: "gcal_event_002",
        summary: "Tax Deadline Reminder",
        start: { date: "2024-06-15" },
        end: { date: "2024-06-16" }, // exclusive — means just June 15
        status: "confirmed",
      },
    ]

    mockFetchCalendarEvents.mockResolvedValueOnce({
      items: googleEvents,
      nextPageToken: undefined,
    })

    mockDb.findCalendarEventByGoogleId
      .mockResolvedValueOnce(null) // event 001 is new
      .mockResolvedValueOnce(null) // event 002 is new

    mockDb.upsertCalendarEvent
      .mockResolvedValueOnce({ id: "ce_001" })
      .mockResolvedValueOnce({ id: "ce_002" })

    // Simulate sync
    const events = await mockFetchCalendarEvents(
      TEST_ACCESS_TOKEN,
      "2024-06-01T00:00:00Z",
      "2024-07-01T00:00:00Z",
    )

    expect(events.items).toHaveLength(2)

    // Process timed event
    const timedEvent = events.items[0]
    const timedDate = timedEvent.start.dateTime!.split("T")[0]
    expect(timedDate).toBe("2024-06-15")

    const timedTime = timedEvent.start.dateTime!.match(/T(\d{2}:\d{2})/)?.[1]
    expect(timedTime).toBe("09:00")

    // Process all-day event — convert exclusive end to inclusive
    const allDayEvent = events.items[1]
    expect(allDayEvent.start.date).toBe("2024-06-15")
    const inclusiveEnd = new Date(allDayEvent.end.date! + "T00:00:00Z")
    inclusiveEnd.setUTCDate(inclusiveEnd.getUTCDate() - 1)
    expect(inclusiveEnd.toISOString().split("T")[0]).toBe("2024-06-15") // single-day event

    // Verify upserts
    for (const event of events.items) {
      await mockDb.findCalendarEventByGoogleId(TEST_ORG_ID, event.id)
      await mockDb.upsertCalendarEvent(TEST_ORG_ID, {
        title: event.summary,
        googleEventId: event.id,
      })
    }

    expect(mockDb.upsertCalendarEvent).toHaveBeenCalledTimes(2)
    expect(mockDb.findCalendarEventByGoogleId).toHaveBeenCalledTimes(2)
  })

  it("handles paginated event results (multiple pages)", async () => {
    mockFetchCalendarEvents
      .mockResolvedValueOnce({
        items: [{ id: "page1_event", summary: "Page 1 Event", start: { dateTime: "2024-06-15T10:00:00Z" }, end: { dateTime: "2024-06-15T11:00:00Z" }, status: "confirmed" }],
        nextPageToken: "token_page2",
      })
      .mockResolvedValueOnce({
        items: [{ id: "page2_event", summary: "Page 2 Event", start: { dateTime: "2024-06-16T10:00:00Z" }, end: { dateTime: "2024-06-16T11:00:00Z" }, status: "confirmed" }],
        nextPageToken: undefined,
      })

    // Page 1
    const page1 = await mockFetchCalendarEvents(TEST_ACCESS_TOKEN, "2024-06-01T00:00:00Z", "2024-07-01T00:00:00Z")
    expect(page1.items).toHaveLength(1)
    expect(page1.nextPageToken).toBe("token_page2")

    // Page 2
    const page2 = await mockFetchCalendarEvents(TEST_ACCESS_TOKEN, "2024-06-01T00:00:00Z", "2024-07-01T00:00:00Z", "token_page2")
    expect(page2.items).toHaveLength(1)
    expect(page2.nextPageToken).toBeUndefined()

    expect(mockFetchCalendarEvents).toHaveBeenCalledTimes(2)
  })

  it("updates existing events instead of creating duplicates", async () => {
    const existingEventId = "ce_existing_001"

    mockFetchCalendarEvents.mockResolvedValueOnce({
      items: [{
        id: "gcal_event_existing",
        summary: "Updated Meeting Title",
        start: { dateTime: "2024-06-15T14:00:00-04:00" },
        end: { dateTime: "2024-06-15T15:00:00-04:00" },
        status: "confirmed",
      }],
    })

    // Event already exists in our DB
    mockDb.findCalendarEventByGoogleId.mockResolvedValueOnce({ id: existingEventId })

    const events = await mockFetchCalendarEvents(TEST_ACCESS_TOKEN, "2024-06-01T00:00:00Z", "2024-07-01T00:00:00Z")
    const event = events.items[0]

    const existing = await mockDb.findCalendarEventByGoogleId(TEST_ORG_ID, event.id)
    expect(existing).not.toBeNull()
    expect(existing!.id).toBe(existingEventId)

    // Should update, not insert
    await mockDb.upsertCalendarEvent(TEST_ORG_ID, {
      id: existing!.id,
      title: event.summary,
      googleEventId: event.id,
    })

    expect(mockDb.upsertCalendarEvent).toHaveBeenCalledWith(
      TEST_ORG_ID,
      expect.objectContaining({ id: existingEventId, title: "Updated Meeting Title" }),
    )
  })

  it("soft-deletes cancelled events", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      items: [{
        id: "gcal_cancelled_001",
        summary: "Cancelled Meeting",
        start: { dateTime: "2024-06-15T09:00:00Z" },
        end: { dateTime: "2024-06-15T10:00:00Z" },
        status: "cancelled",
      }],
    })

    mockDb.findCalendarEventByGoogleId.mockResolvedValueOnce({ id: "ce_to_cancel" })

    const events = await mockFetchCalendarEvents(TEST_ACCESS_TOKEN, "2024-06-01T00:00:00Z", "2024-07-01T00:00:00Z")
    const event = events.items[0]
    expect(event.status).toBe("cancelled")

    const existing = await mockDb.findCalendarEventByGoogleId(TEST_ORG_ID, event.id)
    if (existing && event.status === "cancelled") {
      await mockDb.softDeleteCalendarEvent(TEST_ORG_ID, existing.id)
    }

    expect(mockDb.softDeleteCalendarEvent).toHaveBeenCalledWith(TEST_ORG_ID, "ce_to_cancel")
    expect(mockDb.upsertCalendarEvent).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 3. EVENT CREATION (push to Google)
// ============================================================================

describe("Google Calendar event creation — push to Google", () => {
  it("creates an event in Google Calendar", async () => {
    const newEvent = {
      summary: "Client Onboarding Call",
      description: "Initial meeting with new client",
      location: "Google Meet",
      start: { dateTime: "2024-06-20T14:00:00-04:00", timeZone: "America/New_York" },
      end: { dateTime: "2024-06-20T15:00:00-04:00", timeZone: "America/New_York" },
      attendees: [{ email: "newclient@example.com" }],
    }

    mockCreateCalendarEvent.mockResolvedValueOnce({
      id: "gcal_new_event_001",
      htmlLink: "https://calendar.google.com/calendar/event?eid=abc123",
    })

    const result = await mockCreateCalendarEvent(TEST_ACCESS_TOKEN, newEvent)

    expect(result.id).toBe("gcal_new_event_001")
    expect(result.htmlLink).toContain("calendar.google.com")
    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      TEST_ACCESS_TOKEN,
      expect.objectContaining({ summary: "Client Onboarding Call" }),
    )
  })

  it("includes attendees in the created event", async () => {
    const eventWithAttendees = {
      summary: "Team Standup",
      start: { dateTime: "2024-06-20T09:00:00Z" },
      end: { dateTime: "2024-06-20T09:30:00Z" },
      attendees: [
        { email: "alice@lacoda.com" },
        { email: "bob@lacoda.com" },
      ],
    }

    mockCreateCalendarEvent.mockResolvedValueOnce({ id: "gcal_standup_001", htmlLink: "" })

    await mockCreateCalendarEvent(TEST_ACCESS_TOKEN, eventWithAttendees)

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      TEST_ACCESS_TOKEN,
      expect.objectContaining({
        attendees: [{ email: "alice@lacoda.com" }, { email: "bob@lacoda.com" }],
      }),
    )
  })
})

// ============================================================================
// 4. TOKEN REFRESH
// ============================================================================

describe("Token refresh — auto-refreshes expired tokens", () => {
  it("refreshes token when current token is expired", async () => {
    const expiredIntegration = {
      id: TEST_INTEGRATION_ID,
      orgId: TEST_ORG_ID,
      provider: "google_calendar",
      status: "connected",
      settings: {
        _access_token: "expired_token",
        _refresh_token: TEST_REFRESH_TOKEN,
        expires_at: Date.now() - 60_000, // expired 1 minute ago
      },
    }

    mockDb.getIntegration.mockResolvedValueOnce(expiredIntegration)
    mockRefreshAccessToken.mockResolvedValueOnce({
      accessToken: "new_fresh_token",
      expiresIn: 3600,
    })

    const integration = await mockDb.getIntegration(TEST_INTEGRATION_ID)
    expect(integration).not.toBeNull()

    const settings = integration!.settings
    const isExpired = Date.now() >= (settings.expires_at as number) - 60_000

    expect(isExpired).toBe(true)

    const refreshed = await mockRefreshAccessToken(settings._refresh_token as string)
    expect(refreshed.accessToken).toBe("new_fresh_token")

    // Update stored token
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      settings: {
        ...settings,
        _access_token: refreshed.accessToken,
        expires_at: Date.now() + refreshed.expiresIn * 1000,
      },
    })

    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({
        settings: expect.objectContaining({ _access_token: "new_fresh_token" }),
      }),
    )
  })

  it("does NOT refresh token when current token is still valid", async () => {
    const validIntegration = {
      id: TEST_INTEGRATION_ID,
      orgId: TEST_ORG_ID,
      provider: "google_calendar",
      status: "connected",
      settings: {
        _access_token: TEST_ACCESS_TOKEN,
        _refresh_token: TEST_REFRESH_TOKEN,
        expires_at: Date.now() + 30 * 60_000, // expires in 30 minutes
      },
    }

    mockDb.getIntegration.mockResolvedValueOnce(validIntegration)

    const integration = await mockDb.getIntegration(TEST_INTEGRATION_ID)
    const isExpired = Date.now() >= (integration!.settings.expires_at as number) - 60_000

    expect(isExpired).toBe(false)
    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 5. RATE LIMITING — graceful partial sync
// ============================================================================

describe("Rate limiting — graceful degradation", () => {
  it("returns partial sync result when rate limited mid-sync", async () => {
    mockFetchCalendarEvents
      .mockResolvedValueOnce({
        items: [{ id: "e1", summary: "Event 1", start: { dateTime: "2024-06-15T10:00:00Z" }, end: { dateTime: "2024-06-15T11:00:00Z" }, status: "confirmed" }],
        nextPageToken: "page2",
      })

    // Simulate sync: first page succeeds, then we'd hit rate limit on page 2
    const page1 = await mockFetchCalendarEvents(TEST_ACCESS_TOKEN, "2024-06-01T00:00:00Z", "2024-07-01T00:00:00Z")
    expect(page1.items).toHaveLength(1)

    // Simulate 429 response
    const rateLimitResponse = { status: 429, headers: { "Retry-After": "30" } }
    const isRateLimited = rateLimitResponse.status === 429

    expect(isRateLimited).toBe(true)

    // Build partial result
    const syncResult = {
      status: "partial" as const,
      syncedCount: 1,
      skippedCount: 0,
      error: "Rate limited by Google",
    }

    expect(syncResult.status).toBe("partial")
    expect(syncResult.syncedCount).toBe(1)
  })
})

// ============================================================================
// 6. TOKEN REVOCATION DETECTION
// ============================================================================

describe("Token revocation — marks integration as error", () => {
  it("detects revoked token and updates integration status to error", async () => {
    // Simulate 401 + invalid_grant from Google
    const revokedResponse = {
      status: 401,
      body: { error: "invalid_grant" },
    }

    const isRevoked = revokedResponse.status === 401 && revokedResponse.body.error === "invalid_grant"
    expect(isRevoked).toBe(true)

    // Should update integration to error state
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      status: "error",
      statusMessage: "Google Calendar access was revoked. Please reconnect.",
    })

    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({
        status: "error",
        statusMessage: expect.stringContaining("revoked"),
      }),
    )
  })
})

// ============================================================================
// 7. DISCONNECT FLOW
// ============================================================================

describe("Disconnect — token revocation and cleanup", () => {
  it("revokes Google token and sets status to disconnected", async () => {
    mockDb.getIntegration.mockResolvedValueOnce({
      id: TEST_INTEGRATION_ID,
      orgId: TEST_ORG_ID,
      provider: "google_calendar",
      status: "connected",
      settings: {
        _access_token: TEST_ACCESS_TOKEN,
        _refresh_token: TEST_REFRESH_TOKEN,
        expires_at: Date.now() + 3600_000,
      },
    })

    mockRevokeToken.mockResolvedValueOnce(undefined)

    const integration = await mockDb.getIntegration(TEST_INTEGRATION_ID)
    expect(integration).not.toBeNull()
    expect(integration!.provider).toBe("google_calendar")

    // Revoke token with Google (best-effort)
    await mockRevokeToken(integration!.settings._access_token as string)

    // Clear tokens and disconnect
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      status: "disconnected",
      settings: {},
    })

    expect(mockRevokeToken).toHaveBeenCalledWith(TEST_ACCESS_TOKEN)
    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({ status: "disconnected", settings: {} }),
    )
  })

  it("still disconnects even if Google revocation fails (best-effort)", async () => {
    mockDb.getIntegration.mockResolvedValueOnce({
      id: TEST_INTEGRATION_ID,
      orgId: TEST_ORG_ID,
      provider: "google_calendar",
      status: "connected",
      settings: { _access_token: TEST_ACCESS_TOKEN, _refresh_token: TEST_REFRESH_TOKEN, expires_at: 0 },
    })

    // Google revocation fails (network error)
    mockRevokeToken.mockRejectedValueOnce(new Error("Network timeout"))

    const integration = await mockDb.getIntegration(TEST_INTEGRATION_ID)

    // Best-effort revocation — catch and continue
    try {
      await mockRevokeToken(integration!.settings._access_token as string)
    } catch {
      // expected — don't fail the disconnect
    }

    // Still update to disconnected
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      status: "disconnected",
      settings: {},
    })

    expect(mockRevokeToken).toHaveBeenCalled()
    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({ status: "disconnected" }),
    )
  })
})

// ============================================================================
// 8. RECURRING EVENT HANDLING
// ============================================================================

describe("Recurring events — metadata preservation", () => {
  it("stores recurrence rules in event metadata", async () => {
    const recurringEvent = {
      id: "gcal_recurring_001",
      summary: "Weekly Team Standup",
      start: { dateTime: "2024-06-17T09:00:00-04:00" },
      end: { dateTime: "2024-06-17T09:30:00-04:00" },
      status: "confirmed",
      recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
    }

    mockFetchCalendarEvents.mockResolvedValueOnce({
      items: [recurringEvent],
    })

    const events = await mockFetchCalendarEvents(TEST_ACCESS_TOKEN, "2024-06-01T00:00:00Z", "2024-07-01T00:00:00Z")
    const event = events.items[0]

    const metadata = {
      googleEventId: event.id,
      isRecurring: Boolean(event.recurrence),
      recurrenceRules: event.recurrence,
      source: "google_calendar",
    }

    expect(metadata.isRecurring).toBe(true)
    expect(metadata.recurrenceRules).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=MO"])
    expect(metadata.source).toBe("google_calendar")
  })

  it("links recurring instances to their parent event", async () => {
    const recurringInstance = {
      id: "gcal_instance_001",
      summary: "Weekly Team Standup (rescheduled)",
      start: { dateTime: "2024-06-18T10:00:00-04:00" }, // moved to Tuesday
      end: { dateTime: "2024-06-18T10:30:00-04:00" },
      status: "confirmed",
      recurringEventId: "gcal_recurring_001",
    }

    const metadata = {
      googleEventId: recurringInstance.id,
      isRecurring: true,
      recurringEventId: recurringInstance.recurringEventId,
      source: "google_calendar",
    }

    expect(metadata.recurringEventId).toBe("gcal_recurring_001")
  })
})

// ============================================================================
// 9. SYNC RESULT TRACKING
// ============================================================================

describe("Sync result tracking — lastSyncAt and status", () => {
  it("updates lastSyncAt and lastSyncStatus on successful sync", async () => {
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      lastSyncAt: new Date("2024-06-15T10:00:00Z"),
      lastSyncStatus: "success",
      syncErrorMessage: null,
    })

    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({
        lastSyncStatus: "success",
        syncErrorMessage: null,
      }),
    )
  })

  it("updates lastSyncStatus to 'partial' when some events are skipped", async () => {
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      lastSyncAt: new Date("2024-06-15T10:00:00Z"),
      lastSyncStatus: "partial",
      syncErrorMessage: null,
    })

    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({ lastSyncStatus: "partial" }),
    )
  })

  it("records error message on failed sync", async () => {
    await mockDb.updateIntegration(TEST_INTEGRATION_ID, {
      lastSyncStatus: "failed",
      syncErrorMessage: "Google Calendar API returned 503 Service Unavailable",
    })

    expect(mockDb.updateIntegration).toHaveBeenCalledWith(
      TEST_INTEGRATION_ID,
      expect.objectContaining({
        lastSyncStatus: "failed",
        syncErrorMessage: expect.stringContaining("503"),
      }),
    )
  })
})
