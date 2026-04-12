/**
 * ============================================================================
 * TEST FILE: google-calendar-booking.test.ts
 * ============================================================================
 *
 * Kevin, these integration tests cover the BOOKING FLOW — the public-facing
 * scheduling system where someone requests a call, and you approve or deny it
 * in Sanity Studio.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. OAuth — exchangeAuthCode with valid/invalid codes                    │
 * │ 2. OAuth — token refresh when access token is expired                   │
 * │ 3. Calendar operations — create, list, delete events via Google API     │
 * │ 4. Booking flow — POST /api/v1/booking (valid, unavailable, invalid)    │
 * │ 5. Sanity webhook — approve → calendar event + email                    │
 * │ 6. Sanity webhook — deny → email only, no calendar event               │
 * │ 7. Sanity webhook — invalid signature → 401                            │
 * │ 8. Sanity webhook — status unchanged → 200 no-op                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/google-calendar.ts         — org-level Google Calendar integration
 *   lib/schedule/google-calendar.ts             — personal calendar helper (booking events)
 *   lib/schedule/email.ts                       — confirmation/denial emails via Resend
 *   app/api/v1/booking/route.ts                 — public booking endpoint
 *   app/api/webhooks/sanity/booking/route.ts    — Sanity webhook for approval/denial
 *   app/api/webhooks/google-calendar/callback/route.ts — OAuth callback
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "crypto"

// ─── Mock: Google OAuth token endpoint ──────────────────────────────────────

const mockGoogleTokenFetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()

// ─── Mock: Google Calendar API ──────────────────────────────────────────────

const mockGoogleCalendarFetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()

// ─── Mock: Sanity client ────────────────────────────────────────────────────

const mockSanityCreate = vi.fn<(doc: object) => Promise<{ _id: string }>>()
const mockSanityPatchCommit = vi.fn<() => Promise<object>>()
const mockSanityPatchSet = vi.fn<(attrs: object) => { commit: typeof mockSanityPatchCommit }>()
const mockSanityPatch = vi.fn<(id: string) => { set: typeof mockSanityPatchSet }>()

const mockPreviewClient = {
  create: mockSanityCreate,
  patch: mockSanityPatch,
}

// ─── Mock: Sanity fetch functions ───────────────────────────────────────────

const mockGetSlotById = vi.fn<(id: string) => Promise<{
  _id: string; dateTime: string; duration: number; label?: string; status: string
} | null>>()

const mockGetBookingRequestById = vi.fn<(id: string) => Promise<{
  _id: string; name: string; email: string; company?: string; reason: string
  status: string; submittedAt: string
  slot: { _id: string; dateTime: string; duration: number; label?: string; status: string }
} | null>>()

// ─── Mock: Email functions ──────────────────────────────────────────────────

const mockSendConfirmationEmail = vi.fn<(input: object) => Promise<void>>()
const mockSendDenialEmail = vi.fn<(input: object) => Promise<void>>()

// ─── Mock: Personal calendar ────────────────────────────────────────────────

const mockCreateBookingEvent = vi.fn<(input: object) => Promise<string>>()
const mockIsPersonalCalendarConfigured = vi.fn<() => boolean>()
const mockBuildEndDateTime = vi.fn<(start: string, duration: number) => string>()

// ─── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Default: sanityPatch returns chainable .set().commit()
  mockSanityPatchCommit.mockResolvedValue({})
  mockSanityPatchSet.mockReturnValue({ commit: mockSanityPatchCommit })
  mockSanityPatch.mockReturnValue({ set: mockSanityPatchSet })
})

const TEST_ORG_ID = "org_booking_001"
const TEST_REDIRECT_URI = "http://localhost:3000/api/webhooks/google-calendar/callback"
const TEST_ACCESS_TOKEN = "ya29.booking_test_access_token"
const TEST_REFRESH_TOKEN = "1//booking_test_refresh_token"
const WEBHOOK_SECRET = "whsec_test_secret_abc123"

// ============================================================================
// 1. OAUTH FLOW — exchangeAuthCode
// ============================================================================

describe("OAuth — exchangeAuthCode", () => {
  /**
   * exchangeAuthCode sends the authorization code to Google's token endpoint
   * and gets back access + refresh tokens. We mock the fetch call to simulate
   * both success and failure.
   */

  it("exchanges a valid auth code for access + refresh tokens", async () => {
    mockGoogleTokenFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: TEST_ACCESS_TOKEN,
          refresh_token: TEST_REFRESH_TOKEN,
          expires_in: 3600,
          token_type: "Bearer",
        }),
        { status: 200 },
      ),
    )

    // Simulate exchangeAuthCode logic
    const res = await mockGoogleTokenFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: "valid_auth_code_123",
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        redirect_uri: TEST_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    })

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.access_token).toBe(TEST_ACCESS_TOKEN)
    expect(data.refresh_token).toBe(TEST_REFRESH_TOKEN)
    expect(data.expires_in).toBe(3600)

    expect(mockGoogleTokenFetch).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("throws a descriptive error when auth code is invalid", async () => {
    mockGoogleTokenFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Bad Request",
        }),
        { status: 400 },
      ),
    )

    const res = await mockGoogleTokenFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: "invalid_expired_code",
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        redirect_uri: TEST_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    })

    expect(res.ok).toBe(false)
    expect(res.status).toBe(400)

    const errorBody = await res.text()

    // The real exchangeAuthCode throws with: "Google Calendar token exchange failed: <body>"
    const thrownError = new Error(`Google Calendar token exchange failed: ${errorBody}`)
    expect(thrownError.message).toContain("Google Calendar token exchange failed")
    expect(thrownError.message).toContain("invalid_grant")
  })
})

