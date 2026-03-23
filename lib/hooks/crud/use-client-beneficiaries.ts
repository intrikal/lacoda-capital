/**
 * use-client-beneficiaries.ts
 *
 * Full CRUD hook for the client's estate planning beneficiary designations.
 * Clients can add, edit, and remove beneficiaries on their investment accounts.
 *
 * Architecture position:
 *   Beneficiaries page → useClientBeneficiaries() → beneficiariesService → mock data
 *
 * tRPC swap path:
 *   Replace useEffect  → `trpc.client.beneficiaries.list.useQuery()`
 *   Replace add        → `trpc.client.beneficiaries.create.useMutation()`
 *   Replace update     → `trpc.client.beneficiaries.update.useMutation()`
 *   Replace remove     → `trpc.client.beneficiaries.delete.useMutation()`
 *
 * Compliance note (production):
 *   Any mutation should trigger a compliance event and send a confirmation
 *   email to the account holder. Handle in the tRPC mutation's `onSuccess`.
 *
 * @example
 * ```tsx
 * const { beneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary, stats } =
 *   useClientBeneficiaries()
 * ```
 */

"use client"

import * as React from "react"
import { getBeneficiaries } from "@/lib/services/beneficiaries.service"
import type { Beneficiary, BeneficiaryDesignation } from "@/lib/types/mock"

// ─────────────────────────────────────────────────────────────────────────────
// Input shape for creating / editing a beneficiary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fields the client submits in the beneficiary form.
 * `id` and `verified` are system-managed.
 */
export interface CreateBeneficiaryInput {
  name: string
  relationship: string
  designation: BeneficiaryDesignation
  percentage: number
  accounts: string[]
  ssnLast4?: string
  dateOfBirth?: string
  phone?: string
  email?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed stats shape
// ─────────────────────────────────────────────────────────────────────────────

export interface BeneficiaryStats {
  primaryCount: number
  contingentCount: number
  /** Sum of all primary beneficiary percentages — should equal 100 */
  primaryTotal: number
  /** Sum of all contingent beneficiary percentages */
  contingentTotal: number
  /** Number of beneficiaries pending identity verification */
  unverifiedCount: number
  /** True when primary designations correctly sum to 100 */
  primaryComplete: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseClientBeneficiariesReturn {
  beneficiaries: Beneficiary[]
  stats: BeneficiaryStats
  isLoading: boolean
  addBeneficiary: (input: CreateBeneficiaryInput) => void
  updateBeneficiary: (id: string, updates: Partial<CreateBeneficiaryInput>) => void
  deleteBeneficiary: (id: string) => void
  getBeneficiaryById: (id: string) => Beneficiary | undefined
}

const EMPTY_STATS: BeneficiaryStats = {
  primaryCount: 0,
  contingentCount: 0,
  primaryTotal: 0,
  contingentTotal: 0,
  unverifiedCount: 0,
  primaryComplete: false,
}

function computeStats(beneficiaries: Beneficiary[]): BeneficiaryStats {
  const primary = beneficiaries.filter((b) => b.designation === "primary")
  const contingent = beneficiaries.filter((b) => b.designation === "contingent")
  const primaryTotal = primary.reduce((s, b) => s + b.percentage, 0)
  const contingentTotal = contingent.reduce((s, b) => s + b.percentage, 0)
  return {
    primaryCount: primary.length,
    contingentCount: contingent.length,
    primaryTotal,
    contingentTotal,
    unverifiedCount: beneficiaries.filter((b) => !b.verified).length,
    primaryComplete: primaryTotal === 100,
  }
}

export function useClientBeneficiaries(): UseClientBeneficiariesReturn {
  const [beneficiaries, setBeneficiaries] = React.useState<Beneficiary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const hasFetched = React.useRef(false)

  React.useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    getBeneficiaries().then((data) => {
      setBeneficiaries(data)
      setIsLoading(false)
    })
  }, [])

  const stats = React.useMemo(() => computeStats(beneficiaries), [beneficiaries])

  const addBeneficiary = React.useCallback((input: CreateBeneficiaryInput) => {
    const newBeneficiary: Beneficiary = {
      id: `ben-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      // New beneficiaries start unverified — compliance reviews them
      verified: false,
    }
    setBeneficiaries((prev) => [...prev, newBeneficiary])
  }, [])

  const updateBeneficiary = React.useCallback(
    (id: string, updates: Partial<CreateBeneficiaryInput>) => {
      setBeneficiaries((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      )
    },
    []
  )

  const deleteBeneficiary = React.useCallback((id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const getBeneficiaryById = React.useCallback(
    (id: string) => beneficiaries.find((b) => b.id === id),
    [beneficiaries]
  )

  return {
    beneficiaries,
    stats,
    isLoading,
    addBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    getBeneficiaryById,
  }
}
