"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { complianceControls, complianceEvidence, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import {
  createComplianceControlSchema,
  updateComplianceControlSchema,
  createComplianceEvidenceSchema,
} from "@/lib/validations/compliance.schema"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { ComplianceControlRecord, ComplianceEvidenceRecord, PaginatedResult } from "@/lib/types"

// ─── List with filters ──────────────────────────────────────────────────────

export async function getComplianceControls(params?: {
  category?: string
  framework?: string
  isActive?: boolean
  page?: number
  limit?: number
}): Promise<PaginatedResult<ComplianceControlRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 100, 200)
  const offset = (page - 1) * limit

  const conditions = [eq(complianceControls.orgId, session.orgId!)]
  if (params?.category) conditions.push(eq(complianceControls.category, params.category))
  if (params?.framework) conditions.push(eq(complianceControls.framework, params.framework))
  if (params?.isActive !== undefined) conditions.push(eq(complianceControls.isActive, params.isActive))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(complianceControls).where(where).orderBy(complianceControls.code).limit(limit).offset(offset),
    db.select({ total: count() }).from(complianceControls).where(where),
  ])

  // Eagerly fetch evidence + assignee name for each control
  const itemsWithEvidence = await Promise.all(
    items.map(async (control) => {
      const [evidence, assignee] = await Promise.all([
        db.query.complianceEvidence.findMany({
          where: eq(complianceEvidence.controlId, control.id),
        }),
        control.assigneeId
          ? db.query.users.findFirst({
              where: eq(users.id, control.assigneeId),
              columns: { fullName: true },
            })
          : null,
      ])
      return {
        ...control,
        assigneeName: assignee?.fullName ?? null,
        evidence,
      }
    })
  )

  return { items: itemsWithEvidence as unknown as ComplianceControlRecord[], totalCount: total, page, limit }
}

// ─── Get frameworks for this org ─────────────────────────────────────────────

export async function getComplianceFrameworks(): Promise<string[]> {
  const session = await requireAuth()
  const rows = await db
    .selectDistinct({ framework: complianceControls.framework })
    .from(complianceControls)
    .where(and(eq(complianceControls.orgId, session.orgId!)))

  return rows
    .map((r) => r.framework)
    .filter((f): f is string => f !== null)
    .sort()
}

// ─── Compliance stats per framework ──────────────────────────────────────────

