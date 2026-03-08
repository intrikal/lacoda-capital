/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-billing-records.ts
 * ============================================================================
 *
 * Apollo Client hooks for billing record (advisory fee invoice) CRUD operations.
 * Used by the advisor billing management page for full create/read/update/delete.
 *
 * ARCHITECTURE:
 *   Billing page → useBillingRecords() → Apollo useQuery → POST /api/graphql
 *   Billing page → useCreateBillingRecord() → Apollo useMutation → POST /api/graphql
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/billing/page.tsx  (advisor billing management)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_BILLING_RECORDS,
  CREATE_BILLING_RECORD,
  UPDATE_BILLING_RECORD,
  DELETE_BILLING_RECORD,
} from "@/lib/graphql/operations/billing-record"
import type {
  CreateBillingRecordInput,
  UpdateBillingRecordInput,
} from "@/lib/validations/billing-record.schema"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BillingRecordItem {
  id: string
  orgId: string
  clientId: string
  period: string
  amount: number
  aum: number
  status: "paid" | "upcoming" | "due"
  dueDate: string
  paidDate: string | null
  effectiveRate: number
  description: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface BillingStats {
  total: number
  totalAmount: number
  totalPaid: number
  totalDue: number
  totalUpcoming: number
}

/** Shape of the raw Apollo useQuery response for GET_BILLING_RECORDS. */
interface GetBillingRecordsData {
  billingRecords: {
    items: BillingRecordItem[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Fetches paginated billing records with computed stats. */
export function useBillingRecords(params?: {
  clientId?: string
  status?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.status) variables.status = params.status

  const { data, loading, error } = useQuery<GetBillingRecordsData>(
    GET_BILLING_RECORDS,
    { variables }
  )

  const billingRecords: BillingRecordItem[] =
    data?.billingRecords?.items ?? []

  const stats = useMemo<BillingStats>(() => {
    return {
      total: billingRecords.length,
      totalAmount: billingRecords.reduce((sum, r) => sum + r.amount, 0),
      totalPaid: billingRecords
        .filter((r) => r.status === "paid")
        .reduce((sum, r) => sum + r.amount, 0),
      totalDue: billingRecords
        .filter((r) => r.status === "due")
        .reduce((sum, r) => sum + r.amount, 0),
      totalUpcoming: billingRecords
        .filter((r) => r.status === "upcoming")
        .reduce((sum, r) => sum + r.amount, 0),
    }
  }, [billingRecords])

  return {
    billingRecords,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/** Creates a new billing record and refetches the list. */
export function useCreateBillingRecord() {
  const [createBillingRecord, { loading }] = useMutation(
    CREATE_BILLING_RECORD,
    { refetchQueries: [{ query: GET_BILLING_RECORDS }] }
  )

  const mutate = useCallback(
    (input: CreateBillingRecordInput) =>
      createBillingRecord({ variables: { input } }),
    [createBillingRecord]
  )

  return { mutate, isPending: loading }
}

/** Updates an existing billing record and refetches the list. */
export function useUpdateBillingRecord() {
  const [updateBillingRecord, { loading }] = useMutation(
    UPDATE_BILLING_RECORD,
    { refetchQueries: [{ query: GET_BILLING_RECORDS }] }
  )

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateBillingRecordInput }) =>
      updateBillingRecord({ variables: { id, input } }),
    [updateBillingRecord]
  )

  return { mutate, isPending: loading }
}

/** Deletes a billing record and refetches the list. */
export function useDeleteBillingRecord() {
  const [deleteBillingRecord, { loading }] = useMutation(
    DELETE_BILLING_RECORD,
    { refetchQueries: [{ query: GET_BILLING_RECORDS }] }
  )

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteBillingRecord({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteBillingRecord]
  )

  return { mutate, isPending: loading }
}
