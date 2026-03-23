"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getBenchmarks,
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
} from "@/lib/actions/benchmark.actions"
import type { BenchmarkRecord } from "@/lib/types"
import type {
  CreateBenchmarkInput,
  UpdateBenchmarkInput,
} from "@/lib/validations/benchmark.schema"

export type { BenchmarkRecord }

export interface BenchmarkStats {
  total: number
  avgAlpha: number
  avgBeta: number
  avgSharpe: number
  avgVolatility: number
}

export function useBenchmarks(params?: {
  clientId?: string
  category?: string
}) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getBenchmarks(params)
      setBenchmarks(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.category])

  useEffect(() => { load() }, [load])

  const stats = useMemo<BenchmarkStats>(() => {
    const len = benchmarks.length || 1
    return {
      total: benchmarks.length,
      avgAlpha: benchmarks.reduce((sum, b) => sum + b.alpha, 0) / len,
      avgBeta: benchmarks.reduce((sum, b) => sum + b.beta, 0) / len,
      avgSharpe: benchmarks.reduce((sum, b) => sum + b.sharpeRatio, 0) / len,
      avgVolatility: benchmarks.reduce((sum, b) => sum + b.volatility, 0) / len,
    }
  }, [benchmarks])

  return {
    benchmarks,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateBenchmark() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateBenchmarkInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createBenchmark(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateBenchmark() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateBenchmarkInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateBenchmark(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteBenchmark() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteBenchmark(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
