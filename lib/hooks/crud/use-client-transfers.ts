/**
 * use-client-transfers.ts
 *
 * Hook for client-initiated fund transfer requests. Clients can submit new
 * deposit, withdrawal, and internal transfer requests. The advisor approves
 * and processes them (approval flow is advisor-side, not modelled here).
 *
 * Architecture position:
 *   Transfers page → useClientTransfers() → transfersService → mock data
 *
 * tRPC swap path:
 *   Replace useEffect with `trpc.client.transfers.list.useQuery()`
 *   Replace addTransfer with `trpc.client.transfers.create.useMutation()`
 *
 * @example
 * ```tsx
 * const { transfers, addTransfer, stats, isLoading } = useClientTransfers()
 * addTransfer({ type: "deposit", amount: 5000, fromAccount: "Chase ****4532", ... })
 * ```
 */

"use client"

import * as React from "react"
import { getClientTransfers } from "@/lib/services/transfers.service"
import type { ClientTransfer, ClientTransferType, ClientTransferStatus } from "@/lib/types/mock"

// ─────────────────────────────────────────────────────────────────────────────
// Input shape for creating a new transfer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fields required to submit a new transfer request.
 * `id`, `status`, `createdAt`, and `reference` are system-generated.
 */
export interface CreateTransferInput {
  type: ClientTransferType
  amount: number
  fromAccount: string
  toAccount: string
  frequency: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed stats shape
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferStats {
  /** Number of transfers in pending or processing state */
  pendingCount: number
  /** Dollar total of all in-flight transfers */
  pendingTotal: number
  /** Count of transfers completed in the current calendar month */
  completedThisMonthCount: number
  /** Dollar total completed this calendar month */
  completedThisMonthTotal: number
  /** Total number of linked bank accounts (static for demo) */
  linkedAccountsCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseClientTransfersReturn {
  transfers: ClientTransfer[]
  stats: TransferStats
  isLoading: boolean
  /** Optimistically prepend a new transfer request with status "pending" */
  addTransfer: (input: CreateTransferInput) => void
}

const EMPTY_STATS: TransferStats = {
  pendingCount: 0,
  pendingTotal: 0,
  completedThisMonthCount: 0,
  completedThisMonthTotal: 0,
  linkedAccountsCount: 2,
}

function computeStats(transfers: ClientTransfer[]): TransferStats {
  const now = new Date()
  const pending = transfers.filter(
    (t) => t.status === "pending" || t.status === "processing"
  )
  const completedThisMonth = transfers.filter((t) => {
    if (t.status !== "completed") return false
    const d = new Date(t.completedAt ?? t.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  return {
    pendingCount: pending.length,
    pendingTotal: pending.reduce((s, t) => s + t.amount, 0),
    completedThisMonthCount: completedThisMonth.length,
    completedThisMonthTotal: completedThisMonth.reduce((s, t) => s + t.amount, 0),
    linkedAccountsCount: 2,
  }
}

export function useClientTransfers(): UseClientTransfersReturn {
  const [transfers, setTransfers] = React.useState<ClientTransfer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const hasFetched = React.useRef(false)

  React.useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    getClientTransfers().then((data) => {
      setTransfers(data)
      setIsLoading(false)
    })
  }, [])

  const stats = React.useMemo(() => computeStats(transfers), [transfers])

  const addTransfer = React.useCallback((input: CreateTransferInput) => {
    const newTransfer: ClientTransfer = {
      id: `txfr-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      status: "pending" as ClientTransferStatus,
      createdAt: new Date().toISOString(),
      reference: `REF-${Date.now()}`,
    }
    // Prepend so the newest request appears first
    setTransfers((prev) => [newTransfer, ...prev])
  }, [])

  return { transfers, stats, isLoading, addTransfer }
}
