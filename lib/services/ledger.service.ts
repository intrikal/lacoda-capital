// ─────────────────────────────────────────────────────────────────────────────
// LEDGER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockLedgerEntries } from "@/lib/mock/data"
import type { LedgerEntry, LedgerActionType } from "@/lib/mock/types"

export async function getLedgerEntries(): Promise<LedgerEntry[]> {
  // REAL: return db.query.ledgerEvents.findMany({ orderBy: desc(ledgerEvents.timestamp) })
  return mockLedgerEntries
}

export async function getLedgerEntryById(id: string): Promise<LedgerEntry | undefined> {
  // REAL: return db.query.ledgerEvents.findFirst({ where: eq(ledgerEvents.id, id) })
  return mockLedgerEntries.find((e) => e.id === id)
}

export async function getLedgerEntriesByAction(action: LedgerActionType): Promise<LedgerEntry[]> {
  // REAL: return db.query.ledgerEvents.findMany({ where: eq(ledgerEvents.action, action) })
  return mockLedgerEntries.filter((e) => e.action === action)
}

export async function getLedgerEntriesByUser(user: string): Promise<LedgerEntry[]> {
  // REAL: return db.query.ledgerEvents.findMany({ where: eq(ledgerEvents.actorUserId, userId) })
  return mockLedgerEntries.filter((e) => e.user === user)
}

export async function getSensitiveLedgerEntries(): Promise<LedgerEntry[]> {
  // REAL: return db.query.ledgerEvents.findMany({ where: eq(ledgerEvents.isSensitive, true) })
  return mockLedgerEntries.filter((e) => e.isSensitive)
}
