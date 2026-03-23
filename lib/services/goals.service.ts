"use server"

// ─────────────────────────────────────────────────────────────────────────────
// GOALS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { goals } from "@/app/db/schema"
import { eq, desc, isNull } from "drizzle-orm"
import type { FinancialGoal, GoalCategory } from "@/lib/types/mock"

/** Map a DB goals row to the FinancialGoal mock type shape. */
function toFinancialGoal(row: typeof goals.$inferSelect): FinancialGoal {
  return {
    id: row.id,
    name: row.name,
    category: row.category as GoalCategory,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    targetDate: row.targetDate,
    monthlyContribution: row.monthlyContribution,
    priority: row.priority as FinancialGoal["priority"],
    status: row.status as FinancialGoal["status"],
    notes: row.notes ?? undefined,
    milestones: undefined,
  }
}

export async function getGoals(): Promise<FinancialGoal[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(isNull(goals.deletedAt))
    .orderBy(desc(goals.targetDate))
  return rows.map(toFinancialGoal)
}

export async function getGoalById(id: string): Promise<FinancialGoal | undefined> {
  const rows = await db.select().from(goals).where(eq(goals.id, id))
  return rows[0] ? toFinancialGoal(rows[0]) : undefined
}

export async function getGoalsByCategory(category: GoalCategory): Promise<FinancialGoal[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.category, category))
  return rows.map(toFinancialGoal)
}

export async function getGoalsSummary() {
  const all = await getGoals()
  const totalTarget = all.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalCurrent = all.reduce((sum, g) => sum + g.currentAmount, 0)
  return {
    total: all.length,
    totalTargetAmount: totalTarget,
    totalCurrentAmount: totalCurrent,
    overallProgress: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
    onTrack: all.filter((g) => g.status === "on_track" || g.status === "ahead").length,
    behind: all.filter((g) => g.status === "behind").length,
    totalMonthlyContribution: all.reduce((sum, g) => sum + g.monthlyContribution, 0),
  }
}
