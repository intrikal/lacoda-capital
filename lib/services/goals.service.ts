// ─────────────────────────────────────────────────────────────────────────────
// GOALS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockGoals } from "@/lib/mock/data"
import type { FinancialGoal, GoalCategory } from "@/lib/mock/types"

export async function getGoals(): Promise<FinancialGoal[]> {
  // REAL: return db.query.goals.findMany({ orderBy: desc(goals.targetDate) })
  return mockGoals
}

export async function getGoalById(id: string): Promise<FinancialGoal | undefined> {
  // REAL: return db.query.goals.findFirst({ where: eq(goals.id, id) })
  return mockGoals.find((g) => g.id === id)
}

export async function getGoalsByCategory(category: GoalCategory): Promise<FinancialGoal[]> {
  // REAL: return db.query.goals.findMany({ where: eq(goals.category, category) })
  return mockGoals.filter((g) => g.category === category)
}

export async function getGoalsSummary() {
  const all = mockGoals
  const totalTarget = all.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalCurrent = all.reduce((sum, g) => sum + g.currentAmount, 0)
  return {
    total: all.length,
    totalTargetAmount: totalTarget,
    totalCurrentAmount: totalCurrent,
    overallProgress: Math.round((totalCurrent / totalTarget) * 100),
    onTrack: all.filter((g) => g.status === "on_track" || g.status === "ahead").length,
    behind: all.filter((g) => g.status === "behind").length,
    totalMonthlyContribution: all.reduce((sum, g) => sum + g.monthlyContribution, 0),
  }
}
