/**
 * use-client-billing.ts
 *
 * Read-only hook for the client's advisory fee billing history.
 * Advisory fees are set and managed by the advisor; this hook exposes
 * the data for the client to view their fee statements transparently.
 *
 * Architecture position:
 *   Billing page → useClientBilling() → billingService → mock data
 *
 * tRPC swap path:
 *   Replace useEffect with:
 *   `const { data: history } = trpc.client.billing.history.useQuery()`
 *   `const { data: summary } = trpc.client.billing.summary.useQuery()`
 *
 * @example
 * ```tsx
 * const { billingHistory, stats, isLoading } = useClientBilling()
 * ```
 */

"use client"

import * as React from "react"
import { getBillingHistory, getBillingSummary } from "@/lib/services/billing.service"
import type { BillingRecord } from "@/lib/mock/types"

// ─────────────────────────────────────────────────────────────────────────────
// Computed stats shape
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseClientBillingReturn {
  billingHistory: BillingRecord[]
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
  const [billingHistory, setBillingHistory] = React.useState<BillingRecord[]>([])
  const [stats, setStats] = React.useState<BillingStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = React.useState(true)
  const hasFetched = React.useRef(false)

  React.useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    Promise.all([getBillingHistory(), getBillingSummary()]).then(
      ([history, summary]) => {
        setBillingHistory(history)
        setStats(summary)
        setIsLoading(false)
      }
    )
  }, [])

  return { billingHistory, stats, isLoading }
}
