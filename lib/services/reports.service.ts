// ─────────────────────────────────────────────────────────────────────────────
// REPORTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockReports } from "@/lib/mock/data"
import type { Report } from "@/lib/mock/types"

export async function getReports(): Promise<Report[]> {
  // REAL: return db.query.reports.findMany({ orderBy: desc(reports.generatedAt) })
  return mockReports
}

export async function getReportById(id: string): Promise<Report | undefined> {
  // REAL: return db.query.reports.findFirst({ where: eq(reports.id, id) })
  return mockReports.find((r) => r.id === id)
}

export async function getReportsByType(type: Report["type"]): Promise<Report[]> {
  // REAL: return db.query.reports.findMany({ where: eq(reports.type, type) })
  return mockReports.filter((r) => r.type === type)
}

export async function getReportStats() {
  const all = mockReports
  // REAL: use SQL aggregates
  return {
    total: all.length,
    ready: all.filter((r) => r.status === "ready").length,
    generating: all.filter((r) => r.status === "generating").length,
  }
}
