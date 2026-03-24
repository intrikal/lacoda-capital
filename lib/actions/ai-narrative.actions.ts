"use server"

import { eq, and, gte, desc, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { reports, reportVersions, assets, valuations, ledgerEvents, clients, entities } from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { narrativeAgent, buildNarrativePrompt } from "@/lib/agents/narrative"
import type { NarrativeContextData } from "@/lib/agents/narrative"

// ============================================================================
// AI Report Narrative Generation — Server Actions
// ============================================================================

/**
 * Generate a narrative summary for a report using AI.
 */
export async function generateReportNarrative(reportId: string) {
  const session = await requireRole("assistant")

  // Fetch the report
  const report = await db.query.reports.findFirst({
    where: and(eq(reports.id, reportId), eq(reports.orgId, session.orgId!)),
  })

  if (!report) {
    return { success: false as const, error: "Report not found", code: "NOT_FOUND" as const }
  }

  // Fetch client name if report is client-specific
  let clientName = "Organization Portfolio"
  if (report.clientId) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, report.clientId),
    })
    clientName = client?.displayName ?? "Unknown Client"
  }

  // Determine time period (default: last 90 days)
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000)
  const previousPeriodStart = new Date(periodStart.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Fetch current period asset data for this org
  const orgEntities = await db
    .select({ id: entities.id })
    .from(entities)
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(
      report.clientId
        ? and(eq(clients.orgId, session.orgId!), eq(clients.id, report.clientId))
        : eq(clients.orgId, session.orgId!)
    )

  const entityIds = orgEntities.map((e) => e.id)

  if (entityIds.length === 0) {
    return { success: false as const, error: "No entities found for this report scope", code: "EMPTY_CONTEXT" as const }
  }

  // Fetch all assets under these entities
  const allAssets = await db
    .select()
    .from(assets)
    .where(sql`${assets.entityId} = ANY(${entityIds})`)

  // Calculate total AUM
  const totalAUM = allAssets.reduce(
    (sum, a) => sum + parseFloat(a.currentValue ?? "0"),
    0
  )

  // Build asset allocation
  const allocationMap = new Map<string, number>()
  for (const a of allAssets) {
    const cls = a.assetClass ?? "other"
    allocationMap.set(cls, (allocationMap.get(cls) ?? 0) + parseFloat(a.currentValue ?? "0"))
  }
  const assetAllocation = Array.from(allocationMap.entries()).map(([assetClass, value]) => ({
    assetClass: assetClass.replace(/_/g, " "),
    value,
    percentage: totalAUM > 0 ? (value / totalAUM) * 100 : 0,
  }))

  // Fetch recent valuations
  const assetIds = allAssets.map((a) => a.id)
  const recentValuations = assetIds.length > 0
    ? await db
        .select()
        .from(valuations)
        .where(sql`${valuations.assetId} = ANY(${assetIds}) AND ${valuations.createdAt} >= ${periodStart}`)
        .orderBy(desc(valuations.createdAt))
        .limit(10)
    : []

  // Build valuation data with asset names
  const assetNameMap = new Map(allAssets.map((a) => [a.id, a.name]))
  const valuationData = recentValuations.map((v) => ({
    assetName: assetNameMap.get(v.assetId) ?? "Unknown Asset",
    value: parseFloat(v.value),
    date: v.createdAt?.toISOString().split("T")[0] ?? "Unknown",
  }))

  // Fetch notable ledger events
  const notableEvents = await db
    .select()
    .from(ledgerEvents)
    .where(
      and(
        eq(ledgerEvents.orgId, session.orgId!),
        gte(ledgerEvents.createdAt, periodStart)
      )
    )
    .orderBy(desc(ledgerEvents.createdAt))
    .limit(20)

  const eventData = notableEvents.map((e) => ({
    action: e.action,
    description: JSON.stringify(e.payload ?? {}),
    date: e.createdAt?.toISOString().split("T")[0] ?? "Unknown",
  }))

  // Calculate previous period AUM (rough estimate from valuations)
  let previousAUM: number | undefined
  if (assetIds.length > 0) {
    const previousValuations = await db
      .select()
      .from(valuations)
      .where(sql`${valuations.assetId} = ANY(${assetIds}) AND ${valuations.createdAt} >= ${previousPeriodStart} AND ${valuations.createdAt} < ${periodStart}`)
      .orderBy(desc(valuations.createdAt))

    if (previousValuations.length > 0) {
      previousAUM = previousValuations.reduce(
        (sum, v) => sum + parseFloat(v.value),
        0
      )
    }
  }

  // Build context and prompt
  const contextData: NarrativeContextData = {
    clientName,
    reportType: report.reportType ?? "portfolio_summary",
    period: `${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    totalAUM,
    previousAUM,
    assetAllocation,
    recentValuations: valuationData,
    notableEvents: eventData,
  }

  const prompt = buildNarrativePrompt(contextData)

  // Run the narrative agent
  const result = await narrativeAgent.run(prompt, {
    orgId: session.orgId!,
    actorUserId: session.userId,
    targetId: reportId,
    targetType: "report",
  })

  if (!result.success) {
    return result
  }

  return {
    ...result,
    contextData,
  }
}

/**
 * Save the AI-generated or user-edited narrative to a report version.
 */
export async function saveReportNarrative(params: {
  reportId: string
  summary: string
  keyHighlights: string[]
  isAiGenerated: boolean
}) {
  const session = await requireRole("assistant")
  const { reportId, summary, keyHighlights, isAiGenerated } = params

  // Fetch the report
  const report = await db.query.reports.findFirst({
    where: and(eq(reports.id, reportId), eq(reports.orgId, session.orgId!)),
  })

  if (!report) {
    return { success: false as const, error: "Report not found" }
  }

  // Get current version number
  const currentVersion = report.currentVersionNumber ?? 0
  const newVersion = currentVersion + 1

  // Create a new report version
  const [version] = await db
    .insert(reportVersions)
    .values({
      reportId,
      versionNumber: newVersion,
      parametersSnapshot: {
        customFilters: {
          narrative: summary,
          keyHighlights,
          generatedBy: isAiGenerated ? "ai" : "manual",
        },
      },
    })
    .returning()

  // Update the report's current version number
  await db
    .update(reports)
    .set({ currentVersionNumber: newVersion, updatedAt: new Date() })
    .where(eq(reports.id, reportId))

  // Log ledger event
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "report_generated",
    targetType: "report",
    targetId: reportId,
    metadata: {
      versionNumber: newVersion,
      generatedBy: isAiGenerated ? "ai" : "manual",
    },
  })

  return {
    success: true as const,
    versionId: version.id,
    versionNumber: newVersion,
  }
}
