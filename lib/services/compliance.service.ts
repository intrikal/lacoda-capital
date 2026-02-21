// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockComplianceControls } from "@/lib/mock/data"
import type { ComplianceControl, ComplianceStatus } from "@/lib/mock/types"

export async function getComplianceControls(): Promise<ComplianceControl[]> {
  // REAL: return db.query.complianceControls.findMany()
  return mockComplianceControls
}

export async function getComplianceControlById(id: string): Promise<ComplianceControl | undefined> {
  // REAL: return db.query.complianceControls.findFirst({ where: eq(controls.id, id) })
  return mockComplianceControls.find((c) => c.id === id)
}

export async function getComplianceControlsByStatus(status: ComplianceStatus): Promise<ComplianceControl[]> {
  // REAL: return db.query.complianceControls.findMany({ where: eq(controls.status, status) })
  return mockComplianceControls.filter((c) => c.status === status)
}

export async function getComplianceSummary() {
  const all = mockComplianceControls
  const passing = all.filter((c) => c.status === "compliant").length
  // REAL: SQL COUNT grouped by status
  return {
    total: all.length,
    compliant: passing,
    nonCompliant: all.filter((c) => c.status === "non_compliant").length,
    inProgress: all.filter((c) => c.status === "in_progress").length,
    notStarted: all.filter((c) => c.status === "not_started").length,
    score: Math.round((passing / all.length) * 100),
  }
}
