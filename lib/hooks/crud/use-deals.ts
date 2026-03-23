"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
} from "@/lib/actions/deal.actions"
import type { DealRecord } from "@/lib/types"
import type { CreateDealInput, UpdateDealInput } from "@/lib/validations/deal.schema"

export type { DealRecord }

export type DealStage =
  | "prospecting"
  | "due_diligence"
  | "negotiation"
  | "closed"
  | "active"
  | "exit_planning"

export type DealType =
  | "real_estate"
  | "private_equity"
  | "venture_capital"
  | "fixed_income"

export function useDeals(params?: {
  stage?: DealStage
  type?: DealType
  clientId?: string
}) {
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDeals({ ...params, limit: 100 })
      setDeals(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.stage, params?.type, params?.clientId])

  useEffect(() => { load() }, [load])

  return {
    deals,
    isLoading,
    isError: !!error,
    error,
    refetch: load,
  }
}

export function useCreateDeal() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateDealInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createDeal(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateDeal() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, input: UpdateDealInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateDeal(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteDeal() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteDeal(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