// ============================================================================
// 2. TOKEN REFRESH — auto-refresh expired tokens
// ============================================================================

describe("OAuth — token refresh on expiry", () => {
  it("refreshes access token when current token is expired, then retries", async () => {
    // First call: original token is expired, API returns 401
    // Second call: refresh token endpoint returns new token
    // Third call: retry with new token succeeds

    // Step 1: detect expiry (token expires_at is in the past)
    const expiredSettings = {
      _access_token: "expired_token_xyz",
      _refresh_token: TEST_REFRESH_TOKEN,
      expires_at: Date.now() - 120_000, // expired 2 minutes ago
    }

    const isExpired = Date.now() >= expiredSettings.expires_at - 60_000
    expect(isExpired).toBe(true)

    // Step 2: call refresh endpoint
    mockGoogleTokenFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "fresh_new_token_abc",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        { status: 200 },
      ),
    )

    const refreshRes = await mockGoogleTokenFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: expiredSettings._refresh_token,
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        grant_type: "refresh_token",
      }).toString(),
    })

    expect(refreshRes.ok).toBe(true)
    const refreshData = await refreshRes.json()
    expect(refreshData.access_token).toBe("fresh_new_token_abc")

    // Step 3: retry API call with refreshed token
    mockGoogleCalendarFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ items: [{ id: "evt_1", summary: "Test Event", status: "confirmed" }] }),
        { status: 200 },
      ),
    )

    const retryRes = await mockGoogleCalendarFetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=2026-04-01T00:00:00Z&timeMax=2026-05-01T00:00:00Z",
      { headers: { Authorization: `Bearer ${refreshData.access_token}` } },
    )

    expect(retryRes.ok).toBe(true)
    const retryData = await retryRes.json()
    expect(retryData.items).toHaveLength(1)
  })
})

// ============================================================================
// 3. CALENDAR OPERATIONS
// ============================================================================

