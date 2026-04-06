/**
 * ============================================================================
 * TEST FILE: calendar-event.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the Zod validation schemas for calendar events —
 * the rules that decide whether data being sent to our app is shaped
 * correctly before it hits the database.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ lib/validations/calendar-event.schema.ts exports two schemas:          │
 * │                                                                         │
 * │ 1. createCalendarEventSchema — validates a new calendar event          │
 * │    Required:  title (string), type (enum), date (string)               │
 * │    Optional:  clientId, time, endTime, location, amount, description,  │
 * │               attendees, reminder, metadata                             │
 * │                                                                         │
 * │ 2. updateCalendarEventSchema — validates updates to an existing event  │
 * │    All fields optional (partial update). Some fields also accept null  │
 * │    to explicitly clear them.                                            │
 * │                                                                         │
 * │ 3. calendarEventTypes — the six valid event type values                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY DATE IS A STRING (not a Date object)                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Our calendar_events table stores date as text "YYYY-MM-DD". This is    │
 * │ intentional — it avoids timezone conversion bugs when JavaScript       │
 * │ converts Date objects to UTC, which can shift the date by one day      │
 * │ depending on the user's timezone. Storing "2024-06-15" as a string     │
 * │ always means June 15th, regardless of where the server is located.     │
 * │                                                                         │
 * │ The schema validates with z.string().min(1) — it checks the string     │
 * │ is not empty but does NOT enforce ISO format. We test both cases.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/validations/calendar-event.schema.ts — schemas under test
 *   app/db/schema/calendar_events.ts         — database table definition
 *   lib/actions/calendar-event.actions.ts    — uses these schemas
 */

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "@/lib/validations/calendar-event.schema"

// ============================================================================
// HELPERS
// ============================================================================

/** Minimal valid payload — satisfies all required fields. */
const minimalEvent = {
  title: "Q1 Portfolio Review",
  type: "meeting" as const,
  date: "2024-06-15",
}

/** Full valid payload — every field populated. */
const fullEvent = {
  clientId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  title: "Q1 Portfolio Review",
  type: "meeting" as const,
  date: "2024-06-15",
  time: "9:00 AM",
  endTime: "10:00 AM",
  location: "Zoom — link in description",
  amount: 5000,
  description: "Annual review of Q1 performance and rebalancing discussion.",
  attendees: ["alice@example.com", "bob@example.com"],
  reminder: true,
  metadata: { googleCalendarId: "abc123", syncStatus: "synced" },
}

// ============================================================================
// 1. createCalendarEventSchema — VALID MINIMAL PAYLOAD
// ============================================================================

describe("createCalendarEventSchema — minimal valid payload", () => {
  /**
   * TEST: The three required fields (title, type, date) are enough to
   * pass validation. Everything else is optional.
   */
  it("accepts minimal payload with title + type + date", () => {
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
  })

  it("defaults reminder to undefined when omitted (not set in schema)", () => {
    // reminder is optional — if omitted, it's simply absent from result.data
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      // No default in schema — undefined when omitted
      expect(result.data.reminder).toBeUndefined()
    }
  })

  it("does not include optional fields in result when omitted", () => {
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientId).toBeUndefined()
      expect(result.data.time).toBeUndefined()
      expect(result.data.endTime).toBeUndefined()
      expect(result.data.location).toBeUndefined()
      expect(result.data.description).toBeUndefined()
    }
  })
})

// ============================================================================
// 2. createCalendarEventSchema — FULL VALID PAYLOAD
// ============================================================================

describe("createCalendarEventSchema — full valid payload", () => {
  it("accepts a fully populated event", () => {
    const result = createCalendarEventSchema.safeParse(fullEvent)
    expect(result.success).toBe(true)
  })

  it("preserves all field values in result.data", () => {
    const result = createCalendarEventSchema.safeParse(fullEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("Q1 Portfolio Review")
      expect(result.data.type).toBe("meeting")
      expect(result.data.date).toBe("2024-06-15")
      expect(result.data.attendees).toEqual(["alice@example.com", "bob@example.com"])
      expect(result.data.reminder).toBe(true)
      expect(result.data.metadata).toEqual({
        googleCalendarId: "abc123",
        syncStatus: "synced",
      })
    }
  })
})

