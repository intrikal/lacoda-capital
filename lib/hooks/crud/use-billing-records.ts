"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getBillingRecords,
  createBillingRecord,
  updateBillingRecord,
  deleteBillingRecord,
} from "@/lib/actions/billing-record.actions"
import type { BillingRecordItem } from "@/lib/types"
import type {
  CreateBillingRecordInput,
  UpdateBillingRecordInput,
} from "@/lib/validations/billing-record.schema"

export type { BillingRecordItem }

export interface BillingStats {
  total: number
  totalAmount: number
  totalPaid: number
  totalDue: number
  totalUpcoming: number
}

export function useBillingRecords(params?: {
  clientId?: string
  status?: string
}) {
  const [billingRecords, setBillingRecords] = useState<BillingRecordItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getBillingRecords(params)
      setBillingRecords(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.status])

  useEffect(() => { load() }, [load])

  const stats = useMemo<BillingStats>(() => ({
    total: billingRecords.length,
    totalAmount: billingRecords.reduce((sum, r) => sum + r.amount, 0),
    totalPaid: billingRecords.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0),
    totalDue: billingRecords.filter((r) => r.status === "due").reduce((sum, r) => sum + r.amount, 0),
    totalUpcoming: billingRecords.filter((r) => r.status === "upcoming").reduce((sum, r) => sum + r.amount, 0),
  }), [billingRecords])

  return {
    billingRecords,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateBillingRecord() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateBillingRecordInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createBillingRecord(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateBillingRecord() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateBillingRecordInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateBillingRecord(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteBillingRecord() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteBillingRecord(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