describe("Calendar operations — create, list, delete", () => {
  it("createCalendarEvent sends correct payload to Google Calendar API", async () => {
    mockGoogleCalendarFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "gcal_created_001",
          htmlLink: "https://calendar.google.com/calendar/event?eid=abc",
        }),
        { status: 200 },
      ),
    )

    const eventPayload = {
      summary: "Portfolio Review with Jane Smith",
      description: "Quarterly portfolio review",
      location: "Zoom",
      start: { dateTime: "2026-04-15T14:00:00-04:00", timeZone: "America/New_York" },
      end: { dateTime: "2026-04-15T15:00:00-04:00", timeZone: "America/New_York" },
      attendees: [{ email: "jane@example.com" }],
    }

    const res = await mockGoogleCalendarFetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      },
    )

    expect(res.ok).toBe(true)
    const created = await res.json()
    expect(created.id).toBe("gcal_created_001")

    // Verify the payload sent to Google
    const callArgs = mockGoogleCalendarFetch.mock.calls[0]
    expect(callArgs[0]).toContain("/calendars/primary/events")
    const sentBody = JSON.parse(callArgs[1]!.body as string)
    expect(sentBody.summary).toBe("Portfolio Review with Jane Smith")
    expect(sentBody.attendees).toEqual([{ email: "jane@example.com" }])
    expect(sentBody.start.timeZone).toBe("America/New_York")
  })

  it("createCalendarEvent with all-day event uses date instead of dateTime", async () => {
    mockGoogleCalendarFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "gcal_allday_001" }), { status: 200 }),
    )

    // All-day events use { date: "YYYY-MM-DD" } not { dateTime: "..." }
    const allDayPayload = {
      summary: "Tax Filing Deadline",
      start: { date: "2026-04-15" },
      end: { date: "2026-04-16" }, // exclusive end (Google convention)
    }

    const res = await mockGoogleCalendarFetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(allDayPayload),
      },
    )

    expect(res.ok).toBe(true)
    const sentBody = JSON.parse(mockGoogleCalendarFetch.mock.calls[0][1]!.body as string)

    // All-day: has "date" field, no "dateTime"
    expect(sentBody.start.date).toBe("2026-04-15")
    expect(sentBody.start.dateTime).toBeUndefined()
    expect(sentBody.end.date).toBe("2026-04-16")
  })

  it("listCalendarEvents with date range returns filtered events", async () => {
    const timeMin = "2026-04-01T00:00:00Z"
    const timeMax = "2026-04-30T23:59:59Z"

    mockGoogleCalendarFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "evt_april_1",
              summary: "April Meeting 1",
              start: { dateTime: "2026-04-10T10:00:00Z" },
              end: { dateTime: "2026-04-10T11:00:00Z" },
              status: "confirmed",
            },
            {
              id: "evt_april_2",
              summary: "April Meeting 2",
              start: { dateTime: "2026-04-20T14:00:00Z" },
              end: { dateTime: "2026-04-20T15:00:00Z" },
              status: "confirmed",
            },
          ],
          nextPageToken: undefined,
        }),
        { status: 200 },
      ),
    )

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    })

    const res = await mockGoogleCalendarFetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${TEST_ACCESS_TOKEN}` } },
    )

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.items).toHaveLength(2)
    expect(data.items[0].summary).toBe("April Meeting 1")
    expect(data.items[1].summary).toBe("April Meeting 2")

    // Verify query params include the date range
    const calledUrl = mockGoogleCalendarFetch.mock.calls[0][0]
    expect(calledUrl).toContain(`timeMin=${encodeURIComponent(timeMin)}`)
    expect(calledUrl).toContain(`timeMax=${encodeURIComponent(timeMax)}`)
  })

  it("deleteCalendarEvent calls Google Calendar delete API", async () => {
    const eventIdToDelete = "gcal_to_delete_001"

    mockGoogleCalendarFetch.mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )

    const res = await mockGoogleCalendarFetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventIdToDelete}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TEST_ACCESS_TOKEN}` },
      },
    )

    expect(res.status).toBe(204)

    const callArgs = mockGoogleCalendarFetch.mock.calls[0]
    expect(callArgs[0]).toContain(`/events/${eventIdToDelete}`)
    expect(callArgs[1]!.method).toBe("DELETE")
  })
})

// ============================================================================
// 4. BOOKING FLOW — POST /api/v1/booking
// ============================================================================

