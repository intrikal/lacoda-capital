"use server"

/**
 * billing.service.ts
 *
 * Service layer for billing records (advisory fee invoices).
 * Reads from the billing_records table via Drizzle ORM.
 */

import { db } from "@/app/db"
import { billingRecords } from "@/app/db/schema"
import { eq, desc, isNull } from "drizzle-orm"
import type { BillingRecord } from "@/lib/types/mock"

/** Map a DB billing_records row to the BillingRecord mock type shape. */
function toBillingRecord(row: typeof billingRecords.$inferSelect): BillingRecord {
  return {
    id: row.id,
    period: row.period,
    amount: row.amount,
    aum: row.aum,
    status: row.status as BillingRecord["status"],
    dueDate: row.dueDate,
    paidDate: row.paidDate ?? undefined,
    effectiveRate: row.effectiveRate,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations (billing is advisor-managed, client is read-only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the full billing history for the current client, most recent first.
 */
export async function getBillingHistory(): Promise<BillingRecord[]> {
  const rows = await db
    .select()
    .from(billingRecords)
    .where(isNull(billingRecords.deletedAt))
    .orderBy(desc(billingRecords.dueDate))
  return rows.map(toBillingRecord)
}

/**
 * Fetch a single invoice by ID.
 */
export async function getBillingRecordById(id: string): Promise<BillingRecord | undefined> {
  const rows = await db.select().from(billingRecords).where(eq(billingRecords.id, id))
  return rows[0] ? toBillingRecord(rows[0]) : undefined
}

/**
 * Computed billing summary for the top-level stat cards.
 * Calculates YTD fees paid, the next upcoming payment, and the effective rate.
 */
export async function getBillingSummary() {
  const records = await getBillingHistory()
  const currentYear = new Date().getFullYear().toString()

  // YTD = all paid records in the current calendar year
  const ytdPaid = records
    .filter((r) => r.status === "paid" && r.paidDate?.startsWith(currentYear))
    .reduce((sum, r) => sum + r.amount, 0)

  // Next upcoming payment
  const upcoming = records.find((r) => r.status === "upcoming" || r.status === "due")

  // Effective rate is consistent across all records
  const effectiveRate = records[0]?.effectiveRate ?? 0.0085

  return {
    ytdFeesPaid: ytdPaid,
    nextPaymentAmount: upcoming?.amount ?? 0,
    nextPaymentDue: upcoming?.dueDate ?? null,
    effectiveRate,
    annualRate: effectiveRate * 4, // quarterly x 4 approximation
  }
}
