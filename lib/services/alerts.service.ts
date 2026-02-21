// ─────────────────────────────────────────────────────────────────────────────
// ALERTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockAlerts } from "@/lib/mock/data"
import type { Alert, AlertSeverity } from "@/lib/mock/types"

export async function getAlerts(): Promise<Alert[]> {
  // REAL: return db.query.alerts.findMany({ orderBy: desc(alerts.timestamp) })
  return mockAlerts
}

export async function getUnreadAlerts(): Promise<Alert[]> {
  // REAL: return db.query.alerts.findMany({ where: eq(alerts.isRead, false) })
  return mockAlerts.filter((a) => !a.isRead)
}

export async function getAlertsBySeverity(severity: AlertSeverity): Promise<Alert[]> {
  // REAL: return db.query.alerts.findMany({ where: eq(alerts.severity, severity) })
  return mockAlerts.filter((a) => a.severity === severity)
}

export async function getAlertCount() {
  const unread = mockAlerts.filter((a) => !a.isRead)
  // REAL: SELECT COUNT(*) FROM alerts WHERE is_read = false
  return {
    total: mockAlerts.length,
    unread: unread.length,
    critical: unread.filter((a) => a.severity === "critical").length,
    warning: unread.filter((a) => a.severity === "warning").length,
  }
}