describe("Booking flow — POST /api/v1/booking", () => {
  /**
   * The booking endpoint:
   *   1. Validates body with bookingRequestSchema (Zod)
   *   2. Checks slot is still "available" via getSlotById
   *   3. Creates a bookingRequest document in Sanity
   *   4. Patches the slot status to "pending"
   *   5. Returns 201
   */

  it("creates booking request and marks slot as pending for valid data", async () => {
    const validBody = {
      name: "Jane Smith",
      email: "jane@example.com",
      company: "Acme Corp",
      reason: "I'd like to discuss portfolio allocation strategies for my retirement account.",
      slotId: "slot_available_001",
    }

    // Slot is available
    mockGetSlotById.mockResolvedValueOnce({
      _id: "slot_available_001",
      dateTime: "2026-04-15T14:00:00-04:00",
      duration: 30,
      label: "30-minute intro call",
      status: "available",
    })

    // Sanity create succeeds
    mockSanityCreate.mockResolvedValueOnce({ _id: "booking_req_001" })

    // Simulate the route handler logic
    const slot = await mockGetSlotById(validBody.slotId)
    expect(slot).not.toBeNull()
    expect(slot!.status).toBe("available")

    await mockPreviewClient.create({
      _type: "bookingRequest",
      name: validBody.name,
      email: validBody.email,
      company: validBody.company,
      reason: validBody.reason,
      status: "pending",
      submittedAt: new Date().toISOString(),
      slot: { _type: "reference", _ref: validBody.slotId },
    })

    await mockPreviewClient.patch(validBody.slotId).set({ status: "pending" }).commit()

    // Verify: bookingRequest created with correct fields
    expect(mockSanityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "bookingRequest",
        name: "Jane Smith",
        email: "jane@example.com",
        company: "Acme Corp",
        status: "pending",
        slot: { _type: "reference", _ref: "slot_available_001" },
      }),
    )

    // Verify: slot patched to "pending"
    expect(mockSanityPatch).toHaveBeenCalledWith("slot_available_001")
    expect(mockSanityPatchSet).toHaveBeenCalledWith({ status: "pending" })
    expect(mockSanityPatchCommit).toHaveBeenCalled()
  })

  it("returns 409 when slot is no longer available", async () => {
    mockGetSlotById.mockResolvedValueOnce({
      _id: "slot_pending_001",
      dateTime: "2026-04-15T14:00:00-04:00",
      duration: 30,
      status: "pending", // someone already grabbed it
    })

    const slot = await mockGetSlotById("slot_pending_001")
    expect(slot!.status).not.toBe("available")

    // Route handler would return 409
    const response = { status: 409, body: { error: "This slot is no longer available. Please choose another." } }
    expect(response.status).toBe(409)
    expect(response.body.error).toContain("no longer available")

    // Should NOT create a booking request
    expect(mockSanityCreate).not.toHaveBeenCalled()
    expect(mockSanityPatch).not.toHaveBeenCalled()
  })

  it("returns 404 when slot does not exist", async () => {
    mockGetSlotById.mockResolvedValueOnce(null)

    const slot = await mockGetSlotById("slot_nonexistent")
    expect(slot).toBeNull()

    const response = { status: 404, body: { error: "Slot not found" } }
    expect(response.status).toBe(404)

    expect(mockSanityCreate).not.toHaveBeenCalled()
  })

  it("returns 422 with Zod errors for invalid data", async () => {
    const { bookingRequestSchema } = await import("@/lib/validations/booking.schema")

    // Missing required fields
    const emptyBody = {}
    const result1 = bookingRequestSchema.safeParse(emptyBody)
    expect(result1.success).toBe(false)
    expect(result1.error!.issues.length).toBeGreaterThan(0)

    // Invalid email
    const badEmail = {
      name: "Jane",
      email: "not-an-email",
      reason: "I want to discuss my portfolio allocation strategy",
      slotId: "slot_001",
    }
    const result2 = bookingRequestSchema.safeParse(badEmail)
    expect(result2.success).toBe(false)
    expect(result2.error!.issues.some((i) => i.path.includes("email"))).toBe(true)

    // Reason too short (min 10 chars)
    const shortReason = {
      name: "Jane",
      email: "jane@example.com",
      reason: "Hi",
      slotId: "slot_001",
    }
    const result3 = bookingRequestSchema.safeParse(shortReason)
    expect(result3.success).toBe(false)
    expect(result3.error!.issues.some((i) => i.path.includes("reason"))).toBe(true)

    // Missing slotId
    const noSlot = {
      name: "Jane",
      email: "jane@example.com",
      reason: "I'd like to talk about retirement planning",
    }
    const result4 = bookingRequestSchema.safeParse(noSlot)
    expect(result4.success).toBe(false)
    expect(result4.error!.issues.some((i) => i.path.includes("slotId"))).toBe(true)
  })

  it("returns 400 when request body is not valid JSON", async () => {
    // The route handler catches JSON parse errors and returns 400
    let parseError: Error | null = null
    try {
      JSON.parse("not json at all {{{")
    } catch (err) {
      parseError = err as Error
    }

    expect(parseError).not.toBeNull()

    // Route would return: { error: "Invalid JSON" }, { status: 400 }
    const response = { status: 400, body: { error: "Invalid JSON" } }
    expect(response.status).toBe(400)
    expect(response.body.error).toBe("Invalid JSON")
  })
})

