/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-tax-deductions.ts
 * ============================================================================
 *
 * Apollo Client hooks for per-client tax deduction CRUD operations.
 * Used by the tax-writeoffs page for managing client tax deductions.
 *
 * ARCHITECTURE:
 *   Tax page → useTaxDeductions() → Apollo useQuery → POST /api/graphql
 *   Tax page → useCreateTaxDeduction() → Apollo useMutation → POST /api/graphql
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/tax-writeoffs/page.tsx
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_TAX_DEDUCTIONS,
  CREATE_TAX_DEDUCTION,
  UPDATE_TAX_DEDUCTION,
  DELETE_TAX_DEDUCTION,
} from "@/lib/graphql/operations/tax-deduction"
import type {
  CreateTaxDeductionInput,
  UpdateTaxDeductionInput,
} from "@/lib/validations/tax-deduction.schema"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TaxDeductionItem {
  id: string
  orgId: string
  clientId: string
  name: string
  category: "home_office" | "vehicle" | "travel" | "equipment" | "professional" | "education" | "healthcare" | "meals" | "utilities" | "charitable" | "retirement" | "taxes" | "other"
  type: "personal" | "business"
  status: "eligible" | "pending_review" | "claimed" | "ineligible"
  amount: number
  estimatedSavings: number
  taxYear: string
  description: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface TaxDeductionStats {
  total: number
  totalSavings: number
  claimedCount: number
  eligibleCount: number
  pendingCount: number
  totalClaimed: number
}

/** Shape of the raw Apollo useQuery response. */
interface GetTaxDeductionsData {
  taxDeductions: {
    items: TaxDeductionItem[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Fetches paginated tax deductions with computed stats. */
export function useTaxDeductions(params?: {
  clientId?: string
  status?: string
  category?: string
  type?: string
  taxYear?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.status) variables.status = params.status
  if (params?.category) variables.category = params.category
  if (params?.type) variables.type = params.type
  if (params?.taxYear) variables.taxYear = params.taxYear

  const { data, loading, error } = useQuery<GetTaxDeductionsData>(
    GET_TAX_DEDUCTIONS,
    { variables }
  )

  const taxDeductions: TaxDeductionItem[] =
    data?.taxDeductions?.items ?? []

  const stats = useMemo<TaxDeductionStats>(() => {
    return {
      total: taxDeductions.length,
      totalSavings: taxDeductions.reduce((sum, d) => sum + d.estimatedSavings, 0),
      claimedCount: taxDeductions.filter((d) => d.status === "claimed").length,
      eligibleCount: taxDeductions.filter((d) => d.status === "eligible").length,
      pendingCount: taxDeductions.filter((d) => d.status === "pending_review").length,
      totalClaimed: taxDeductions
        .filter((d) => d.status === "claimed")
        .reduce((sum, d) => sum + d.amount, 0),
    }
  }, [taxDeductions])

  return {
    taxDeductions,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/** Creates a new tax deduction and refetches the list. */
export function useCreateTaxDeduction() {
  const [createTaxDeduction, { loading }] = useMutation(
    CREATE_TAX_DEDUCTION,
    { refetchQueries: [{ query: GET_TAX_DEDUCTIONS }] }
  )

  const mutate = useCallback(
    (input: CreateTaxDeductionInput) =>
      createTaxDeduction({ variables: { input } }),
    [createTaxDeduction]
  )

  return { mutate, isPending: loading }
}

/** Updates an existing tax deduction and refetches the list. */
export function useUpdateTaxDeduction() {
  const [updateTaxDeduction, { loading }] = useMutation(
    UPDATE_TAX_DEDUCTION,
    { refetchQueries: [{ query: GET_TAX_DEDUCTIONS }] }
  )

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateTaxDeductionInput }) =>
      updateTaxDeduction({ variables: { id, input } }),
    [updateTaxDeduction]
  )

  return { mutate, isPending: loading }
}

/** Deletes a tax deduction and refetches the list. */
export function useDeleteTaxDeduction() {
  const [deleteTaxDeduction, { loading }] = useMutation(
    DELETE_TAX_DEDUCTION,
    { refetchQueries: [{ query: GET_TAX_DEDUCTIONS }] }
  )

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteTaxDeduction({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteTaxDeduction]
  )

  return { mutate, isPending: loading }
}
