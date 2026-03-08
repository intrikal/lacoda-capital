"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_BENCHMARKS,
  CREATE_BENCHMARK,
  UPDATE_BENCHMARK,
  DELETE_BENCHMARK,
} from "@/lib/graphql/operations/benchmark"
import type {
  CreateBenchmarkInput,
  UpdateBenchmarkInput,
} from "@/lib/validations/benchmark.schema"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BenchmarkRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  symbol: string | null
  category: "index" | "etf" | "mutual_fund" | "custom"
  ytdReturn: number
  alpha: number
  beta: number
  sharpeRatio: number
  volatility: number
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface BenchmarkStats {
  total: number
  avgAlpha: number
  avgBeta: number
  avgSharpe: number
  avgVolatility: number
}

/** Shape of the raw Apollo useQuery response for GET_BENCHMARKS. */
interface GetBenchmarksData {
  benchmarks: {
    items: BenchmarkRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useBenchmarks(params?: {
  clientId?: string
  category?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.category) variables.category = params.category

  const { data, loading, error } = useQuery<GetBenchmarksData>(GET_BENCHMARKS, { variables })

  const benchmarks: BenchmarkRecord[] = data?.benchmarks?.items ?? []

  const stats = useMemo<BenchmarkStats>(() => {
    const len = benchmarks.length || 1
    return {
      total: benchmarks.length,
      avgAlpha:
        benchmarks.reduce((sum, b) => sum + b.alpha, 0) / len,
      avgBeta:
        benchmarks.reduce((sum, b) => sum + b.beta, 0) / len,
      avgSharpe:
        benchmarks.reduce((sum, b) => sum + b.sharpeRatio, 0) / len,
      avgVolatility:
        benchmarks.reduce((sum, b) => sum + b.volatility, 0) / len,
    }
  }, [benchmarks])

  return {
    benchmarks,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

export function useCreateBenchmark() {
  const [createBenchmark, { loading }] = useMutation(CREATE_BENCHMARK, {
    refetchQueries: [{ query: GET_BENCHMARKS }],
  })

  const mutate = useCallback(
    (input: CreateBenchmarkInput) =>
      createBenchmark({ variables: { input } }),
    [createBenchmark]
  )

  return { mutate, isPending: loading }
}

export function useUpdateBenchmark() {
  const [updateBenchmark, { loading }] = useMutation(UPDATE_BENCHMARK, {
    refetchQueries: [{ query: GET_BENCHMARKS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateBenchmarkInput }) =>
      updateBenchmark({ variables: { id, input } }),
    [updateBenchmark]
  )

  return { mutate, isPending: loading }
}

export function useDeleteBenchmark() {
  const [deleteBenchmark, { loading }] = useMutation(DELETE_BENCHMARK, {
    refetchQueries: [{ query: GET_BENCHMARKS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteBenchmark({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteBenchmark]
  )

  return { mutate, isPending: loading }
}
