"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/actions/goal.actions"
import type { GoalRecord } from "@/lib/types"
import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "@/lib/validations/goal.schema"

export type { GoalRecord }

export interface GoalStats {
  total: number
  totalTargetAmount: number
  totalCurrentAmount: number
  overallProgress: number
  totalMonthlyContribution: number
  onTrack: number
  behind: number
  completed: number
}

export function useGoals(params?: {
  clientId?: string
  status?: string
  category?: string
}) {
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getGoals(params)
      setGoals(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.status, params?.category])

  useEffect(() => { load() }, [load])

  const stats = useMemo<GoalStats>(() => {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)
    const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0)
    return {
      total: goals.length,
      totalTargetAmount: totalTarget,
      totalCurrentAmount: totalCurrent,
      overallProgress: totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0,
      totalMonthlyContribution: goals.reduce((sum, g) => sum + g.monthlyContribution, 0),
      onTrack: goals.filter((g) => g.status === "on_track" || g.status === "ahead").length,
      behind: goals.filter((g) => g.status === "behind").length,
      completed: goals.filter((g) => g.status === "completed").length,
    }
  }, [goals])

  return {
    goals,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateGoal() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateGoalInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createGoal(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateGoal() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateGoalInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateGoal(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteGoal() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteGoal(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