// ============================================================================
// 3. calendarEventTypeEnum — all six valid values
// ============================================================================

describe("createCalendarEventSchema — type enum", () => {
  /**
   * TEST: Every declared event type is accepted.
   *
   * WHY: If someone adds a new type to the DB enum (00_enums.ts) but
   * forgets to add it to calendarEventTypes in the schema, validation
   * will silently reject it. This loop catches that drift.
   */
  const validTypes = [
    "meeting",
    "payment",
    "dividend",
    "deadline",
    "document",
    "call",
  ] as const

  for (const type of validTypes) {
    it(`accepts type "${type}"`, () => {
      const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type })
      expect(result.success).toBe(true)
    })
  }

  it("rejects unknown type 'webinar'", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type: "webinar" })
    expect(result.success).toBe(false)
  })

  it("rejects unknown type 'reminder'", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type: "reminder" })
    expect(result.success).toBe(false)
  })

  it("is case-sensitive — rejects 'Meeting' (capital M)", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type: "Meeting" })
    expect(result.success).toBe(false)
  })

  it("is case-sensitive — rejects 'CALL' (all caps)", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type: "CALL" })
    expect(result.success).toBe(false)
  })

  it("rejects null as type", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type: null })
    expect(result.success).toBe(false)
  })

  it("rejects number as type", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, type: 1 })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 4. createCalendarEventSchema — MISSING REQUIRED FIELDS
// ============================================================================

describe("createCalendarEventSchema — missing required fields", () => {
  it("rejects missing title", () => {
    const result = createCalendarEventSchema.safeParse(
      Object.fromEntries(Object.entries(fullEvent).filter(([k]) => k !== "title"))
    )
    expect(result.success).toBe(false)
  })

  it("rejects missing type", () => {
    const result = createCalendarEventSchema.safeParse(
      Object.fromEntries(Object.entries(fullEvent).filter(([k]) => k !== "type"))
    )
    expect(result.success).toBe(false)
  })

  it("rejects missing date", () => {
    const result = createCalendarEventSchema.safeParse(
      Object.fromEntries(Object.entries(fullEvent).filter(([k]) => k !== "date"))
    )
    expect(result.success).toBe(false)
  })

  it("rejects completely empty object", () => {
    const result = createCalendarEventSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects null as the entire payload", () => {
    const result = createCalendarEventSchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it("rejects undefined as the entire payload", () => {
    const result = createCalendarEventSchema.safeParse(undefined)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 5. createCalendarEventSchema — TITLE VALIDATION
// ============================================================================

describe("createCalendarEventSchema — title validation", () => {
  it("rejects empty string for title", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, title: "" })
    expect(result.success).toBe(false)
  })

  it("accepts a single character title", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, title: "A" })
    expect(result.success).toBe(true)
  })

  it("accepts a long title (200 characters)", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      title: "A".repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it("accepts a title with special characters", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      title: "Q3 Review — Hedge Fund & PE Portfolio (2024)",
    })
    expect(result.success).toBe(true)
  })

  it("rejects null as title", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, title: null })
    expect(result.success).toBe(false)
  })

  it("rejects number as title", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, title: 42 })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 6. createCalendarEventSchema — DATE VALIDATION
// ============================================================================

