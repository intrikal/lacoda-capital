"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { reports } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createReportSchema, updateReportSchema } from "@/lib/validations/report.schema"
import type { ReportRecord, PaginatedResult } from "@/lib/types"

export async function getReports(params?: {
  clientId?: string
  reportType?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<ReportRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(reports.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(reports.clientId, params.clientId))
  if (params?.reportType) conditions.push(eq(reports.reportType, params.reportType as "portfolio_summary" | "asset_allocation" | "performance" | "tax_summary" | "compliance" | "client_statement" | "custom"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(reports).where(where).orderBy(reports.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(reports).where(where),
  ])

  return { items: items as unknown as ReportRecord[], totalCount: total, page, limit }
}

export async function getReport(id: string): Promise<ReportRecord | null> {
  const session = await requireAuth()
  const row = await db.query.reports.findFirst({
    where: and(eq(reports.id, id), eq(reports.orgId, session.orgId!)),
  })
  return (row as unknown as ReportRecord) ?? null
}

export async function createReport(input: unknown): Promise<ReportRecord> {
  const session = await requireRole("assistant")
  const parsed = createReportSchema.parse(input)

  const [created] = await db
    .insert(reports)
    .values({
      ...parsed,
      orgId: session.orgId!,
      createdBy: session.memberId!,
      parameters: parsed.parameters ?? {},
    })
    .returning()

  return created as unknown as ReportRecord
}

export async function updateReport(id: string, input: unknown): Promise<ReportRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.reports.findFirst({
    where: and(eq(reports.id, id), eq(reports.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateReportSchema.parse(input)
  const setData: Record<string, unknown> = {}
  if (parsed.name !== undefined) setData.name = parsed.name
  if (parsed.description !== undefined) setData.description = parsed.description ?? null
  if (parsed.status !== undefined) setData.status = parsed.status
  if (parsed.parameters !== undefined) setData.parameters = { ...(existing.parameters as object ?? {}), ...(parsed.parameters as object) }

  const [updated] = await db.update(reports).set(setData).where(eq(reports.id, id)).returning()
  return updated as unknown as ReportRecord
}

export async function deleteReport(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.reports.findFirst({
    where: and(eq(reports.id, id), eq(reports.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(reports).where(eq(reports.id, id))
  return true
}