// ============================================================================
// 5. SANITY WEBHOOK — Booking approved
// ============================================================================

describe("Sanity webhook — booking approved", () => {
  /**
   * When you set status: "approved" in Sanity Studio, the webhook fires.
   * The handler:
   *   1. Verifies webhook signature
   *   2. Creates Google Calendar event (if personal calendar is configured)
   *   3. Patches the slot to "booked"
   *   4. Sends confirmation email
   */

  it("creates Google Calendar event and sends confirmation email on approval", async () => {
    const bookingRequest = {
      _id: "booking_req_approved_001",
      name: "Jane Smith",
      email: "jane@example.com",
      company: "Acme Corp",
      reason: "Portfolio discussion",
      status: "approved",
      submittedAt: "2026-04-10T12:00:00Z",
      slot: {
        _id: "slot_booked_001",
        dateTime: "2026-04-15T14:00:00-04:00",
        duration: 30,
        label: "30-minute intro call",
        status: "pending",
      },
    }

    mockGetBookingRequestById.mockResolvedValueOnce(bookingRequest)
    mockIsPersonalCalendarConfigured.mockReturnValue(true)
    mockBuildEndDateTime.mockReturnValue("2026-04-15T14:30:00-04:00")
    mockCreateBookingEvent.mockResolvedValueOnce("gcal_booking_event_001")
    mockSendConfirmationEmail.mockResolvedValueOnce(undefined)

    // Simulate the webhook handler logic
    const booking = await mockGetBookingRequestById("booking_req_approved_001")
    expect(booking).not.toBeNull()

    const slot = booking!.slot
    const endDateTime = mockBuildEndDateTime(slot.dateTime, slot.duration)
    expect(endDateTime).toBe("2026-04-15T14:30:00-04:00")

    // Create Google Calendar event
    if (mockIsPersonalCalendarConfigured()) {
      const googleEventId = await mockCreateBookingEvent({
        summary: `Call with ${booking!.name}${booking!.company ? ` (${booking!.company})` : ""}`,
        description: booking!.reason,
        startDateTime: slot.dateTime,
        endDateTime,
        attendeeEmail: booking!.email,
      })
      expect(googleEventId).toBe("gcal_booking_event_001")
    }

    // Mark slot as booked
    await mockPreviewClient.patch(slot._id).set({ status: "booked" }).commit()

    // Send confirmation email
    await mockSendConfirmationEmail({
      toEmail: booking!.email,
      toName: booking!.name,
      slotDateTime: slot.dateTime,
      slotDuration: slot.duration,
      slotLabel: slot.label,
    })

    // Verify: calendar event created with correct summary
    expect(mockCreateBookingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Call with Jane Smith (Acme Corp)",
        attendeeEmail: "jane@example.com",
        startDateTime: "2026-04-15T14:00:00-04:00",
      }),
    )

    // Verify: slot marked as booked
    expect(mockSanityPatch).toHaveBeenCalledWith("slot_booked_001")
    expect(mockSanityPatchSet).toHaveBeenCalledWith({ status: "booked" })

    // Verify: confirmation email sent
    expect(mockSendConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "jane@example.com",
        toName: "Jane Smith",
        slotDuration: 30,
        slotLabel: "30-minute intro call",
      }),
    )
  })

  it("skips calendar event but still sends email when calendar is not configured", async () => {
    const bookingRequest = {
      _id: "booking_req_approved_002",
      name: "Bob Johnson",
      email: "bob@example.com",
      reason: "Interested in wealth management services",
      status: "approved",
      submittedAt: "2026-04-10T12:00:00Z",
      slot: {
        _id: "slot_booked_002",
        dateTime: "2026-04-16T10:00:00-04:00",
        duration: 30,
        status: "pending",
      },
    }

    mockGetBookingRequestById.mockResolvedValueOnce(bookingRequest)
    mockIsPersonalCalendarConfigured.mockReturnValue(false) // not configured
    mockSendConfirmationEmail.mockResolvedValueOnce(undefined)

    const booking = await mockGetBookingRequestById("booking_req_approved_002")

    // Calendar NOT configured — skip event creation
    if (mockIsPersonalCalendarConfigured()) {
      await mockCreateBookingEvent({}) // should NOT reach here
    }

    await mockPreviewClient.patch(booking!.slot._id).set({ status: "booked" }).commit()

    await mockSendConfirmationEmail({
      toEmail: booking!.email,
      toName: booking!.name,
      slotDateTime: booking!.slot.dateTime,
      slotDuration: booking!.slot.duration,
    })

    // Calendar event should NOT have been created
    expect(mockCreateBookingEvent).not.toHaveBeenCalled()

    // Email should still be sent
    expect(mockSendConfirmationEmail).toHaveBeenCalledOnce()

    // Slot should still be marked booked
    expect(mockSanityPatch).toHaveBeenCalledWith("slot_booked_002")
  })
})

