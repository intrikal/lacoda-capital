"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { goals } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createGoalSchema, updateGoalSchema } from "@/lib/validations/goal.schema"
import type { GoalRecord, PaginatedResult } from "@/lib/types"

export async function getGoals(params?: {
  clientId?: string
  status?: string
  category?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<GoalRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(goals.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(goals.clientId, params.clientId))
  if (params?.status) conditions.push(eq(goals.status, params.status as "on_track" | "ahead" | "behind" | "completed"))
  if (params?.category) conditions.push(eq(goals.category, params.category as "retirement" | "education" | "realestate" | "emergency" | "travel" | "vehicle" | "investment" | "custom"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(goals).where(where).orderBy(goals.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(goals).where(where),
  ])

  return { items: items as unknown as GoalRecord[], totalCount: total, page, limit }
}

export async function getGoal(id: string): Promise<GoalRecord | null> {
  const session = await requireAuth()
  const row = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.orgId, session.orgId!)),
  })
  return (row as unknown as GoalRecord) ?? null
}

export async function createGoal(input: unknown): Promise<GoalRecord> {
  const session = await requireRole("assistant")
  const parsed = createGoalSchema.parse(input)

  const [created] = await db
    .insert(goals)
    .values({
      ...parsed,
      orgId: session.orgId!,
      clientId: parsed.clientId ?? null,
      currentAmount: parsed.currentAmount ?? 0,
      monthlyContribution: parsed.monthlyContribution ?? 0,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  captureServerEvent(session.userId, "goal.created", { category: parsed.category })

  return created as unknown as GoalRecord
}

export async function updateGoal(id: string, input: unknown): Promise<GoalRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateGoalSchema.parse(input)
  const setData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      if (key === "metadata") {
        setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
      } else {
        setData[key] = value ?? null
      }
    }
  }

  const [updated] = await db.update(goals).set(setData).where(eq(goals.id, id)).returning()
  return updated as unknown as GoalRecord
}

export async function deleteGoal(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(goals).where(eq(goals.id, id))
  return true
}
