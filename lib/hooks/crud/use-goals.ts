"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getGoals } from "@/lib/services/goals.service"
import type { FinancialGoal } from "@/lib/mock/types"

function generateId(): string {
  return `goal-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateGoalInput = Omit<FinancialGoal, "id" | "milestones">

export function useGoals() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<FinancialGoal>(getGoals)

  const addGoal = useCallback(
    (input: CreateGoalInput): FinancialGoal => {
      const newGoal: FinancialGoal = {
        ...input,
        id: generateId(),
        milestones: [],
      }
      add(newGoal)
      return newGoal
    },
    [add]
  )

  const stats = useMemo(() => {
    const totalTarget = data.reduce((sum, g) => sum + g.targetAmount, 0)
    const totalCurrent = data.reduce((sum, g) => sum + g.currentAmount, 0)
    return {
      total: data.length,
      totalTargetAmount: totalTarget,
      totalCurrentAmount: totalCurrent,
      overallProgress: totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0,
      onTrack: data.filter((g) => g.status === "on_track" || g.status === "ahead").length,
      behind: data.filter((g) => g.status === "behind").length,
      totalMonthlyContribution: data.reduce((sum, g) => sum + g.monthlyContribution, 0),
    }
  }, [data])

  return {
    goals: data,
    isLoading,
    addGoal,
    updateGoal: update,
    deleteGoal: remove,
    getGoalById: getById,
    stats,
  }
}
