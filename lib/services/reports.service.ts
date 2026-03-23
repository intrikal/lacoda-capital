"use server"

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { reports } from "@/app/db/schema"
import { eq, desc, isNull } from "drizzle-orm"
import type { Report } from "@/lib/types/mock"

/**
 * Map DB report status/type enums to the mock Report type shape.
 * DB reportType: portfolio_summary | asset_allocation | performance | tax_summary | compliance | client_statement | custom
 * Mock type: portfolio | compliance | tax | performance | custom
 * DB status: draft | published | archived
 * Mock status: ready | generating | failed
 */
function mapReportType(dbType: string): Report["type"] {
  switch (dbType) {
    case "portfolio_summary":
    case "asset_allocation":
    case "client_statement":
      return "portfolio"
    case "tax_summary":
      return "tax"
    case "performance":
      return "performance"
    case "compliance":
      return "compliance"
    default:
      return "custom"
  }
}

function mapReportStatus(dbStatus: string): Report["status"] {
  switch (dbStatus) {
    case "published":
      return "ready"
    case "draft":
      return "generating"
    case "archived":
      return "ready"
    default:
      return "generating"
  }
}

/** Map a DB reports row to the Report mock type shape. */
function toReport(row: typeof reports.$inferSelect): Report {
  return {
    id: row.id,
    name: row.name,
    type: mapReportType(row.reportType),
    generatedAt: row.createdAt.toISOString(),
    generatedBy: row.createdBy ?? "",
    period: (row.parameters as Record<string, unknown>)?.period as string ?? "",
    status: mapReportStatus(row.status),
    downloadUrl: undefined,
  }
}

export async function getReports(): Promise<Report[]> {
  const rows = await db
    .select()
    .from(reports)
    .where(isNull(reports.deletedAt))
    .orderBy(desc(reports.createdAt))
  return rows.map(toReport)
}

export async function getReportById(id: string): Promise<Report | undefined> {
  const rows = await db.select().from(reports).where(eq(reports.id, id))
  return rows[0] ? toReport(rows[0]) : undefined
}

export async function getReportsByType(type: Report["type"]): Promise<Report[]> {
  const all = await getReports()
  return all.filter((r) => r.type === type)
}

export async function getReportStats() {
  const all = await getReports()
  return {
    total: all.length,
    ready: all.filter((r) => r.status === "ready").length,
    generating: all.filter((r) => r.status === "generating").length,
  }
}
