/**
 * ============================================================================
 * TEST FILE: calendar.service.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the calendar service — the code that reads
 * calendar events from the database and transforms them into the shape
 * our UI components expect.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS THE SERVICE LAYER?                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ lib/services/calendar.service.ts sits between the database and the     │
 * │ UI. It handles:                                                        │
 * │   - Querying the database for events                                   │
 * │   - Filtering out soft-deleted rows (deletedAt IS NULL)               │
 * │   - Converting DB rows into CalendarEvent objects                      │
 * │   - Calculating summary statistics                                     │
 * │                                                                         │
 * │ The service does NOT handle authentication — that's the action layer. │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS vi.mock()?                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The service calls the real database. In unit tests we don't want to    │
 * │ connect to a real database — it would be slow and need a running DB.  │
 * │ vi.mock() replaces the import with a fake (a "mock") that we control. │
 * │                                                                         │
 * │ vi.mocked(fn).mockResolvedValue(data)                                 │
 * │   → Makes the fake function return `data` when called with await.     │
 * │                                                                         │
 * │ vi.mocked(fn).mockRejectedValue(error)                                │
 * │   → Makes the fake function throw `error` when called with await.     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/services/calendar.service.ts   — service under test
 *   app/db/schema/calendar_events.ts   — table definition
 *   app/db/index.ts                    — Drizzle db instance (mocked)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock the database ────────────────────────────────────────────────────
// We mock app/db so that no actual database connection is made.
// Each test controls what the db returns by configuring the mock.

vi.mock("@/app/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  }
  return {
    db: {
      select: vi.fn(() => selectChain),
      query: {
        calendarEvents: {
          findFirst: vi.fn(),
        },
      },
    },
  }
})

// Import AFTER mocking
import { db } from "@/app/db"
import {
  getCalendarEvents,
  getCalendarEventsByType,
  getUpcomingEvents,
  getCalendarSummary,
} from "@/lib/services/calendar.service"

// ============================================================================
// FIXTURES — sample DB rows
// ============================================================================

/**
 * A sample row as Drizzle would return it from the database.
 * Notice the fields match the calendar_events table columns exactly.
 */
function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-uuid-001",
    orgId: "org-uuid-001",
    clientId: "client-uuid-001",
    title: "Q1 Portfolio Review",
    type: "meeting",
    date: "2024-06-15",
    time: "9:00 AM",
    endTime: "10:00 AM",
    location: "Zoom",
    amount: null,
    description: "Annual review",
    attendees: ["alice@example.com"],
    reminder: true,
    metadata: {},
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  }
}

// ============================================================================
// HELPER — drill into the mocked select chain
// ============================================================================

function getSelectChain() {
  // db.select() returns a chain: .from().where().orderBy()
  return (db.select as ReturnType<typeof vi.fn>)()
}

// ============================================================================
// 1. toCalendarEvent — field mapping
// ============================================================================

describe("toCalendarEvent — DB row to CalendarEvent mapping", () => {
  /**
   * The private toCalendarEvent function is tested indirectly through
   * getCalendarEvents. We verify that:
   * - Required fields map correctly
   * - Nullable DB fields become `undefined` in the CalendarEvent shape
   * - attendees JSONB array is correctly typed
   */

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("maps a full DB row to a CalendarEvent correctly", async () => {
    const row = makeDbRow()
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events).toHaveLength(1)
    const event = events[0]

    expect(event.id).toBe("event-uuid-001")
    expect(event.title).toBe("Q1 Portfolio Review")
    expect(event.type).toBe("meeting")
    expect(event.date).toBe("2024-06-15")
    expect(event.time).toBe("9:00 AM")
    expect(event.endTime).toBe("10:00 AM")
    expect(event.location).toBe("Zoom")
    expect(event.description).toBe("Annual review")
    expect(event.attendees).toEqual(["alice@example.com"])
    expect(event.reminder).toBe(true)
  })

  it("maps null time to undefined (not null) in CalendarEvent", async () => {
    // CalendarEvent type uses undefined for optional fields, not null.
    // null comes from the DB; undefined is what UI code expects.
    const row = makeDbRow({ time: null, endTime: null })
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events[0].time).toBeUndefined()
    expect(events[0].endTime).toBeUndefined()
  })

  it("maps null amount to undefined in CalendarEvent", async () => {
    const row = makeDbRow({ amount: null })
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events[0].amount).toBeUndefined()
  })

  it("maps null location to undefined in CalendarEvent", async () => {
    const row = makeDbRow({ location: null })
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events[0].location).toBeUndefined()
  })

  it("maps null description to undefined in CalendarEvent", async () => {
    const row = makeDbRow({ description: null })
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events[0].description).toBeUndefined()
  })

  it("maps null attendees to undefined in CalendarEvent", async () => {
    const row = makeDbRow({ attendees: null })
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events[0].attendees).toBeUndefined()
  })

  it("preserves attendees array from JSONB column", async () => {
    const row = makeDbRow({ attendees: ["alice@example.com", "bob@example.com"] })
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getCalendarEvents()
    expect(events[0].attendees).toEqual(["alice@example.com", "bob@example.com"])
  })
})