export async function getComplianceStats(): Promise<{
  total: number
  active: number
  verified: number
  overdue: number
  byFramework: Record<string, { total: number; verified: number }>
}> {
  const session = await requireAuth()
  const controls = await db
    .select()
    .from(complianceControls)
    .where(eq(complianceControls.orgId, session.orgId!))

  const now = new Date()
  const active = controls.filter((c) => c.isActive)
  const verified = active.filter((c) => c.status === "verified").length
  const overdue = active.filter(
    (c) => c.dueDate && new Date(c.dueDate) < now && c.status !== "verified"
  ).length

  const byFramework: Record<string, { total: number; verified: number }> = {}
  for (const c of active) {
    const fw = c.framework ?? "Uncategorized"
    if (!byFramework[fw]) byFramework[fw] = { total: 0, verified: 0 }
    byFramework[fw].total++
    if (c.status === "verified") byFramework[fw].verified++
  }

  return { total: controls.length, active: active.length, verified, overdue, byFramework }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createComplianceControl(input: unknown): Promise<ComplianceControlRecord> {
  const session = await requireRole("admin")
  const parsed = createComplianceControlSchema.parse(input)

  const [created] = await db
    .insert(complianceControls)
    .values({
      ...parsed,
      orgId: session.orgId!,
      status: "not_started",
      dueDate: parsed.dueDate ?? null,
      assigneeId: parsed.assigneeId ?? null,
      framework: parsed.framework ?? null,
      requiredDocumentTypes: parsed.requiredDocumentTypes ?? [],
      metadata: parsed.metadata ?? {},
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "created",
    targetType: "report", // closest available target type
    targetId: created.id,
    metadata: { type: "compliance_control", name: parsed.name, code: parsed.code, framework: parsed.framework },
  })

  return { ...created, assigneeName: null, evidence: [] } as unknown as ComplianceControlRecord
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateComplianceControl(id: string, input: unknown): Promise<ComplianceControlRecord> {
  const session = await requireRole("admin")
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
      } else if (key === "dueDate") {
        setData[key] = value ?? null
      } else {
        setData[key] = value
      }
    }
  }

  const [updated] = await db.update(complianceControls).set(setData).where(eq(complianceControls.id, id)).returning()

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "updated",
    targetType: "report",
    targetId: id,
    metadata: { type: "compliance_control", changedFields: Object.keys(setData) },
  })

  const [evidence, assignee] = await Promise.all([
    db.query.complianceEvidence.findMany({ where: eq(complianceEvidence.controlId, id) }),
    updated.assigneeId
      ? db.query.users.findFirst({ where: eq(users.id, updated.assigneeId), columns: { fullName: true } })
      : null,
  ])

  return { ...updated, assigneeName: assignee?.fullName ?? null, evidence } as unknown as ComplianceControlRecord
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteComplianceControl(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.complianceControls.findFirst({
    where: and(eq(complianceControls.id, id), eq(complianceControls.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  await db.delete(complianceControls).where(eq(complianceControls.id, id))

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "deleted",
    targetType: "report",
    targetId: id,
    metadata: { type: "compliance_control", name: existing.name, code: existing.code },
  })

  return true
}

// ─── Create Evidence ─────────────────────────────────────────────────────────

export async function createComplianceEvidence(input: unknown): Promise<ComplianceEvidenceRecord> {
  const session = await requireRole("assistant")
  const parsed = createComplianceEvidenceSchema.parse(input)

  const control = await db.query.complianceControls.findFirst({
    where: and(eq(complianceControls.id, parsed.controlId), eq(complianceControls.orgId, session.orgId!)),
  })
  if (!control) throw new Error("Control not found")

  const [created] = await db
    .insert(complianceEvidence)
    .values({
      ...parsed,
      clientId: parsed.clientId ?? null,
      validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null,
      validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "compliance_reviewed",
    targetType: "document",
    targetId: parsed.documentId,
    metadata: { type: "compliance_evidence", controlId: parsed.controlId, controlCode: control.code },
  })

  return created as unknown as ComplianceEvidenceRecord
}

// ─── Delete Evidence ─────────────────────────────────────────────────────────

export async function deleteComplianceEvidence(id: string): Promise<boolean> {
  const session = await requireRole("assistant")

  const evidence = await db.query.complianceEvidence.findFirst({
    where: eq(complianceEvidence.id, id),
  })
  if (!evidence) throw new Error("Evidence not found")

  // Verify the control belongs to this org
  const control = await db.query.complianceControls.findFirst({
    where: and(eq(complianceControls.id, evidence.controlId), eq(complianceControls.orgId, session.orgId!)),
  })
  if (!control) throw new Error("Not authorized")

  await db.delete(complianceEvidence).where(eq(complianceEvidence.id, id))

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "deleted",
    targetType: "document",
    targetId: evidence.documentId ?? id,
    metadata: { type: "compliance_evidence", controlId: evidence.controlId, controlCode: control.code },
  })

  return true
}

// ─── Get org members for assignee picker ─────────────────────────────────────

export async function getOrgMembersForPicker(): Promise<{ id: string; name: string }[]> {
  const session = await requireAuth()

  const members = await db.query.orgMembers.findMany({
    where: eq(
      (await import("@/app/db/schema")).orgMembers.orgId,
      session.orgId!
    ),
    with: { user: { columns: { id: true, fullName: true, email: true } } },
  })

  return members.map((m) => ({
    id: (m.user as { id: string }).id,
    name: (m.user as { fullName: string | null; email: string }).fullName ?? (m.user as { email: string }).email,
  }))
}
