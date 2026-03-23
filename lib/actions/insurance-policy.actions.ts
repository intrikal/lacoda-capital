"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { insurancePolicies } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createInsurancePolicySchema, updateInsurancePolicySchema } from "@/lib/validations/insurance-policy.schema"
import type { InsurancePolicyRecord, PaginatedResult } from "@/lib/types"

export async function getInsurancePolicies(params?: {
  clientId?: string
  status?: string
  policyType?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<InsurancePolicyRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(insurancePolicies.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(insurancePolicies.clientId, params.clientId))
  if (params?.status) conditions.push(eq(insurancePolicies.status, params.status as "active" | "expiring" | "expired" | "pending"))
  if (params?.policyType) conditions.push(eq(insurancePolicies.policyType, params.policyType as "home" | "auto" | "life" | "umbrella" | "liability" | "health" | "business" | "property"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(insurancePolicies).where(where).orderBy(insurancePolicies.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(insurancePolicies).where(where),
  ])

  return { items: items as unknown as InsurancePolicyRecord[], totalCount: total, page, limit }
}

export async function getInsurancePolicy(id: string): Promise<InsurancePolicyRecord | null> {
  const session = await requireAuth()
  const row = await db.query.insurancePolicies.findFirst({
    where: and(eq(insurancePolicies.id, id), eq(insurancePolicies.orgId, session.orgId!)),
  })
  return (row as unknown as InsurancePolicyRecord) ?? null
}

export async function createInsurancePolicy(input: unknown): Promise<InsurancePolicyRecord> {
  const session = await requireRole(["admin", "assistant"])
  const parsed = createInsurancePolicySchema.parse(input)

  const [created] = await db
    .insert(insurancePolicies)
    .values({
      ...parsed,
      orgId: session.orgId!,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  return created as unknown as InsurancePolicyRecord
}

export async function updateInsurancePolicy(id: string, input: unknown): Promise<InsurancePolicyRecord> {
  const session = await requireRole(["admin", "assistant"])
  const existing = await db.query.insurancePolicies.findFirst({
    where: and(eq(insurancePolicies.id, id), eq(insurancePolicies.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateInsurancePolicySchema.parse(input)
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

  const [updated] = await db.update(insurancePolicies).set(setData).where(eq(insurancePolicies.id, id)).returning()
  return updated as unknown as InsurancePolicyRecord
}

export async function deleteInsurancePolicy(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.insurancePolicies.findFirst({
    where: and(eq(insurancePolicies.id, id), eq(insurancePolicies.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(insurancePolicies).where(eq(insurancePolicies.id, id))
  return true
}