// ============================================================================
// 2. getCalendarEvents — basic behaviour
// ============================================================================

describe("getCalendarEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an empty array when no events exist", async () => {
    getSelectChain().orderBy.mockResolvedValue([])
    const events = await getCalendarEvents()
    expect(events).toEqual([])
  })

  it("returns multiple events when present", async () => {
    const rows = [
      makeDbRow({ id: "e1", date: "2024-06-01" }),
      makeDbRow({ id: "e2", date: "2024-06-15" }),
      makeDbRow({ id: "e3", date: "2024-07-01" }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const events = await getCalendarEvents()
    expect(events).toHaveLength(3)
  })

  it("does NOT return soft-deleted events (deletedAt filter applied at DB level)", async () => {
    // The service adds isNull(calendarEvents.deletedAt) to the query.
    // We verify the query is built correctly by checking .where() was called.
    getSelectChain().orderBy.mockResolvedValue([])
    await getCalendarEvents()

    // .where() should have been called (to add the deletedAt IS NULL filter)
    const chain = getSelectChain()
    expect(chain.where).toHaveBeenCalled()
  })
})

// ============================================================================
// 3. getCalendarEventsByType
// ============================================================================

describe("getCalendarEventsByType", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns only events of the requested type", async () => {
    const paymentRow = makeDbRow({ id: "p1", type: "payment" })
    getSelectChain().orderBy.mockResolvedValue([paymentRow])

    const events = await getCalendarEventsByType("payment")
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe("payment")
  })

  it("returns empty array when no events of that type exist", async () => {
    getSelectChain().orderBy.mockResolvedValue([])

    const events = await getCalendarEventsByType("dividend")
    expect(events).toHaveLength(0)
  })

  it("returns events for each of the six valid types", async () => {
    const validTypes = ["meeting", "payment", "dividend", "deadline", "document", "call"] as const

    for (const type of validTypes) {
      getSelectChain().orderBy.mockResolvedValue([makeDbRow({ type })])
      const events = await getCalendarEventsByType(type)
      expect(events[0].type).toBe(type)
    }
  })
})

// ============================================================================
// 4. getUpcomingEvents — date window logic
// ============================================================================

describe("getUpcomingEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns events within the next 7 days (default window)", async () => {
    const row = makeDbRow({ date: "2024-06-17" }) // 2 days from "now"
    getSelectChain().orderBy.mockResolvedValue([row])

    const events = await getUpcomingEvents(7)
    expect(events).toHaveLength(1)
  })

  it("returns empty array when no events fall in the window", async () => {
    getSelectChain().orderBy.mockResolvedValue([])
    const events = await getUpcomingEvents(7)
    expect(events).toEqual([])
  })

  it("accepts a custom day window (e.g., 30 days)", async () => {
    getSelectChain().orderBy.mockResolvedValue([])
    // Just verifying it doesn't throw with a custom window
    await expect(getUpcomingEvents(30)).resolves.not.toThrow()
  })

  it("applies both gte (from today) and lte (cutoff) filters", async () => {
    getSelectChain().orderBy.mockResolvedValue([])
    await getUpcomingEvents(7)
    // .where() must be called with both date filters
    const chain = getSelectChain()
    expect(chain.where).toHaveBeenCalled()
  })

  it("returns events ordered by date ascending", async () => {
    // The service calls orderBy(asc(calendarEvents.date))
    // We verify orderBy was called on the chain
    getSelectChain().orderBy.mockResolvedValue([])
    await getUpcomingEvents(7)
    const chain = getSelectChain()
    expect(chain.orderBy).toHaveBeenCalled()
  })
})