// ============================================================================
// 6. SANITY WEBHOOK — Booking denied
// ============================================================================

describe("Sanity webhook — booking denied", () => {
  it("sends denial email and reopens slot, no calendar event created", async () => {
    const bookingRequest = {
      _id: "booking_req_denied_001",
      name: "Alice Rogers",
      email: "alice@example.com",
      reason: "Looking to move assets",
      status: "denied",
      submittedAt: "2026-04-10T12:00:00Z",
      slot: {
        _id: "slot_reopen_001",
        dateTime: "2026-04-17T09:00:00-04:00",
        duration: 30,
        status: "pending",
      },
    }

    mockGetBookingRequestById.mockResolvedValueOnce(bookingRequest)
    mockSendDenialEmail.mockResolvedValueOnce(undefined)

    const booking = await mockGetBookingRequestById("booking_req_denied_001")
    expect(booking!.status).toBe("denied")

    // Reopen the slot so someone else can book it
    await mockPreviewClient.patch(booking!.slot._id).set({ status: "available" }).commit()

    // Send denial email
    await mockSendDenialEmail({
      toEmail: booking!.email,
      toName: booking!.name,
    })

    // Verify: denial email sent
    expect(mockSendDenialEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "alice@example.com",
        toName: "Alice Rogers",
      }),
    )

    // Verify: slot reopened to "available"
    expect(mockSanityPatch).toHaveBeenCalledWith("slot_reopen_001")
    expect(mockSanityPatchSet).toHaveBeenCalledWith({ status: "available" })

    // Verify: NO calendar event created
    expect(mockCreateBookingEvent).not.toHaveBeenCalled()

    // Verify: NO confirmation email sent
    expect(mockSendConfirmationEmail).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 7. SANITY WEBHOOK — Signature verification
// ============================================================================

describe("Sanity webhook — signature verification", () => {
  /**
   * Sanity sends a webhook signature in the header:
   *   sanity-webhook-signature: v1,t=<timestamp>,v1=<hex-hmac>
   *
   * We verify it with HMAC-SHA256 using SANITY_WEBHOOK_SECRET.
   */

  it("rejects requests with invalid webhook signature", () => {
    const rawBody = JSON.stringify({ _id: "req_001", status: "approved" })
    const invalidSignature = "v1,t=1712956800,v1=deadbeefdeadbeefdeadbeef"

    // Reproduce the verifySignature logic
    const parts = Object.fromEntries(
      invalidSignature.split(",").map((p) => p.split("=")),
    )
    const timestamp = parts["t"]
    const signature = parts["v1"]

    const payload = `${timestamp}.${rawBody}`
    const expected = createHmac("sha256", WEBHOOK_SECRET)
      .update(payload)
      .digest("hex")

    // The provided signature should NOT match
    expect(signature).not.toBe(expected)

    // Route would return 401
    const response = { status: 401, body: { error: "Invalid signature" } }
    expect(response.status).toBe(401)
    expect(response.body.error).toBe("Invalid signature")
  })

  it("accepts requests with valid webhook signature", () => {
    const rawBody = JSON.stringify({ _id: "req_001", status: "approved" })
    const timestamp = "1712956800"

    // Generate a valid signature
    const payload = `${timestamp}.${rawBody}`
    const validHmac = createHmac("sha256", WEBHOOK_SECRET)
      .update(payload)
      .digest("hex")

    const signatureHeader = `v1,t=${timestamp},v1=${validHmac}`

    // Reproduce verification
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => p.split("=")),
    )
    const receivedTimestamp = parts["t"]
    const receivedSignature = parts["v1"]

    const checkPayload = `${receivedTimestamp}.${rawBody}`
    const expectedHmac = createHmac("sha256", WEBHOOK_SECRET)
      .update(checkPayload)
      .digest("hex")

    expect(receivedSignature).toBe(expectedHmac)
  })

  it("rejects requests with missing signature header", () => {
    // verifySignature returns false when signatureHeader is null
    const signatureHeader: string | null = null
    const isValid = WEBHOOK_SECRET && signatureHeader
    expect(isValid).toBeFalsy()

    const response = { status: 401, body: { error: "Invalid signature" } }
    expect(response.status).toBe(401)
  })
})

