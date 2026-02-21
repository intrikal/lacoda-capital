/**
 * transfers.service.ts
 *
 * Service layer for client-initiated fund transfer requests.
 * Covers deposits (bank → investment), withdrawals (investment → bank),
 * and internal transfers (between investment accounts).
 *
 * Architecture position:
 *   Client page → useClientTransfers hook → transfersService → (mock data today, Drizzle tomorrow)
 *
 * tRPC swap path:
 *   `trpc.client.transfers.list.useQuery()`
 *   `trpc.client.transfers.create.useMutation()`
 */

import { mockClientTransfers } from "@/lib/mock/data"
import type { ClientTransfer } from "@/lib/mock/types"

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all transfer requests for the current client, newest first.
 */
export async function getClientTransfers(): Promise<ClientTransfer[]> {
  return Promise.resolve([...mockClientTransfers])
}

/**
 * Fetch a single transfer by ID.
 */
export async function getTransferById(id: string): Promise<ClientTransfer | undefined> {
  return Promise.resolve(mockClientTransfers.find((t) => t.id === id))
}

/**
 * Computed transfer summary used in the summary stat cards at the top of the page.
 */
export async function getTransferSummary() {
  const transfers = mockClientTransfers
  const pending = transfers.filter((t) => t.status === "pending" || t.status === "processing")
  const completed = transfers.filter((t) => t.status === "completed")
  const completedThisMonth = completed.filter((t) => {
    const d = new Date(t.completedAt ?? t.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return Promise.resolve({
    pendingCount: pending.length,
    pendingTotal: pending.reduce((sum, t) => sum + t.amount, 0),
    completedThisMonthCount: completedThisMonth.length,
    completedThisMonthTotal: completedThisMonth.reduce((sum, t) => sum + t.amount, 0),
  })
}
