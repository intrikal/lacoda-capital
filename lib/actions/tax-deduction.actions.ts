"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { taxDeductions } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { blockDemoMutation } from "@/lib/demo/guard"
import { createTaxDeductionSchema, updateTaxDeductionSchema } from "@/lib/validations/tax-deduction.schema"
import type { TaxDeductionItem, PaginatedResult } from "@/lib/types"

export async function getTaxDeductions(params?: {
  clientId?: string
  status?: string
  category?: string
  type?: string
  taxYear?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<TaxDeductionItem>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(taxDeductions.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(taxDeductions.clientId, params.clientId))
  if (params?.status) conditions.push(eq(taxDeductions.status, params.status as "eligible" | "pending_review" | "claimed" | "ineligible"))
  if (params?.category) conditions.push(eq(taxDeductions.category, params.category as "home_office" | "vehicle" | "travel" | "equipment" | "professional" | "education" | "healthcare" | "meals" | "utilities" | "charitable" | "retirement" | "taxes" | "other"))
  if (params?.type) conditions.push(eq(taxDeductions.type, params.type as "personal" | "business"))
  if (params?.taxYear) conditions.push(eq(taxDeductions.taxYear, params.taxYear))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(taxDeductions).where(where).orderBy(taxDeductions.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(taxDeductions).where(where),
  ])

  return { items: items as unknown as TaxDeductionItem[], totalCount: total, page, limit }
}

export async function getTaxDeduction(id: string): Promise<TaxDeductionItem | null> {
  const session = await requireAuth()
  const row = await db.query.taxDeductions.findFirst({
    where: and(eq(taxDeductions.id, id), eq(taxDeductions.orgId, session.orgId!)),
  })
  return (row as unknown as TaxDeductionItem) ?? null
}

export async function createTaxDeduction(input: unknown): Promise<TaxDeductionItem> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const parsed = createTaxDeductionSchema.parse(input)

  const [created] = await db
    .insert(taxDeductions)
    .values({
      ...parsed,
      orgId: session.orgId!,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  captureServerEvent(session.userId, "tax_deduction.created", { type: parsed.type, category: parsed.category })

  return created as unknown as TaxDeductionItem
}

export async function updateTaxDeduction(id: string, input: unknown): Promise<TaxDeductionItem> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const existing = await db.query.taxDeductions.findFirst({
    where: and(eq(taxDeductions.id, id), eq(taxDeductions.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateTaxDeductionSchema.parse(input)
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

  const [updated] = await db.update(taxDeductions).set(setData).where(eq(taxDeductions.id, id)).returning()
  return updated as unknown as TaxDeductionItem
}

export async function deleteTaxDeduction(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  blockDemoMutation(session.orgId)
  const existing = await db.query.taxDeductions.findFirst({
    where: and(eq(taxDeductions.id, id), eq(taxDeductions.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(taxDeductions).where(eq(taxDeductions.id, id))
  return true
}
