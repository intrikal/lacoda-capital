import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  calculatePEMetrics,
  recalculateCachedTotals,
  isOverdue,
} from "@/lib/calculations/pe-metrics"
import type { CapitalEventSummary } from "@/lib/calculations/pe-metrics"

/**
 * Integration tests for capital event flows.
 *
 * These test realistic PE fund scenarios end-to-end through the calculation layer.
 */

describe("PE asset with $10M commitment + 3 capital calls", () => {
  const commitment = 10_000_000

  it("3 calls of $2M each (all paid) → calledCapitalCached = $6M", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
    ]

    const { calledCapital } = recalculateCachedTotals(events)
    expect(calledCapital).toBe(6_000_000)

    const metrics = calculatePEMetrics({
      committedCapital: commitment,
      calledCapital,
      distributed: 0,
      currentValue: 7_000_000,
    })

    expect(metrics.remainingCommitment).toBe(4_000_000)
    expect(metrics.tvpi).toBeCloseTo(1.167, 2) // 7M / 6M
    expect(metrics.dpi).toBeCloseTo(0, 2)
  })

  it("add $1M distribution → distributed_cached = $1M, TVPI correct", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "distribution", status: "received", amount: 1_000_000, deletedAt: null },
    ]

    const { calledCapital, distributed } = recalculateCachedTotals(events)
    expect(calledCapital).toBe(6_000_000)
    expect(distributed).toBe(1_000_000)

    const currentNAV = 6_500_000 // current value after distribution
    const metrics = calculatePEMetrics({
      committedCapital: commitment,
      calledCapital,
      distributed,
      currentValue: currentNAV,
    })

    // TVPI = (6.5M + 1M) / 6M = 1.25x
    expect(metrics.tvpi).toBeCloseTo(1.25, 2)
    // DPI = 1M / 6M = 0.167x
    expect(metrics.dpi).toBeCloseTo(0.167, 2)
    // RVPI = 6.5M / 6M = 1.083x
    expect(metrics.rvpi).toBeCloseTo(1.083, 2)
  })
})

describe("overdue detection integration", () => {
  it("pending call with due_date 2 days ago → overdue", () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    expect(isOverdue("pending", twoDaysAgo)).toBe(true)
  })

  it("paid call with past due_date → NOT overdue", () => {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)

    expect(isOverdue("paid", lastWeek)).toBe(false)
  })
})

describe("archive event → cached totals recalculated", () => {
  it("archiving a paid call reduces calledCapital", () => {
    const now = new Date()

    const eventsBefore: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 3_000_000, deletedAt: null },
    ]

    const { calledCapital: before } = recalculateCachedTotals(eventsBefore)
    expect(before).toBe(5_000_000)

    // After archiving the second call
    const eventsAfter: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 3_000_000, deletedAt: now }, // archived
    ]

    const { calledCapital: after } = recalculateCachedTotals(eventsAfter)
    expect(after).toBe(2_000_000)
  })

  it("archiving a distribution reduces distributed total", () => {
    const now = new Date()

    const events: CapitalEventSummary[] = [
      { eventType: "distribution", status: "received", amount: 1_000_000, deletedAt: null },
      { eventType: "distribution", status: "received", amount: 500_000, deletedAt: now }, // archived
    ]

    const { distributed } = recalculateCachedTotals(events)
    expect(distributed).toBe(1_000_000)
  })
})

describe("edge cases", () => {
  it("capital call on non-PE asset → metrics still calculate (no asset class check in calc)", () => {
    // The calculation module is asset-class-agnostic — the UI hides the tab for non-PE
    const metrics = calculatePEMetrics({
      committedCapital: 0,
      calledCapital: 0,
      distributed: 0,
      currentValue: 100_000,
    })

    expect(metrics.tvpi).toBeNull() // No called capital
    expect(metrics.remainingCommitment).toBe(0)
  })

  it("called > committed (over-commitment) → allowed with warning", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 6_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 6_000_000, deletedAt: null },
    ]

    const { calledCapital } = recalculateCachedTotals(events)
    expect(calledCapital).toBe(12_000_000)

    const metrics = calculatePEMetrics({
      committedCapital: 10_000_000,
      calledCapital,
      distributed: 0,
      currentValue: 15_000_000,
    })

    expect(metrics.isOverCommitted).toBe(true)
    expect(metrics.remainingCommitment).toBe(-2_000_000)
    expect(metrics.tvpi).toBeCloseTo(1.25, 2) // 15M / 12M
  })

  it("distribution > called (return of capital) → DPI > 1.0", () => {
    const metrics = calculatePEMetrics({
      committedCapital: 10_000_000,
      calledCapital: 5_000_000,
      distributed: 6_000_000,
      currentValue: 3_000_000,
    })

    expect(metrics.dpi).toBeCloseTo(1.2, 1) // 6M / 5M
    expect(metrics.isFullyReturned).toBe(true)
  })

  it("recallable distribution → reduces distributed, increases re-call capacity", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 5_000_000, deletedAt: null },
      { eventType: "distribution", status: "received", amount: 2_000_000, deletedAt: null },
      { eventType: "recallable", status: "received", amount: 500_000, deletedAt: null },
    ]

    const { calledCapital, distributed } = recalculateCachedTotals(events)
    expect(calledCapital).toBe(5_000_000)
    expect(distributed).toBe(1_500_000) // 2M - 500K recallable
  })
})
