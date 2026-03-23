"use server"

/**
 * transfers.service.ts
 *
 * Service layer for client-initiated fund transfer requests.
 * No transfers table exists in the DB schema. Data is kept as static seed below.
 */

import type { ClientTransfer } from "@/lib/types/mock"

const seedTransfers: ClientTransfer[] = [
  {
    id: "txfr-001",
    type: "deposit",
    amount: 25_000,
    fromAccount: "Chase Bank ****4532",
    toAccount: "Brokerage Account",
    status: "processing",
    frequency: "One-time",
    createdAt: "2024-01-20T10:30:00Z",
    reference: "DEP-2024-0120",
  },
  {
    id: "txfr-002",
    type: "transfer",
    amount: 10_000,
    fromAccount: "Brokerage Account",
    toAccount: "Roth IRA",
    status: "pending",
    frequency: "One-time",
    createdAt: "2024-01-22T14:15:00Z",
    reference: "INT-2024-0122",
  },
  {
    id: "txfr-003",
    type: "deposit",
    amount: 5_000,
    fromAccount: "Bank of America ****7891",
    toAccount: "Retirement IRA",
    status: "completed",
    frequency: "Monthly",
    createdAt: "2024-01-01T09:00:00Z",
    completedAt: "2024-01-03T16:45:00Z",
    reference: "DEP-2024-0101",
  },
  {
    id: "txfr-004",
    type: "withdrawal",
    amount: 8_500,
    fromAccount: "Brokerage Account",
    toAccount: "Chase Bank ****4532",
    status: "completed",
    frequency: "One-time",
    createdAt: "2023-12-28T11:00:00Z",
    completedAt: "2023-12-30T14:20:00Z",
    reference: "WDR-2023-1228",
  },
  {
    id: "txfr-005",
    type: "deposit",
    amount: 15_000,
    fromAccount: "Chase Bank ****4532",
    toAccount: "Brokerage Account",
    status: "completed",
    frequency: "One-time",
    createdAt: "2023-12-15T09:30:00Z",
    completedAt: "2023-12-17T11:00:00Z",
    reference: "DEP-2023-1215",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all transfer requests for the current client, newest first.
 */
export async function getClientTransfers(): Promise<ClientTransfer[]> {
  return [...seedTransfers]
}

/**
 * Fetch a single transfer by ID.
 */
export async function getTransferById(id: string): Promise<ClientTransfer | undefined> {
  return seedTransfers.find((t) => t.id === id)
}

/**
 * Computed transfer summary used in the summary stat cards at the top of the page.
 */
export async function getTransferSummary() {
  const transfers = seedTransfers
  const pending = transfers.filter((t) => t.status === "pending" || t.status === "processing")
  const completed = transfers.filter((t) => t.status === "completed")
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
