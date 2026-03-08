/**
 * @deprecated This mock service has been replaced by the GraphQL backend.
 * Billing data now flows through:
 *   Apollo Client → GET_BILLING_RECORDS → billingRecordResolvers → PostgreSQL
 *
 * See: lib/graphql/resolvers/billing-record.ts
 * See: lib/hooks/crud/use-billing-records.ts (advisor CRUD)
 * See: lib/hooks/crud/use-client-billing.ts  (client read-only)
 *
 * This file is kept temporarily for reference and can be safely deleted.
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
