"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { deals } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createDealSchema, updateDealSchema } from "@/lib/validations/deal.schema"
import type { DealRecord, PaginatedResult } from "@/lib/types"

export async function getDeals(params?: {
  clientId?: string
  stage?: string
  type?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<DealRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 100, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(deals.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(deals.clientId, params.clientId))
  if (params?.stage) conditions.push(eq(deals.stage, params.stage as "prospecting" | "due_diligence" | "negotiation" | "closed" | "active" | "exit_planning"))
  if (params?.type) conditions.push(eq(deals.type, params.type as "real_estate" | "private_equity" | "venture_capital" | "fixed_income"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(deals).where(where).orderBy(deals.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(deals).where(where),
  ])

  return { items: items as unknown as DealRecord[], totalCount: total, page, limit }
}

export async function getDeal(id: string): Promise<DealRecord | null> {
  const session = await requireAuth()
  const row = await db.query.deals.findFirst({
    where: and(eq(deals.id, id), eq(deals.orgId, session.orgId!)),
  })
  return (row as unknown as DealRecord) ?? null
}

export async function createDeal(input: unknown): Promise<DealRecord> {
  const session = await requireRole("assistant")
  const parsed = createDealSchema.parse(input)

  const [created] = await db
    .insert(deals)
    .values({
      ...parsed,
      orgId: session.orgId!,
      lastActivity: "Just now",
    })
    .returning()

  captureServerEvent(session.userId, "deal.created", { deal_type: parsed.type, stage: parsed.stage })

  return created as unknown as DealRecord
}

export async function updateDeal(id: string, input: unknown): Promise<DealRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.deals.findFirst({
    where: and(eq(deals.id, id), eq(deals.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateDealSchema.parse(input)
  const setData: Record<string, unknown> = {}
  if (parsed.name !== undefined) setData.name = parsed.name
  if (parsed.stage !== undefined) setData.stage = parsed.stage
  if (parsed.type !== undefined) setData.type = parsed.type
  if (parsed.potentialValue !== undefined) setData.potentialValue = parsed.potentialValue
  if (parsed.probability !== undefined) setData.probability = parsed.probability
  if (parsed.assigneeName !== undefined) setData.assigneeName = parsed.assigneeName
  if (parsed.dueDate !== undefined) setData.dueDate = parsed.dueDate
  if (parsed.notes !== undefined) setData.notes = parsed.notes
  if (parsed.lastActivity !== undefined) setData.lastActivity = parsed.lastActivity
  if (parsed.clientId !== undefined) setData.clientId = parsed.clientId

  const [updated] = await db.update(deals).set(setData).where(eq(deals.id, id)).returning()
  return updated as unknown as DealRecord
}

export async function deleteDeal(id: string): Promise<boolean> {
  const session = await requireRole("assistant")
  const existing = await db.query.deals.findFirst({
    where: and(eq(deals.id, id), eq(deals.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(deals).where(eq(deals.id, id))
  return true
}
