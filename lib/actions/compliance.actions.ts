"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { complianceControls, complianceEvidence } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  createComplianceControlSchema,
  updateComplianceControlSchema,
  createComplianceEvidenceSchema,
} from "@/lib/validations/compliance.schema"
import type { ComplianceControlRecord, ComplianceEvidenceRecord, PaginatedResult } from "@/lib/types"

export async function getComplianceControls(params?: {
  category?: string
  isActive?: boolean
  page?: number
  limit?: number
}): Promise<PaginatedResult<ComplianceControlRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(complianceControls.orgId, session.orgId!)]
  if (params?.category) conditions.push(eq(complianceControls.category, params.category))
  if (params?.isActive !== undefined) conditions.push(eq(complianceControls.isActive, params.isActive))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(complianceControls).where(where).orderBy(complianceControls.code).limit(limit).offset(offset),
    db.select({ total: count() }).from(complianceControls).where(where),
  ])

  // Eagerly fetch evidence for each control
  const itemsWithEvidence = await Promise.all(
    items.map(async (control) => {
      const evidence = await db.query.complianceEvidence.findMany({
        where: eq(complianceEvidence.controlId, control.id),
      })
      return { ...control, evidence }
    })
  )

  return { items: itemsWithEvidence as unknown as ComplianceControlRecord[], totalCount: total, page, limit }
}

export async function createComplianceControl(input: unknown): Promise<ComplianceControlRecord> {
  const session = await requireRole(["admin"])
  const parsed = createComplianceControlSchema.parse(input)

  const [created] = await db
    .insert(complianceControls)
    .values({
      ...parsed,
      orgId: session.orgId!,
      status: "not_started",
      requiredDocumentTypes: parsed.requiredDocumentTypes ?? [],
      metadata: parsed.metadata ?? {},
    })
    .returning()

  return { ...created, evidence: [] } as unknown as ComplianceControlRecord
}

export async function updateComplianceControl(id: string, input: unknown): Promise<ComplianceControlRecord> {
  const session = await requireRole(["admin"])
  const existing = await db.query.complianceControls.findFirst({
    where: and(eq(complianceControls.id, id), eq(complianceControls.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateComplianceControlSchema.parse(input)
  const setData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      if (key === "metadata") {
        setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
      } else {
        setData[key] = value
      }
    }
  }

  const [updated] = await db.update(complianceControls).set(setData).where(eq(complianceControls.id, id)).returning()
  const evidence = await db.query.complianceEvidence.findMany({
    where: eq(complianceEvidence.controlId, id),
  })
  return { ...updated, evidence } as unknown as ComplianceControlRecord
}

export async function deleteComplianceControl(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.complianceControls.findFirst({
    where: and(eq(complianceControls.id, id), eq(complianceControls.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(complianceControls).where(eq(complianceControls.id, id))
  return true
}

export async function createComplianceEvidence(input: unknown): Promise<ComplianceEvidenceRecord> {
  const session = await requireRole(["admin", "assistant"])
  const parsed = createComplianceEvidenceSchema.parse(input)

  const control = await db.query.complianceControls.findFirst({
    where: and(eq(complianceControls.id, parsed.controlId), eq(complianceControls.orgId, session.orgId!)),
  })
  if (!control) throw new Error("Control not found")

  const [created] = await db
    .insert(complianceEvidence)
    .values({
      ...parsed,
      validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null,
      validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
    })
    .returning()

  return created as unknown as ComplianceEvidenceRecord
}
