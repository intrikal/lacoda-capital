import { describe, it, expect } from "vitest"
import {
  calculatePEMetrics,
  isValidStatusTransition,
  isOverdue,
  recalculateCachedTotals,
} from "@/lib/calculations/pe-metrics"
import type { CapitalEventSummary } from "@/lib/calculations/pe-metrics"

/**
 * Unit tests for PE/VC fund metrics.
 */

describe("calculatePEMetrics", () => {
  it("committed $10M, called $6M, distributed $3M → correct metrics", () => {
    const metrics = calculatePEMetrics({
      committedCapital: 10_000_000,
      calledCapital: 6_000_000,
      distributed: 3_000_000,
      currentValue: 8_000_000,
    })

    // Remaining = $10M - $6M = $4M
    expect(metrics.remainingCommitment).toBe(4_000_000)

    // TVPI = (currentValue + distributed) / called = ($8M + $3M) / $6M = 1.833x
    expect(metrics.tvpi).toBeCloseTo(11_000_000 / 6_000_000, 3)
    expect(metrics.tvpi).toBeCloseTo(1.833, 2)

    // DPI = distributed / called = $3M / $6M = 0.5x
    expect(metrics.dpi).toBeCloseTo(0.5, 3)

    // RVPI = currentValue / called = $8M / $6M = 1.333x
    expect(metrics.rvpi).toBeCloseTo(1.333, 2)

    expect(metrics.isOverCommitted).toBe(false)
    expect(metrics.isFullyReturned).toBe(false)
  })

  it("TVPI with zero paid in → return null, not division by zero", () => {
    const metrics = calculatePEMetrics({
      committedCapital: 10_000_000,
      calledCapital: 0,
      distributed: 0,
      currentValue: 0,
    })

    expect(metrics.tvpi).toBeNull()
    expect(metrics.dpi).toBeNull()
    expect(metrics.rvpi).toBeNull()
    expect(metrics.remainingCommitment).toBe(10_000_000)
  })

  it("over-commitment: called > committed → isOverCommitted = true", () => {
    const metrics = calculatePEMetrics({
      committedCapital: 5_000_000,
      calledCapital: 6_000_000,
      distributed: 0,
      currentValue: 7_000_000,
    })

    expect(metrics.isOverCommitted).toBe(true)
    expect(metrics.remainingCommitment).toBe(-1_000_000)
  })

  it("DPI > 1 → isFullyReturned = true", () => {
    const metrics = calculatePEMetrics({
      committedCapital: 10_000_000,
      calledCapital: 6_000_000,
      distributed: 7_000_000,
      currentValue: 2_000_000,
    })

    expect(metrics.dpi).toBeCloseTo(7_000_000 / 6_000_000, 3)
    expect(metrics.dpi!).toBeGreaterThan(1)
    expect(metrics.isFullyReturned).toBe(true)
  })

  it("very large commitment ($500M) → numeric precision preserved", () => {
    const metrics = calculatePEMetrics({
      committedCapital: 500_000_000,
      calledCapital: 250_000_000,
      distributed: 100_000_000,
      currentValue: 300_000_000,
    })

    expect(metrics.remainingCommitment).toBe(250_000_000)
    expect(metrics.tvpi).toBeCloseTo(1.6, 1) // (300M + 100M) / 250M = 1.6x
    expect(metrics.dpi).toBeCloseTo(0.4, 1) // 100M / 250M
  })
})

describe("isValidStatusTransition", () => {
  it("pending → paid is valid (capital call funded)", () => {
    expect(isValidStatusTransition("pending", "paid")).toBe(true)
  })

  it("pending → received is valid (distribution received)", () => {
    expect(isValidStatusTransition("pending", "received")).toBe(true)
  })

  it("pending → overdue is valid (set by pg_cron)", () => {
    expect(isValidStatusTransition("pending", "overdue")).toBe(true)
  })

  it("paid → pending is INVALID", () => {
    expect(isValidStatusTransition("paid", "pending")).toBe(false)
  })

  it("received → pending is INVALID", () => {
    expect(isValidStatusTransition("received", "pending")).toBe(false)
  })

  it("overdue → paid is valid (late payment accepted)", () => {
    expect(isValidStatusTransition("overdue", "paid")).toBe(true)
  })

  it("overdue → received is valid (late distribution received)", () => {
    expect(isValidStatusTransition("overdue", "received")).toBe(true)
  })

  it("paid → paid is INVALID (no self-transition)", () => {
    expect(isValidStatusTransition("paid", "paid")).toBe(false)
  })
})

describe("isOverdue", () => {
  it("pending call with due_date yesterday → overdue", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    expect(isOverdue("pending", yesterday)).toBe(true)
  })

  it("pending call with due_date tomorrow → NOT overdue", () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    expect(isOverdue("pending", tomorrow)).toBe(false)
  })

  it("paid call with past due_date → NOT overdue (already settled)", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    expect(isOverdue("paid", yesterday)).toBe(false)
  })

  it("pending call with no due_date → NOT overdue", () => {
    expect(isOverdue("pending", null)).toBe(false)
  })
})

describe("recalculateCachedTotals", () => {
  it("sums only paid calls and received distributions", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "pending", amount: 1_000_000, deletedAt: null },
      { eventType: "distribution", status: "received", amount: 500_000, deletedAt: null },
      { eventType: "distribution", status: "pending", amount: 300_000, deletedAt: null },
    ]

    const { calledCapital, distributed } = recalculateCachedTotals(events)

    expect(calledCapital).toBe(4_000_000) // 2M + 2M (not the pending 1M)
    expect(distributed).toBe(500_000) // only the received 500K
  })

  it("excludes soft-deleted events", () => {
    const now = new Date()
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 2_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 1_000_000, deletedAt: now }, // deleted
      { eventType: "distribution", status: "received", amount: 500_000, deletedAt: null },
    ]

    const { calledCapital, distributed } = recalculateCachedTotals(events)

    expect(calledCapital).toBe(2_000_000) // only the non-deleted call
    expect(distributed).toBe(500_000)
  })

  it("recallable distribution reduces distributed total", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "distribution", status: "received", amount: 1_000_000, deletedAt: null },
      { eventType: "recallable", status: "received", amount: 300_000, deletedAt: null },
    ]

    const { distributed } = recalculateCachedTotals(events)

    expect(distributed).toBe(700_000) // 1M - 300K
  })

  it("recallable > distributed → distributed floors at 0", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "distribution", status: "received", amount: 100_000, deletedAt: null },
      { eventType: "recallable", status: "received", amount: 500_000, deletedAt: null },
    ]

    const { distributed } = recalculateCachedTotals(events)

    expect(distributed).toBe(0) // Floored at 0
  })

  it("multiple calls on same date → all summed correctly", () => {
    const events: CapitalEventSummary[] = [
      { eventType: "capital_call", status: "paid", amount: 1_000_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 500_000, deletedAt: null },
      { eventType: "capital_call", status: "paid", amount: 250_000, deletedAt: null },
    ]

    const { calledCapital } = recalculateCachedTotals(events)

    expect(calledCapital).toBe(1_750_000)
  })
})
