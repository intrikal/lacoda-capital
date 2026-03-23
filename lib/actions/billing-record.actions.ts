"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { billingRecords } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createBillingRecordSchema, updateBillingRecordSchema } from "@/lib/validations/billing-record.schema"
import type { BillingRecordItem, PaginatedResult } from "@/lib/types"

export async function getBillingRecords(params?: {
  clientId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<BillingRecordItem>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(billingRecords.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(billingRecords.clientId, params.clientId))
  if (params?.status) conditions.push(eq(billingRecords.status, params.status as "paid" | "upcoming" | "due"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(billingRecords).where(where).orderBy(billingRecords.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(billingRecords).where(where),
  ])

  return { items: items as unknown as BillingRecordItem[], totalCount: total, page, limit }
}

export async function getBillingRecord(id: string): Promise<BillingRecordItem | null> {
  const session = await requireAuth()
  const row = await db.query.billingRecords.findFirst({
    where: and(eq(billingRecords.id, id), eq(billingRecords.orgId, session.orgId!)),
  })
  return (row as unknown as BillingRecordItem) ?? null
}

export async function createBillingRecord(input: unknown): Promise<BillingRecordItem> {
  const session = await requireRole(["admin", "assistant"])
  const parsed = createBillingRecordSchema.parse(input)

  const [created] = await db
    .insert(billingRecords)
    .values({
      ...parsed,
      orgId: session.orgId!,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  return created as unknown as BillingRecordItem
}

export async function updateBillingRecord(id: string, input: unknown): Promise<BillingRecordItem> {
  const session = await requireRole(["admin", "assistant"])
  const existing = await db.query.billingRecords.findFirst({
    where: and(eq(billingRecords.id, id), eq(billingRecords.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateBillingRecordSchema.parse(input)
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

  const [updated] = await db.update(billingRecords).set(setData).where(eq(billingRecords.id, id)).returning()
  return updated as unknown as BillingRecordItem
}

export async function deleteBillingRecord(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.billingRecords.findFirst({
    where: and(eq(billingRecords.id, id), eq(billingRecords.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(billingRecords).where(eq(billingRecords.id, id))
  return true
}
