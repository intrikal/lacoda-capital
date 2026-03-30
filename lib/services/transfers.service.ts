"use server"

/**
 * transfers.service.ts
 *
 * Service layer for client-initiated fund transfer requests.
 * Queries the transfers table via Drizzle ORM.
 */

import { db } from "@/app/db"
import { transfers } from "@/app/db/schema"
import { eq, isNull } from "drizzle-orm"
import type { ClientTransfer } from "@/lib/types/mock"

/** Map a DB transfers row to the ClientTransfer mock type shape. */
function toTransfer(row: typeof transfers.$inferSelect): ClientTransfer {
  return {
    id: row.id,
    type: row.type as ClientTransfer["type"],
    amount: row.amount,
    fromAccount: row.fromAccount,
    toAccount: row.toAccount,
    status: row.status as ClientTransfer["status"],
    frequency: row.frequency,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    reference: row.reference ?? undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all transfer requests for the current client, newest first.
 */
export async function getClientTransfers(): Promise<ClientTransfer[]> {
  const rows = await db
    .select()
    .from(transfers)
    .where(isNull(transfers.deletedAt))
  return rows.map(toTransfer)
}

/**
 * Fetch a single transfer by ID.
 */
export async function getTransferById(id: string): Promise<ClientTransfer | undefined> {
  const rows = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, id))
  return rows[0] ? toTransfer(rows[0]) : undefined
}

/**
 * Computed transfer summary used in the summary stat cards at the top of the page.
 */
export async function getTransferSummary() {
  const all = await getClientTransfers()
  const pending = all.filter((t) => t.status === "pending" || t.status === "processing")
  const completed = all.filter((t) => t.status === "completed")
  const completedThisMonth = completed.filter((t) => {
    const d = new Date(t.completedAt ?? t.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return {
    pendingCount: pending.length,
    pendingTotal: pending.reduce((sum, t) => sum + t.amount, 0),
    completedThisMonthCount: completedThisMonth.length,
    completedThisMonthTotal: completedThisMonth.reduce((sum, t) => sum + t.amount, 0),
  }
}
