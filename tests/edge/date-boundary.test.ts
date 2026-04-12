/**
 * Financial Date Boundary Edge Cases
 *
 * Tests date handling at dangerous boundaries: year-end, midnight UTC,
 * DST transitions, fiscal quarters, leap years, and exact-midnight valuations.
 *
 * These tests exercise:
 *   - Zod schema validation (valuation, compliance)
 *   - buildEndDateTime from lib/schedule/google-calendar.ts
 *   - Pure Date arithmetic matching the patterns in our action files
 */

import { describe, it, expect } from "vitest"
import { createValuationSchema } from "@/lib/validations/valuation.schema"
import { createComplianceControlSchema } from "@/lib/validations/compliance.schema"
import { buildEndDateTime } from "@/lib/schedule/google-calendar"

describe("Financial date boundary edge cases", () => {
  // ── 1. Valuation at 11:59:59 PM Dec 31 → belongs to current year ──────
  it("valuation at 11:59:59 PM Dec 31 belongs to current year, not next year", () => {
    const asOfDate = "2025-12-31T23:59:59.000Z"

    const result = createValuationSchema.safeParse({
      assetId: "00000000-0000-0000-0000-000000000001",
      asOfDate,
      value: 1_000_000,
    })
    expect(result.success).toBe(true)

    // Parse the date and verify year assignment
    const parsed = new Date(asOfDate)
    expect(parsed.getUTCFullYear()).toBe(2025)
    expect(parsed.getUTCMonth()).toBe(11) // December (0-indexed)
    expect(parsed.getUTCDate()).toBe(31)

    // One second later is the next year
    const nextSecond = new Date(parsed.getTime() + 1000)
    expect(nextSecond.getUTCFullYear()).toBe(2026)
  })

  // ── 2. Compliance deadline: midnight UTC vs midnight local ────────────
  it("compliance deadline at midnight UTC vs midnight local → correct timezone handling", () => {
    const midnightUTC = "2026-03-15T00:00:00.000Z"
    const midnightEST = "2026-03-15T00:00:00.000-05:00" // EST = UTC-5

    const utcDate = new Date(midnightUTC)
    const estDate = new Date(midnightEST)

    // These are 5 hours apart — NOT the same instant
    expect(utcDate.getTime()).not.toBe(estDate.getTime())
    expect(estDate.getTime() - utcDate.getTime()).toBe(5 * 60 * 60 * 1000) // 5 hours

    // Both are valid compliance due dates
    const resultUTC = createComplianceControlSchema.safeParse({
      code: "KYC-001",
      name: "Annual KYC Review",
      dueDate: midnightUTC,
    })
    const resultEST = createComplianceControlSchema.safeParse({
      code: "KYC-002",
      name: "Annual KYC Review",
      dueDate: midnightEST,
    })
    expect(resultUTC.success).toBe(true)
    expect(resultEST.success).toBe(true)

    // If you compare "is it overdue?" in UTC, the EST deadline is later
    const checkTime = new Date("2026-03-15T03:00:00.000Z")
    const isOverdueUTC = checkTime > utcDate
    const isOverdueEST = checkTime > estDate
    expect(isOverdueUTC).toBe(true)   // 3 AM UTC is past midnight UTC
    expect(isOverdueEST).toBe(false)  // 3 AM UTC is before midnight EST (which is 5 AM UTC)
  })

  // ── 3. Calendar event spanning DST transition → correct duration ──────
  it("calendar event spanning DST transition maintains correct duration", () => {
    // US DST "spring forward" 2026: March 8 at 2:00 AM
    // Schedule a 120-minute meeting starting at 1:00 AM EST
    const startIso = "2026-03-08T06:00:00.000Z" // 1:00 AM EST = 6:00 AM UTC
    const durationMinutes = 120

    const endIso = buildEndDateTime(startIso, durationMinutes)
    const start = new Date(startIso)
    const end = new Date(endIso)

    // Duration should always be exactly 120 minutes in real (UTC) time
    const actualMinutes = (end.getTime() - start.getTime()) / (60 * 1000)
    expect(actualMinutes).toBe(120)

    // The end time should be 8:00 AM UTC regardless of DST
    expect(end.getUTCHours()).toBe(8)
    expect(end.getUTCMinutes()).toBe(0)
  })

  // ── 4. Fiscal Q4 (Oct–Dec) → correct date range ──────────────────────
  it("fiscal quarter Q4 (Oct-Dec) produces correct date range", () => {
    const fiscalYear = 2025

    // Q4 = October 1 through December 31
    const q4Start = new Date(Date.UTC(fiscalYear, 9, 1))   // Oct 1 (month 9, 0-indexed)
    const q4End = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999)) // Dec 31 end-of-day

    expect(q4Start.getUTCMonth()).toBe(9)   // October
    expect(q4Start.getUTCDate()).toBe(1)
    expect(q4End.getUTCMonth()).toBe(11)    // December
    expect(q4End.getUTCDate()).toBe(31)

    // Q4 should span exactly 92 days in 2025 (Oct=31, Nov=30, Dec=31)
    const daySpan = Math.ceil(
      (q4End.getTime() - q4Start.getTime()) / (24 * 60 * 60 * 1000)
    )
    expect(daySpan).toBe(92) // 31 + 30 + 31 = 92

    // A valuation on Oct 1 should be IN Q4
    const octValuation = new Date(Date.UTC(fiscalYear, 9, 1, 12, 0, 0))
    expect(octValuation >= q4Start && octValuation <= q4End).toBe(true)

    // A valuation on Sep 30 should NOT be in Q4
    const sepValuation = new Date(Date.UTC(fiscalYear, 8, 30, 23, 59, 59))
    expect(sepValuation >= q4Start && sepValuation <= q4End).toBe(false)
  })

  // ── 5. Feb 29 leap year → no crash ───────────────────────────────────
  it("monthly report generated on Feb 29 (leap year) does not crash", () => {
    // 2028 is a leap year
    const leapDate = new Date(Date.UTC(2028, 1, 29)) // Feb 29, 2028
    expect(leapDate.getUTCDate()).toBe(29)
    expect(leapDate.getUTCMonth()).toBe(1) // February

    // Validate as a valuation date — should parse without error
    const result = createValuationSchema.safeParse({
      assetId: "00000000-0000-0000-0000-000000000001",
      asOfDate: leapDate.toISOString(),
      value: 500_000,
    })
    expect(result.success).toBe(true)

    // buildEndDateTime should work on leap day
    const endIso = buildEndDateTime(leapDate.toISOString(), 60)
    const end = new Date(endIso)
    expect(end.getUTCDate()).toBe(29) // Still Feb 29
    expect(end.getUTCHours()).toBe(1) // 0:00 + 60 min = 1:00

    // Non-leap year: Feb 29 doesn't exist → Date rolls to Mar 1
    const nonLeap = new Date(Date.UTC(2027, 1, 29))
    expect(nonLeap.getUTCMonth()).toBe(2) // March (rolled over)
    expect(nonLeap.getUTCDate()).toBe(1)
  })

  // ── 6. Asset valued at midnight exactly → unambiguous date ────────────
  it("asset valued at midnight exactly is unambiguously assigned to that date", () => {
    const midnightExact = "2026-06-15T00:00:00.000Z"

    const result = createValuationSchema.safeParse({
      assetId: "00000000-0000-0000-0000-000000000001",
      asOfDate: midnightExact,
      value: 2_500_000,
    })
    expect(result.success).toBe(true)

    const parsed = new Date(midnightExact)

    // Midnight belongs to June 15, not June 14
    expect(parsed.getUTCFullYear()).toBe(2026)
    expect(parsed.getUTCMonth()).toBe(5) // June (0-indexed)
    expect(parsed.getUTCDate()).toBe(15)

    // One millisecond before midnight is still June 14
    const justBefore = new Date(parsed.getTime() - 1)
    expect(justBefore.getUTCDate()).toBe(14)

    // buildEndDateTime from midnight produces same-day result
    const endIso = buildEndDateTime(midnightExact, 480) // 8-hour workday
    const end = new Date(endIso)
    expect(end.getUTCDate()).toBe(15) // still June 15
    expect(end.getUTCHours()).toBe(8)
  })
})
