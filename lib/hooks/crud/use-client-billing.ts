/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-client-billing.ts
 * ============================================================================
 *
 * Read-only hook for the client's advisory fee billing history.
 * Advisory fees are set and managed by the advisor; this hook exposes
 * the data for the client to view their fee statements transparently.
 *
 * Architecture position:
 *   Billing page → useClientBilling() → Apollo useQuery → POST /api/graphql
 *
 * CONSUMERS:
 *   - app/(client)/client/billing/page.tsx (client read-only billing view)
 *
 * @example
 * ```tsx
 * const { billingHistory, stats, isLoading } = useClientBilling()
 * ```
 */

"use client"

import { useMemo } from "react"
import { useQuery } from "@apollo/client/react"
import { GET_BILLING_RECORDS } from "@/lib/graphql/operations/billing-record"
import type { BillingRecordItem } from "@/lib/hooks/crud/use-billing-records"

// ─── Computed stats shape (preserved from original hook) ─────────────────────

export interface BillingStats {
  /** Total advisory fees paid year-to-date */
  ytdFeesPaid: number
  /** Amount due on the next upcoming invoice */
  nextPaymentAmount: number
  /** ISO date string for next payment due date (null if none) */
  nextPaymentDue: string | null
  /** Effective annual fee rate, e.g. 0.0090 = 0.90% */
  effectiveRate: number
  /** Annualised rate label-friendly (effectiveRate × 4 quarters) */
  annualRate: number
}

// ─── Types (compatible with existing client billing page) ────────────────────

/** Maps DB BillingRecordItem to the shape the client billing page expects. */
export interface ClientBillingRecord {
  id: string
  period: string
  amount: number
  aum: number
  status: "paid" | "upcoming" | "due"
  dueDate: string
  paidDate?: string
  effectiveRate: number
}

interface GetBillingRecordsData {
  billingRecords: {
    items: BillingRecordItem[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseClientBillingReturn {
  billingHistory: ClientBillingRecord[]
  stats: BillingStats
  isLoading: boolean
}

const EMPTY_STATS: BillingStats = {
  ytdFeesPaid: 0,
  nextPaymentAmount: 0,
  nextPaymentDue: null,
  effectiveRate: 0.0085,
  annualRate: 0.034,
}

export function useClientBilling(): UseClientBillingReturn {
  const { data, loading } = useQuery<GetBillingRecordsData>(GET_BILLING_RECORDS)

  const items = data?.billingRecords?.items ?? []

  /** Map DB records to the shape the client billing page expects. */
  const billingHistory = useMemo<ClientBillingRecord[]>(
    () =>
      items.map((r) => ({
        id: r.id,
        period: r.period,
        amount: r.amount,
        aum: r.aum,
        status: r.status,
        dueDate: r.dueDate,
        paidDate: r.paidDate ?? undefined,
        effectiveRate: r.effectiveRate,
      })),
    [items]
  )

  /** Compute summary stats from the billing records. */
  const stats = useMemo<BillingStats>(() => {
    if (items.length === 0) return EMPTY_STATS

    const currentYear = new Date().getFullYear().toString()

    // YTD = all paid records in the current calendar year
    const ytdPaid = items
      .filter((r) => r.status === "paid" && r.paidDate?.startsWith(currentYear))
      .reduce((sum, r) => sum + r.amount, 0)

    // Next upcoming/due payment
    const upcoming = items.find((r) => r.status === "upcoming" || r.status === "due")

    // Effective rate from the first record
    const effectiveRate = items[0]?.effectiveRate ?? 0.0085

    return {
      ytdFeesPaid: ytdPaid,
      nextPaymentAmount: upcoming?.amount ?? 0,
      nextPaymentDue: upcoming?.dueDate ?? null,
      effectiveRate,
      annualRate: effectiveRate * 4,
    }
  }, [items])

  return { billingHistory, stats, isLoading: loading }
}
