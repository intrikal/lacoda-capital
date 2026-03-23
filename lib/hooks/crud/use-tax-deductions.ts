"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getTaxDeductions,
  createTaxDeduction,
  updateTaxDeduction,
  deleteTaxDeduction,
} from "@/lib/actions/tax-deduction.actions"
import type { TaxDeductionItem } from "@/lib/types"
import type {
  CreateTaxDeductionInput,
  UpdateTaxDeductionInput,
} from "@/lib/validations/tax-deduction.schema"

export type { TaxDeductionItem }

export interface TaxDeductionStats {
  total: number
  totalSavings: number
  claimedCount: number
  eligibleCount: number
  pendingCount: number
  totalClaimed: number
}

export function useTaxDeductions(params?: {
  clientId?: string
  status?: string
  category?: string
  type?: string
  taxYear?: string
}) {
  const [taxDeductions, setTaxDeductions] = useState<TaxDeductionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getTaxDeductions(params)
      setTaxDeductions(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.status, params?.category, params?.type, params?.taxYear])

  useEffect(() => { load() }, [load])

  const stats = useMemo<TaxDeductionStats>(() => ({
    total: taxDeductions.length,
    totalSavings: taxDeductions.reduce((sum, d) => sum + d.estimatedSavings, 0),
    claimedCount: taxDeductions.filter((d) => d.status === "claimed").length,
    eligibleCount: taxDeductions.filter((d) => d.status === "eligible").length,
    pendingCount: taxDeductions.filter((d) => d.status === "pending_review").length,
    totalClaimed: taxDeductions.filter((d) => d.status === "claimed").reduce((sum, d) => sum + d.amount, 0),
  }), [taxDeductions])

  return {
    taxDeductions,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateTaxDeduction() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateTaxDeductionInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createTaxDeduction(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateTaxDeduction() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateTaxDeductionInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateTaxDeduction(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteTaxDeduction() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteTaxDeduction(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
