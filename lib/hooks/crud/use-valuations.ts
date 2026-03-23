"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  addValuation,
  getValuationHistory,
} from "@/lib/actions/valuation.actions"
import type { ValuationRecord } from "@/lib/types"
import type { CreateValuationInput } from "@/lib/validations/valuation.schema"

export function useValuationHistory(assetId: string | null) {
  const [valuations, setValuations] = useState<ValuationRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!assetId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await getValuationHistory(assetId)
      setValuations(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [assetId])

  useEffect(() => { load() }, [load])

  return {
    valuations,
    isLoading,
    isError: !!error,
    error,
    refetch: load,
  }
}

export function useAddValuation() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateValuationInput, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await addValuation(input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