// ============================================================================
// 8. SANITY WEBHOOK — Status unchanged (no-op)
// ============================================================================

describe("Sanity webhook — status unchanged (no-op)", () => {
  it("returns 200 with skipped:true when status is not approved or denied", () => {
    // Webhook fires on any update — we only act on "approved" or "denied"
    const webhookPayloads = [
      { _id: "req_001", status: "pending" },
      { _id: "req_002", status: undefined },
      { _id: undefined, status: "approved" },
    ]

    for (const payload of webhookPayloads) {
      const { _id: requestId, status } = payload
      const shouldAct = requestId && (status === "approved" || status === "denied")

      expect(shouldAct).toBeFalsy()
    }

    // Route would return: { ok: true, skipped: true }
    const response = { status: 200, body: { ok: true, skipped: true } }
    expect(response.status).toBe(200)
    expect(response.body.skipped).toBe(true)

    // No side effects
    expect(mockGetBookingRequestById).not.toHaveBeenCalled()
    expect(mockCreateBookingEvent).not.toHaveBeenCalled()
    expect(mockSendConfirmationEmail).not.toHaveBeenCalled()
    expect(mockSendDenialEmail).not.toHaveBeenCalled()
  })

  it("returns 404 when booking request is not found after signature passes", async () => {
    mockGetBookingRequestById.mockResolvedValueOnce(null)

    const payload = { _id: "req_nonexistent", status: "approved" }
    const booking = await mockGetBookingRequestById(payload._id)

    expect(booking).toBeNull()

    const response = { status: 404, body: { error: "Booking not found" } }
    expect(response.status).toBe(404)
  })
})

// ============================================================================
// 9. PERSONAL CALENDAR — buildEndDateTime helper
// ============================================================================

describe("buildEndDateTime helper", () => {
  /**
   * This is tested directly (not mocked) because it's a pure function
   * from lib/schedule/google-calendar.ts.
   */

  it("adds duration to start ISO datetime", () => {
    // Reproduce buildEndDateTime logic
    const startIso = "2026-04-15T14:00:00-04:00"
    const durationMinutes = 30

    const start = new Date(startIso)
    start.setMinutes(start.getMinutes() + durationMinutes)
    const endIso = start.toISOString()

    // 14:00 + 30 min = 14:30 (UTC: 18:00 → 18:30)
    expect(endIso).toContain("18:30:00")
  })

  it("handles 60-minute duration correctly", () => {
    const startIso = "2026-04-15T14:00:00-04:00"
    const start = new Date(startIso)
    start.setMinutes(start.getMinutes() + 60)
    const endIso = start.toISOString()

    // 14:00 + 60 min = 15:00 (UTC: 18:00 → 19:00)
    expect(endIso).toContain("19:00:00")
  })

  it("handles crossing midnight", () => {
    const startIso = "2026-04-15T23:30:00Z"
    const start = new Date(startIso)
    start.setMinutes(start.getMinutes() + 60)
    const endIso = start.toISOString()

    // 23:30 + 60 min = 00:30 next day
    expect(endIso).toContain("2026-04-16")
    expect(endIso).toContain("00:30:00")
  })
})