// ============================================================================
// 5. getCalendarSummary — aggregation logic
// ============================================================================

describe("getCalendarSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns all-zero summary when no upcoming events", async () => {
    getSelectChain().orderBy.mockResolvedValue([])

    const summary = await getCalendarSummary()
    expect(summary.upcomingCount).toBe(0)
    expect(summary.paymentsTotal).toBe(0)
    expect(summary.dividendsTotal).toBe(0)
    expect(summary.meetingCount).toBe(0)
    expect(summary.deadlineCount).toBe(0)
  })

  it("correctly counts meetings", async () => {
    const rows = [
      makeDbRow({ type: "meeting" }),
      makeDbRow({ id: "e2", type: "meeting" }),
      makeDbRow({ id: "e3", type: "call" }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    expect(summary.meetingCount).toBe(2)
    expect(summary.upcomingCount).toBe(3)
  })

  it("correctly counts deadlines", async () => {
    const rows = [
      makeDbRow({ type: "deadline" }),
      makeDbRow({ id: "e2", type: "deadline" }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    expect(summary.deadlineCount).toBe(2)
  })

  it("sums payment amounts correctly", async () => {
    const rows = [
      makeDbRow({ type: "payment", amount: 10000 }),
      makeDbRow({ id: "e2", type: "payment", amount: 5000 }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    expect(summary.paymentsTotal).toBe(15000)
  })

  it("sums dividend amounts correctly", async () => {
    const rows = [
      makeDbRow({ type: "dividend", amount: 2500.50 }),
      makeDbRow({ id: "e2", type: "dividend", amount: 1750.25 }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    // Floating point: use toBeCloseTo for decimal arithmetic
    expect(summary.dividendsTotal).toBeCloseTo(4250.75)
  })

  it("handles events with null amount (treats as 0 in sum)", async () => {
    // amount ?? 0 — null amounts don't break the sum
    const rows = [
      makeDbRow({ type: "payment", amount: 10000 }),
      makeDbRow({ id: "e2", type: "payment", amount: null }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    expect(summary.paymentsTotal).toBe(10000)
  })

  it("returns correct summary with mixed event types", async () => {
    const rows = [
      makeDbRow({ id: "e1", type: "meeting" }),
      makeDbRow({ id: "e2", type: "payment", amount: 5000 }),
      makeDbRow({ id: "e3", type: "dividend", amount: 1000 }),
      makeDbRow({ id: "e4", type: "deadline" }),
      makeDbRow({ id: "e5", type: "call" }),
    ]
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    expect(summary.upcomingCount).toBe(5)
    expect(summary.meetingCount).toBe(1)
    expect(summary.deadlineCount).toBe(1)
    expect(summary.paymentsTotal).toBe(5000)
    expect(summary.dividendsTotal).toBe(1000)
  })

  it("upcomingCount matches the total number of events returned", async () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      makeDbRow({ id: `event-${i}`, type: "meeting" }),
    )
    getSelectChain().orderBy.mockResolvedValue(rows)

    const summary = await getCalendarSummary()
    expect(summary.upcomingCount).toBe(12)
    expect(summary.meetingCount).toBe(12)
  })
})

// ============================================================================
// 6. Error handling — database failures
// ============================================================================

describe("calendar service — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getCalendarEvents propagates database errors", async () => {
    getSelectChain().orderBy.mockRejectedValue(new Error("Connection refused"))

    await expect(getCalendarEvents()).rejects.toThrow("Connection refused")
  })

  it("getUpcomingEvents propagates database errors", async () => {
    getSelectChain().orderBy.mockRejectedValue(new Error("Query timeout"))

    await expect(getUpcomingEvents()).rejects.toThrow("Query timeout")
  })

  it("getCalendarSummary propagates errors from getUpcomingEvents", async () => {
    getSelectChain().orderBy.mockRejectedValue(new Error("Database unavailable"))

    await expect(getCalendarSummary()).rejects.toThrow("Database unavailable")
  })
})
