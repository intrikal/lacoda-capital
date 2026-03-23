"use server"

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { complianceControls } from "@/app/db/schema"
import { eq } from "drizzle-orm"
import type { ComplianceControl, ComplianceStatus } from "@/lib/types/mock"

/**
 * Map DB compliance status enum values to the mock ComplianceStatus type.
 * DB uses: not_started | in_progress | implemented | verified
 * Mock uses: compliant | non_compliant | in_progress | not_started
 */
function mapStatus(dbStatus: string): ComplianceStatus {
  switch (dbStatus) {
    case "verified":
    case "implemented":
      return "compliant"
    case "in_progress":
      return "in_progress"
    case "not_started":
    default:
      return "not_started"
  }
}

/** Map a DB compliance_controls row to the ComplianceControl mock type shape. */
function toComplianceControl(row: typeof complianceControls.$inferSelect): ComplianceControl {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? row.framework ?? "",
    status: mapStatus(row.status),
    lastChecked: row.updatedAt.toISOString(),
    evidenceLinks: [],
    owner: row.assigneeId ?? "",
  }
}

export async function getComplianceControls(): Promise<ComplianceControl[]> {
  const rows = await db.select().from(complianceControls).where(eq(complianceControls.isActive, true))
  return rows.map(toComplianceControl)
}

export async function getComplianceControlById(id: string): Promise<ComplianceControl | undefined> {
  const rows = await db.select().from(complianceControls).where(eq(complianceControls.id, id))
  return rows[0] ? toComplianceControl(rows[0]) : undefined
}

export async function getComplianceControlsByStatus(status: ComplianceStatus): Promise<ComplianceControl[]> {
  const all = await getComplianceControls()
  return all.filter((c) => c.status === status)
}

export async function getComplianceSummary() {
  const all = await getComplianceControls()
  const passing = all.filter((c) => c.status === "compliant").length
  return {
    total: all.length,
    compliant: passing,
    nonCompliant: all.filter((c) => c.status === "non_compliant").length,
    inProgress: all.filter((c) => c.status === "in_progress").length,
    notStarted: all.filter((c) => c.status === "not_started").length,
    score: all.length > 0 ? Math.round((passing / all.length) * 100) : 0,
  }
}
