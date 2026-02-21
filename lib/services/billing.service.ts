/**
 * billing.service.ts
 *
 * Service layer for client billing — advisory fee invoices, fee structure,
 * and annual billing summaries. This is a read-only service for clients;
 * fee changes are managed exclusively by advisors.
 *
 * Architecture position:
 *   Client page → useClientBilling hook → billingService → (mock data today, Drizzle tomorrow)
 *
 * tRPC swap path:
 *   `trpc.client.billing.history.useQuery()`
 *   `trpc.client.billing.summary.useQuery()`
 */

import { mockBillingHistory } from "@/lib/mock/data"
import type { BillingRecord } from "@/lib/mock/types"

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations (billing is advisor-managed, client is read-only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the full billing history for the current client, most recent first.
 */
export async function getBillingHistory(): Promise<BillingRecord[]> {
  return Promise.resolve([...mockBillingHistory])
}

/**
 * Fetch a single invoice by ID.
 */
export async function getBillingRecordById(id: string): Promise<BillingRecord | undefined> {
  return Promise.resolve(mockBillingHistory.find((r) => r.id === id))
}

/**
 * Computed billing summary for the top-level stat cards.
 * Calculates YTD fees paid, the next upcoming payment, and the effective rate.
 */
export async function getBillingSummary() {
  const records = mockBillingHistory
  const currentYear = new Date().getFullYear().toString()

  // YTD = all paid records in the current calendar year
  const ytdPaid = records
    .filter((r) => r.status === "paid" && r.paidDate?.startsWith(currentYear))
    .reduce((sum, r) => sum + r.amount, 0)

  // Next upcoming payment
  const upcoming = records.find((r) => r.status === "upcoming" || r.status === "due")

  // Effective rate is consistent across all records (0.85% + 0.05% custody = 0.90%)
  const effectiveRate = records[0]?.effectiveRate ?? 0.0085

  return Promise.resolve({
    ytdFeesPaid: ytdPaid,
    nextPaymentAmount: upcoming?.amount ?? 0,
    nextPaymentDue: upcoming?.dueDate ?? null,
    effectiveRate,
    annualRate: effectiveRate * 4, // quarterly × 4 approximation
  })
}