describe("createCalendarEventSchema — date validation", () => {
  /**
   * NOTE ON DATE DESIGN:
   * date is z.string().min(1) — not a Date object and not enforced as
   * ISO 8601. This avoids timezone shifting bugs. The schema only checks
   * that the string is non-empty; business logic in the action/service
   * layer is responsible for format enforcement.
   */

  it("accepts a standard ISO date string '2024-06-15'", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, date: "2024-06-15" })
    expect(result.success).toBe(true)
  })

  it("accepts a far-future date '2099-12-31'", () => {
    // We should NOT block far-future events — compliance deadlines, estate
    // planning milestones, and long-term contracts can be many years out.
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, date: "2099-12-31" })
    expect(result.success).toBe(true)
  })

  it("accepts a past date '2000-01-01'", () => {
    // Past events are valid — we may need to record historical meetings,
    // log past payment dates, or backfill imported calendar data.
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, date: "2000-01-01" })
    expect(result.success).toBe(true)
  })

  it("accepts non-ISO date format '06/15/2024' (schema does not enforce format)", () => {
    // The schema only checks min(1). Format enforcement is a business rule.
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, date: "06/15/2024" })
    expect(result.success).toBe(true)
  })

  it("rejects empty string for date", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, date: "" })
    expect(result.success).toBe(false)
  })

  it("rejects null as date", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, date: null })
    expect(result.success).toBe(false)
  })

  it("rejects a Date object (must be a string)", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      date: new Date("2024-06-15"),
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 7. createCalendarEventSchema — clientId VALIDATION
// ============================================================================

describe("createCalendarEventSchema — clientId validation", () => {
  /**
   * clientId is optional — not all events are tied to a specific client.
   * When provided, it must be a valid UUID (e.g., for org-wide deadlines
   * the clientId would be omitted; for a client meeting it is set).
   */

  it("accepts a valid UUID for clientId", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      clientId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    expect(result.success).toBe(true)
  })

  it("accepts missing clientId (truly optional)", () => {
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
  })

  it("rejects a non-UUID string for clientId", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      clientId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an empty string for clientId", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      clientId: "",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 8. createCalendarEventSchema — amount VALIDATION
// ============================================================================

describe("createCalendarEventSchema — amount validation", () => {
  /**
   * amount is used for payment/dividend events (e.g., "$50,000 dividend
   * payout"). It must be a positive number when provided.
   */

  it("accepts a positive amount for a payment event", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      type: "payment",
      amount: 50000,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a decimal amount", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      type: "dividend",
      amount: 12345.67,
    })
    expect(result.success).toBe(true)
  })

  it("rejects zero as amount (must be positive)", () => {
    // z.number().positive() means strictly > 0, so 0 is invalid.
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, amount: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects negative amount", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, amount: -100 })
    expect(result.success).toBe(false)
  })

  it("rejects string as amount", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, amount: "50000" })
    expect(result.success).toBe(false)
  })

  it("accepts missing amount (optional field)", () => {
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 9. createCalendarEventSchema — attendees VALIDATION
// ============================================================================

describe("createCalendarEventSchema — attendees validation", () => {
  /**
   * attendees is an optional array of strings. The schema does NOT enforce
   * email format — that is a business rule. It stores names, emails, or
   * any identifier the user provides.
   *
   * NOTE: The schema uses z.array(z.string()) — it accepts any strings.
   * If you want email-only attendees, add z.string().email() in the schema.
   */

  it("accepts an array of email strings", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      attendees: ["alice@example.com", "bob@example.com"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts an array of plain names (not emails)", () => {
    // Schema uses z.array(z.string()) — not z.string().email()
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      attendees: ["Alice Johnson", "Bob Smith"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty attendees array", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      attendees: [],
    })
    expect(result.success).toBe(true)
  })

  it("accepts missing attendees (optional field)", () => {
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
  })

  it("rejects attendees as a string instead of array", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      attendees: "alice@example.com",
    })
    expect(result.success).toBe(false)
  })

  it("rejects array containing a non-string item", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      attendees: ["alice@example.com", 42],
    })
    expect(result.success).toBe(false)
  })

  it("accepts a large attendees list (200+ entries)", () => {
    // Schema has no upper bound on attendee count. If a webinar has 200
    // attendees, the schema should not reject it — truncation/pagination
    // is a service-layer concern.
    const largeList = Array.from({ length: 200 }, (_, i) => `attendee${i}@example.com`)
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      attendees: largeList,
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 10. createCalendarEventSchema — metadata VALIDATION
// ============================================================================

describe("createCalendarEventSchema — metadata validation", () => {
  /**
   * metadata is a JSONB catch-all for extensible fields. It accepts any
   * object with string keys and unknown values, making it future-proof
   * for Google Calendar sync data, meet links, etc.
   */

  it("accepts a Google Calendar-style metadata object", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      metadata: {
        googleCalendarId: "abc123xyz",
        googleEventId: "gcal_event_456",
        meetLink: "https://meet.google.com/abc-defg-hij",
        syncStatus: "synced",
        lastSyncedAt: "2024-06-14T22:00:00Z",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty metadata object", () => {
    const result = createCalendarEventSchema.safeParse({ ...minimalEvent, metadata: {} })
    expect(result.success).toBe(true)
  })

  it("accepts metadata with nested objects", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      metadata: {
        recurrence: {
          rule: "FREQ=WEEKLY;BYDAY=MO",
          exceptions: ["2024-07-04"],
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts missing metadata (optional field)", () => {
    const result = createCalendarEventSchema.safeParse(minimalEvent)
    expect(result.success).toBe(true)
  })

  it("rejects metadata as an array (must be an object)", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      metadata: ["tag1", "tag2"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects metadata as a string", () => {
    const result = createCalendarEventSchema.safeParse({
      ...minimalEvent,
      metadata: "googleCalendarId:abc123",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 11. updateCalendarEventSchema — VALID PAYLOADS
// ============================================================================

describe("updateCalendarEventSchema — valid payloads", () => {
  /**
   * updateCalendarEventSchema is a PARTIAL update — every field is
   * optional. You can send any subset of fields.
   *
   * Some fields accept null explicitly so you can "clear" them:
   * e.g., setting clientId to null unlinks the event from a client.
   */

  it("accepts an empty object (no-op update)", () => {
    const result = updateCalendarEventSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts a title-only update", () => {
    const result = updateCalendarEventSchema.safeParse({
      title: "Updated Meeting Title",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a type-only update", () => {
    const result = updateCalendarEventSchema.safeParse({ type: "call" })
    expect(result.success).toBe(true)
  })

  it("accepts a date-only update", () => {
    const result = updateCalendarEventSchema.safeParse({ date: "2024-09-01" })
    expect(result.success).toBe(true)
  })

  it("accepts null for clientId (to unlink from client)", () => {
    const result = updateCalendarEventSchema.safeParse({ clientId: null })
    expect(result.success).toBe(true)
  })

  it("accepts null for time (to clear time)", () => {
    const result = updateCalendarEventSchema.safeParse({ time: null })
    expect(result.success).toBe(true)
  })

  it("accepts null for endTime (to clear end time)", () => {
    const result = updateCalendarEventSchema.safeParse({ endTime: null })
    expect(result.success).toBe(true)
  })

  it("accepts null for amount (to remove payment amount)", () => {
    const result = updateCalendarEventSchema.safeParse({ amount: null })
    expect(result.success).toBe(true)
  })

  it("accepts null for description", () => {
    const result = updateCalendarEventSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it("accepts null for location", () => {
    const result = updateCalendarEventSchema.safeParse({ location: null })
    expect(result.success).toBe(true)
  })

  it("accepts a full update payload with all fields", () => {
    const result = updateCalendarEventSchema.safeParse({
      clientId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Rescheduled Portfolio Review",
      type: "meeting",
      date: "2024-07-20",
      time: "2:00 PM",
      endTime: "3:00 PM",
      location: "Office — Conference Room A",
      amount: null,
      description: "Rescheduled from June.",
      attendees: ["alice@example.com"],
      reminder: false,
      metadata: { rescheduledFrom: "2024-06-15" },
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 12. updateCalendarEventSchema — INVALID FIELD VALUES
// ============================================================================

describe("updateCalendarEventSchema — invalid field values", () => {
  it("rejects empty string for title", () => {
    // min(1) still applies even on update
    const result = updateCalendarEventSchema.safeParse({ title: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty string for date", () => {
    const result = updateCalendarEventSchema.safeParse({ date: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid type enum on update", () => {
    const result = updateCalendarEventSchema.safeParse({ type: "webinar" })
    expect(result.success).toBe(false)
  })

  it("rejects non-UUID clientId on update", () => {
    const result = updateCalendarEventSchema.safeParse({ clientId: "not-a-uuid" })
    expect(result.success).toBe(false)
  })

  it("rejects negative amount on update", () => {
    const result = updateCalendarEventSchema.safeParse({ amount: -500 })
    expect(result.success).toBe(false)
  })

  it("rejects zero amount on update (must be positive)", () => {
    const result = updateCalendarEventSchema.safeParse({ amount: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects attendees as a string instead of array", () => {
    const result = updateCalendarEventSchema.safeParse({ attendees: "alice@example.com" })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 13. Google Calendar event-type mapping (inline schema as spec)
// ============================================================================
//
// When Google Calendar sends us an event, we need to map its fields to
// our CalendarEvent shape. This section defines the expected mapping as
// an inline schema — serving as the spec for a future google-calendar.schema.ts.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ GOOGLE CALENDAR EVENT FIELDS WE CARE ABOUT                             │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ id          → metadata.googleEventId                                   │
// │ summary     → title                                                    │
// │ start       → date + time (or just date for all-day)                  │
// │ end         → endTime (or just date for all-day)                      │
// │ location    → location                                                 │
// │ description → description                                              │
// │ attendees   → attendees (email array)                                  │
// │ hangoutLink → metadata.meetLink                                        │
// │ status      → metadata.googleStatus (confirmed|tentative|cancelled)   │
// └─────────────────────────────────────────────────────────────────────────┘

const googleCalendarEventSchema = z.object({
  id: z.string().min(1),
  summary: z.string().optional(), // Google allows events with no title
  start: z.union([
    z.object({ dateTime: z.string(), timeZone: z.string().optional() }), // timed event
    z.object({ date: z.string() }), // all-day event
  ]),
  end: z.union([
    z.object({ dateTime: z.string(), timeZone: z.string().optional() }),
    z.object({ date: z.string() }),
  ]),
  location: z.string().optional(),
  description: z.string().optional(),
  attendees: z
    .array(z.object({ email: z.string().email(), displayName: z.string().optional() }))
    .optional(),
  hangoutLink: z.string().url().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
})

describe("Google Calendar event shape — incoming webhook payload", () => {
  it("accepts a standard timed event", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_abc123",
      summary: "Q1 Portfolio Review",
      start: { dateTime: "2024-06-15T09:00:00-04:00", timeZone: "America/New_York" },
      end: { dateTime: "2024-06-15T10:00:00-04:00", timeZone: "America/New_York" },
      location: "Zoom",
      attendees: [
        { email: "alice@example.com", displayName: "Alice" },
        { email: "bob@example.com" },
      ],
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      status: "confirmed",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an all-day event (date field, no dateTime)", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_allday_001",
      summary: "Tax Filing Deadline",
      start: { date: "2024-04-15" },
      end: { date: "2024-04-16" }, // Google uses exclusive end date for all-day
      status: "confirmed",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a multi-day all-day event", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_multiday_001",
      summary: "Annual Offsite",
      start: { date: "2024-07-08" },
      end: { date: "2024-07-12" }, // 4-day span
      status: "confirmed",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a cancelled event (soft-delete signal)", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_cancelled_001",
      summary: "Cancelled Meeting",
      start: { dateTime: "2024-06-20T14:00:00Z" },
      end: { dateTime: "2024-06-20T15:00:00Z" },
      status: "cancelled",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an event with no summary (Google allows untitled events)", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_notitle_001",
      start: { dateTime: "2024-06-15T09:00:00Z" },
      end: { dateTime: "2024-06-15T10:00:00Z" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts an event with Google Meet link in hangoutLink", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_meet_001",
      summary: "Virtual Client Meeting",
      start: { dateTime: "2024-06-15T09:00:00Z" },
      end: { dateTime: "2024-06-15T10:00:00Z" },
      hangoutLink: "https://meet.google.com/xyz-abcd-efg",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // In our sync logic, hangoutLink should be stored in metadata.meetLink
      expect(result.data.hangoutLink).toBe("https://meet.google.com/xyz-abcd-efg")
    }
  })

  it("rejects an event with an invalid attendee email", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_bad_attendee",
      summary: "Meeting",
      start: { dateTime: "2024-06-15T09:00:00Z" },
      end: { dateTime: "2024-06-15T10:00:00Z" },
      attendees: [{ email: "not-an-email" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects an event with invalid hangoutLink (not a URL)", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_bad_link",
      summary: "Meeting",
      start: { dateTime: "2024-06-15T09:00:00Z" },
      end: { dateTime: "2024-06-15T10:00:00Z" },
      hangoutLink: "not-a-url",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing id", () => {
    const result = googleCalendarEventSchema.safeParse({
      summary: "Meeting",
      start: { dateTime: "2024-06-15T09:00:00Z" },
      end: { dateTime: "2024-06-15T10:00:00Z" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown status", () => {
    const result = googleCalendarEventSchema.safeParse({
      id: "gcal_001",
      summary: "Meeting",
      start: { dateTime: "2024-06-15T09:00:00Z" },
      end: { dateTime: "2024-06-15T10:00:00Z" },
      status: "accepted",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 14. Calendar sync date-range logic (inline spec)
// ============================================================================
//
// When we pull events from Google Calendar, we should limit the range to
// avoid syncing years of history. This section tests the date-range
// boundary logic used in the sync service.

/**
 * Computes a sync window: from `daysBack` days ago to `daysAhead` days
 * from now. Returns strings in "YYYY-MM-DD" format.
 *
 * This is the function that the calendar sync service would use.
 * We test it here to document the intended behavior.
 */
function computeSyncWindow(
  daysBack: number,
  daysAhead: number,
  now = new Date(),
): { from: string; to: string } {
  const from = new Date(now)
  from.setDate(from.getDate() - daysBack)
  const to = new Date(now)
  to.setDate(to.getDate() + daysAhead)
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  }
}

describe("Calendar sync date-range logic", () => {
  it("computes a 30-day back / 90-day ahead window correctly", () => {
    const now = new Date("2024-06-15T12:00:00Z")
    const { from, to } = computeSyncWindow(30, 90, now)
    expect(from).toBe("2024-05-16")
    expect(to).toBe("2024-09-13")
  })

  it("computes a same-day window (0 back, 0 ahead)", () => {
    const now = new Date("2024-06-15T12:00:00Z")
    const { from, to } = computeSyncWindow(0, 0, now)
    expect(from).toBe("2024-06-15")
    expect(to).toBe("2024-06-15")
  })

  it("from is always earlier than or equal to to", () => {
    const now = new Date()
    const { from, to } = computeSyncWindow(60, 365, now)
    expect(from <= to).toBe(true)
  })

  it("does NOT produce a 10-year window (would be too much data)", () => {
    const now = new Date()
    const { from, to } = computeSyncWindow(30, 90, now)
    const diffMs = new Date(to).getTime() - new Date(from).getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    // A 30+90 = 120-day window is well under 3650 days (10 years)
    expect(diffDays).toBeLessThan(3650)
  })
})

// ============================================================================
// 15. OAuth token payload shape (spec for google-oauth.schema.ts)
// ============================================================================
//
// When Google OAuth2 returns tokens after a user connects their calendar,
// we need to validate and store them. This schema documents the expected
// shape of the token response.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ GOOGLE OAUTH2 TOKEN RESPONSE FIELDS                                    │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ access_token  — short-lived token for API calls (~1 hour)              │
// │ refresh_token — long-lived token to get new access tokens              │
// │               (only returned on first authorization)                   │
// │ token_type    — always "Bearer"                                        │
// │ expires_in    — seconds until access_token expires (usually 3599)      │
// │ scope         — space-separated list of granted OAuth scopes           │
// └─────────────────────────────────────────────────────────────────────────┘

const googleOAuthTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(), // absent on token refresh
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  scope: z.string().min(1),
})

describe("Google OAuth token payload shape", () => {
  it("accepts a full token response with refresh_token (first auth)", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.a0AfH6SMBxyz...",
      refresh_token: "1//0eXyz...",
      token_type: "Bearer",
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a token refresh response (no refresh_token)", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.a0AfH6SMBnew...",
      token_type: "Bearer",
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a token with multiple scopes", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.multiscope...",
      token_type: "Bearer",
      expires_in: 3599,
      scope:
        "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    })
    expect(result.success).toBe(true)
  })

  it("rejects token_type other than 'Bearer'", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.abc...",
      token_type: "Basic",
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing access_token", () => {
    const result = googleOAuthTokenSchema.safeParse({
      token_type: "Bearer",
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-positive expires_in (0 would mean already expired)", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.abc...",
      token_type: "Bearer",
      expires_in: 0,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative expires_in", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.abc...",
      token_type: "Bearer",
      expires_in: -1,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(false)
  })

  it("rejects float expires_in (must be integer seconds)", () => {
    const result = googleOAuthTokenSchema.safeParse({
      access_token: "ya29.abc...",
      token_type: "Bearer",
      expires_in: 3599.5,
      scope: "https://www.googleapis.com/auth/calendar",
    })
    expect(result.success).toBe(false)
  })
})
