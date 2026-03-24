"use server"

import { eq, and, count, desc } from "drizzle-orm"
import { db } from "@/app/db"
import { reports, reportVersions, assets, valuations, orgs } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createReportSchema, updateReportSchema } from "@/lib/validations/report.schema"
import type { ReportRecord, ReportVersionRecord, AssetRecord, PaginatedResult } from "@/lib/types"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { renderPDF, type PDFTemplateType } from "@/lib/pdf/render"
import { createClient } from "@/utils/supabase/server"
import { createLedgerEvent } from "@/lib/actions/ledger"

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

  captureServerEvent(session.userId, "report.generated", {
    org_id: session.orgId,
    report_type: parsed.reportType,
  })

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

/**
 * generateReport — Generates a PDF version of a report.
 *
 * 1. Fetches the report and validates org ownership
 * 2. Assembles portfolio data (assets + latest valuations)
 * 3. Renders PDF via @react-pdf/renderer
 * 4. Uploads to Supabase Storage under "reports" bucket
 * 5. Creates reportVersions row
 * 6. Updates reports.currentVersionId
 * 7. Logs a ledger event
 * 8. Returns signed download URL
 */
export async function generateReport(reportId: string): Promise<{ downloadUrl: string }> {
  const session = await requireRole("assistant")

  // 1. Fetch report and verify ownership
  const report = await db.query.reports.findFirst({
    where: and(eq(reports.id, reportId), eq(reports.orgId, session.orgId!)),
  })
  if (!report) throw new Error("Report not found")

  // 2. Fetch assets and latest valuations scoped to org
  const assetsList = await db
    .select()
    .from(assets)
    .where(eq(assets.orgId, session.orgId!))

  // Get latest valuation per asset
  const assetData = await Promise.all(
    assetsList.map(async (asset) => {
      const latestValuation = await db.query.valuations.findFirst({
        where: and(eq(valuations.assetId, asset.id), eq(valuations.orgId, session.orgId!)),
        orderBy: desc(valuations.valuedAt),
      })
      return {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        assetClass: asset.assetClass,
        currentValue: latestValuation?.valuedAmount ?? 0,
        acquisitionDate: asset.acquisitionDate?.toISOString() ?? null,
        notes: asset.notes,
      }
    })
  )

  // Calculate total AUM
  const totalAUM = assetData.reduce((sum, asset) => sum + asset.currentValue, 0)

  // 3. Render PDF based on report type
  let pdfBuffer: Buffer
  try {
    const templateType = report.reportType as PDFTemplateType

    if (templateType === "holdings_detail") {
      pdfBuffer = await renderPDF(templateType, {
        orgName: (await db.query.orgs.findFirst({
          where: eq(orgs.id, session.orgId!),
        }))?.name ?? "Organization",
        generatedAt: new Date(),
        totalAUM,
        assets: assetData,
      })
    } else {
      pdfBuffer = await renderPDF(templateType, {
        orgName: (await db.query.orgs.findFirst({
          where: eq(orgs.id, session.orgId!),
        }))?.name ?? "Organization",
        generatedAt: new Date(),
        totalAUM,
        assetCount: assetData.length,
        assets: assetData.map((a) => ({
          id: a.id,
          name: a.name,
          assetClass: a.assetClass,
          currentValue: a.currentValue,
        })),
      })
    }
  } catch (error) {
    throw new Error(`Failed to render PDF: ${error instanceof Error ? error.message : String(error)}`)
  }

  // 4. Upload to Supabase Storage
  const timestamp = Date.now()
  const fileName = `${reportId}_v${(report.currentVersionNumber ?? 0) + 1}_${timestamp}.pdf`
  const storagePath = `${session.orgId}/${reportId}/${fileName}`

  let uploadError: string | null = null
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.from("reports").upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    })
    if (error) uploadError = error.message
  } catch (error) {
    uploadError = error instanceof Error ? error.message : String(error)
  }

  if (uploadError) throw new Error(`Failed to upload PDF: ${uploadError}`)

  // 5. Create reportVersions row
  const versionNumber = (report.currentVersionNumber ?? 0) + 1
  const [newVersion] = await db
    .insert(reportVersions)
    .values({
      reportId,
      versionNumber,
      storagePath,
      generatedBy: session.memberId!,
      parametersSnapshot: report.parameters ?? {},
    })
    .returning()

  // 6. Update reports.currentVersionId
  await db
    .update(reports)
    .set({
      currentVersionId: newVersion.id,
      currentVersionNumber: versionNumber,
    })
    .where(eq(reports.id, reportId))

  // 7. Log ledger event
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "created",
    targetType: "report",
    targetId: reportId,
    metadata: {
      versionNumber,
      reportType: report.reportType,
      assetCount: assetData.length,
      totalAUM,
    },
  })

  // 8. Generate and return signed URL
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from("reports")
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (error) throw new Error(error.message)
    return { downloadUrl: data.signedUrl }
  } catch (error) {
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : String(error)}`)
  }
}

