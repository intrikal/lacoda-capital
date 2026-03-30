"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, sql, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import {
  clients, entities, assets, valuations, documents, ledgerEvents,
  orgMembers, tasks, reports, billingRecords,
} from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { ExportManifest, ExportTableData, OrgExportResult } from "@/lib/export-utils"

// Types and CSV helpers live in @/lib/export-utils to avoid
// exporting non-async functions from this "use server" module.

// ─── Export all org data ────────────────────────────────────────────────────

export async function exportOrgData(format: "json" | "csv" | "both" = "both"): Promise<OrgExportResult> {
  const session = await requireRole("admin")

  const orgId = session.orgId
  const notDeleted = isNull

  // Fetch all tables in parallel
  const [
    clientRows,
    entityRows,
    assetRows,
    valuationRows,
    documentRows,
    ledgerRows,
    memberRows,
    taskRows,
    reportRows,
    billingRows,
  ] = await Promise.all([
    db.select().from(clients).where(and(eq(clients.orgId, orgId), notDeleted(clients.deletedAt))),
    db.select().from(entities)
      .innerJoin(clients, eq(entities.clientId, clients.id))
      .where(and(eq(clients.orgId, orgId), notDeleted(entities.deletedAt))),
    db.select({ asset: assets }).from(assets)
      .innerJoin(entities, eq(assets.entityId, entities.id))
      .innerJoin(clients, eq(entities.clientId, clients.id))
      .where(and(eq(clients.orgId, orgId), notDeleted(assets.deletedAt))),
    db.select({ valuation: valuations }).from(valuations)
      .innerJoin(assets, eq(valuations.assetId, assets.id))
      .innerJoin(entities, eq(assets.entityId, entities.id))
      .innerJoin(clients, eq(entities.clientId, clients.id))
      .where(eq(clients.orgId, orgId)),
    db.select().from(documents).where(and(eq(documents.orgId, orgId), notDeleted(documents.deletedAt))),
    db.select().from(ledgerEvents).where(eq(ledgerEvents.orgId, orgId)),
    db.select().from(orgMembers).where(and(eq(orgMembers.orgId, orgId), notDeleted(orgMembers.deletedAt))),
    db.select().from(tasks).where(and(eq(tasks.orgId, orgId), notDeleted(tasks.deletedAt))),
    db.select().from(reports).where(eq(reports.orgId, orgId)),
    db.select().from(billingRecords).where(and(eq(billingRecords.orgId, orgId), notDeleted(billingRecords.deletedAt))),
  ])

  function extractRows(data: Record<string, unknown>[], unwrapKey?: string): Record<string, unknown>[] {
    if (unwrapKey) return data.map((r) => r[unwrapKey] as Record<string, unknown>)
    return data
  }

  function getColumns(rows: Record<string, unknown>[]): string[] {
    if (rows.length === 0) return []
    return Object.keys(rows[0])
  }

  const tablesList: ExportTableData[] = [
    { tableName: "clients", rows: extractRows(clientRows as Record<string, unknown>[]), columns: [] },
    { tableName: "entities", rows: entityRows.map((r) => r.entities as unknown as Record<string, unknown>), columns: [] },
    { tableName: "assets", rows: extractRows(assetRows as Record<string, unknown>[], "asset"), columns: [] },
    { tableName: "valuations", rows: extractRows(valuationRows as Record<string, unknown>[], "valuation"), columns: [] },
    { tableName: "documents_metadata", rows: extractRows(documentRows as Record<string, unknown>[]), columns: [] },
    { tableName: "ledger_events", rows: extractRows(ledgerRows as Record<string, unknown>[]), columns: [] },
    { tableName: "org_members", rows: extractRows(memberRows as Record<string, unknown>[]), columns: [] },
    { tableName: "tasks", rows: extractRows(taskRows as Record<string, unknown>[]), columns: [] },
    { tableName: "reports", rows: extractRows(reportRows as Record<string, unknown>[]), columns: [] },
    { tableName: "billing_records", rows: extractRows(billingRows as Record<string, unknown>[]), columns: [] },
  ]

  // Fill in columns from data
  for (const table of tablesList) {
    table.columns = getColumns(table.rows)
  }

  const manifest: ExportManifest = {
    orgId,
    exportedAt: new Date().toISOString(),
    exportedBy: session.userId,
    tables: tablesList.map((t) => ({ name: t.tableName, rowCount: t.rows.length })),
    format,
  }

  await createLedgerEvent({
    orgId,
    actorId: session.userId,
    action: "report_generated",
    targetType: "org",
    targetId: orgId,
    metadata: {
      action: "org_data_export",
      format,
      tableCount: tablesList.length,
      totalRows: tablesList.reduce((sum, t) => sum + t.rows.length, 0),
    },
  })

  captureServerEvent(session.userId, "data.exported", { format })

  return { manifest, tables: tablesList }
}

/**
 * exportUserData — Export all personal data for a specific user (GDPR DSAR).
 */
export async function exportUserData(): Promise<{
  userData: Record<string, unknown>
  orgMemberships: Record<string, unknown>[]
  ledgerActivity: Record<string, unknown>[]
}> {
  const session = await requireRole("client")

  const [userRow] = await db
    .select()
    .from(db._.fullSchema.users)
    .where(eq(db._.fullSchema.users.id, session.userId))

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.userId))

  const activity = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.actorUserId, session.userId))
    .limit(1000)

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "report_generated",
    targetType: "user",
    targetId: session.userId,
    metadata: { action: "personal_data_export" },
  })

  return {
    userData: (userRow ?? {}) as Record<string, unknown>,
    orgMemberships: memberships as unknown as Record<string, unknown>[],
    ledgerActivity: activity as unknown as Record<string, unknown>[],
  }
}
