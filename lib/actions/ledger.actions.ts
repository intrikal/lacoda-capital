"use server"

import { requireAuth } from "@/lib/auth"
import {
  exportLedgerCSV,
  type LedgerFilters,
} from "@/lib/services/ledger.service"
import { captureServerEvent } from "@/lib/analytics/server"

/**
 * exportLedgerAction — Server action to export ledger as CSV.
 *
 * Called from the /app/ledger page when user clicks "Export CSV".
 * Returns a CSV string that the client downloads as a .csv file.
 */
export async function exportLedgerAction(filters: {
  action?: string
  targetType?: string
  actorId?: string
  before?: string // ISO date string
  after?: string // ISO date string
  search?: string
}): Promise<string> {
  const session = await requireAuth()

  if (!session.orgId) {
    throw new Error("Not authorized")
  }

  const ledgerFilters: LedgerFilters = {
    orgId: session.orgId,
    action: filters.action,
    targetType: filters.targetType,
    actorId: filters.actorId,
    before: filters.before ? new Date(filters.before) : undefined,
    after: filters.after ? new Date(filters.after) : undefined,
    search: filters.search,
  }

  const csv = await exportLedgerCSV(ledgerFilters)
  captureServerEvent(session.userId, "ledger.exported")
  return csv
}
