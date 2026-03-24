// ============================================================================
// PE/VC Fund Metrics — TVPI, DPI, RVPI, Remaining Commitment
// ============================================================================
//
// Pure calculation functions with no DB dependency.
// ============================================================================

export interface PEMetricsInput {
  /** Total committed capital to the fund */
  committedCapital: number
  /** Total capital called (paid by LP) */
  calledCapital: number
  /** Total distributions received by LP */
  distributed: number
  /** Current NAV (net asset value / market value of remaining holdings) */
  currentValue: number
}

export interface PEMetrics {
  /** Remaining commitment = committed - called */
  remainingCommitment: number
  /** Total Value to Paid-In: (currentValue + distributed) / calledCapital */
  tvpi: number | null
  /** Distributions to Paid-In: distributed / calledCapital */
  dpi: number | null
  /** Residual Value to Paid-In: currentValue / calledCapital */
  rvpi: number | null
  /** Whether called > committed (over-commitment) */
  isOverCommitted: boolean
  /** Whether DPI > 1 (return of capital exceeded) */
  isFullyReturned: boolean
}

/**
 * Calculate PE/VC fund metrics.
 *
 * @returns Metrics object. TVPI/DPI/RVPI are null when calledCapital = 0
 *          (division by zero protection).
 */
export function calculatePEMetrics(input: PEMetricsInput): PEMetrics {
  const { committedCapital, calledCapital, distributed, currentValue } = input

  const remainingCommitment = committedCapital - calledCapital

  // Guard: division by zero when nothing has been called
  if (calledCapital === 0) {
    return {
      remainingCommitment,
      tvpi: null,
      dpi: null,
      rvpi: null,
      isOverCommitted: false,
      isFullyReturned: false,
    }
  }

  const tvpi = (currentValue + distributed) / calledCapital
  const dpi = distributed / calledCapital
  const rvpi = currentValue / calledCapital

  return {
    remainingCommitment,
    tvpi,
    dpi,
    rvpi,
    isOverCommitted: calledCapital > committedCapital,
    isFullyReturned: dpi > 1,
  }
}

// ─── Status transition validation ───────────────────────────────────────────

export type EventType = "capital_call" | "distribution" | "recallable"
export type EventStatus = "pending" | "paid" | "received" | "overdue"

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  pending: ["paid", "received", "overdue"],
  overdue: ["paid", "received"],
  paid: [],     // terminal for capital calls
  received: [], // terminal for distributions
}

/**
 * Check if a status transition is valid.
 *
 * Valid flows:
 * - Capital call:  pending → paid, pending → overdue → paid
 * - Distribution:  pending → received
 * - Overdue is set by pg_cron, can then transition to paid/received
 */
export function isValidStatusTransition(
  from: EventStatus,
  to: EventStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Check if a capital event is overdue.
 * Overdue = pending status AND due_date is in the past.
 */
export function isOverdue(
  status: EventStatus,
  dueDate: Date | null,
  now: Date = new Date()
): boolean {
  if (status !== "pending") return false
  if (!dueDate) return false
  return dueDate < now
}

// ─── Cache recalculation helpers ────────────────────────────────────────────

export interface CapitalEventSummary {
  eventType: EventType
  status: EventStatus
  amount: number
  deletedAt: Date | null
}

/**
 * Recalculate called_capital_cached and distributed_cached from events.
 * Only counts non-deleted events that are in a settled state.
 */
export function recalculateCachedTotals(events: CapitalEventSummary[]): {
  calledCapital: number
  distributed: number
} {
  let calledCapital = 0
  let distributed = 0

  for (const event of events) {
    // Skip soft-deleted events
    if (event.deletedAt !== null) continue

    if (event.eventType === "capital_call" && event.status === "paid") {
      calledCapital += event.amount
    } else if (event.eventType === "distribution" && event.status === "received") {
      distributed += event.amount
    } else if (event.eventType === "recallable" && event.status === "received") {
      // Recallable distributions reduce distributed total
      distributed -= event.amount
    }
  }

  return { calledCapital, distributed: Math.max(0, distributed) }
}
