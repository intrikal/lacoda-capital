"use server"

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { ledgerEvents } from "@/app/db/schema"
import { eq, desc } from "drizzle-orm"
import type { LedgerEntry, LedgerActionType } from "@/lib/types/mock"

/** Map a DB ledger_events row to the LedgerEntry mock type shape. */
function toLedgerEntry(row: typeof ledgerEvents.$inferSelect): LedgerEntry {
  return {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    action: row.action as LedgerActionType,
    user: row.actorUserId ?? "system",
    entity: row.targetId,
    entityType: row.targetType as LedgerEntry["entityType"],
    details: (row.payload as Record<string, unknown>)?.details as string ?? "",
    isSensitive: ((row.payload as Record<string, unknown>)?.isSensitive as boolean) ?? false,
    ipAddress: row.ipAddress ?? "",
  }
}

export async function getLedgerEntries(): Promise<LedgerEntry[]> {
  const rows = await db.select().from(ledgerEvents).orderBy(desc(ledgerEvents.createdAt))
  return rows.map(toLedgerEntry)
}

export async function getLedgerEntryById(id: string): Promise<LedgerEntry | undefined> {
  const rows = await db.select().from(ledgerEvents).where(eq(ledgerEvents.id, id))
  return rows[0] ? toLedgerEntry(rows[0]) : undefined
}

export async function getLedgerEntriesByAction(action: LedgerActionType): Promise<LedgerEntry[]> {
  const rows = await db.select().from(ledgerEvents).where(eq(ledgerEvents.action, action as typeof ledgerEvents.action.enumValues[number]))
  return rows.map(toLedgerEntry)
}

export async function getLedgerEntriesByUser(user: string): Promise<LedgerEntry[]> {
  const rows = await db.select().from(ledgerEvents).where(eq(ledgerEvents.actorUserId, user))
  return rows.map(toLedgerEntry)
}

export async function getSensitiveLedgerEntries(): Promise<LedgerEntry[]> {
  // isSensitive is stored inside the payload JSONB — filter in application layer
  const rows = await db.select().from(ledgerEvents).orderBy(desc(ledgerEvents.createdAt))
  return rows.map(toLedgerEntry).filter((e) => e.isSensitive)
}
