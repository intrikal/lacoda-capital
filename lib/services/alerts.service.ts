"use server"

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────
// Alerts are derived from the notifications table. Each notification type maps
// to an alert severity:
//   critical  → compliance_alert
//   warning   → document_expiring, task_due, capital_call_due, capital_call_overdue
//   info      → everything else (task_assigned, document_uploaded, report_ready, etc.)

import { db } from "@/app/db"
import { notifications } from "@/app/db/schema"
import { isNull } from "drizzle-orm"
import type { Alert, AlertSeverity } from "@/lib/types/mock"
import type { NotificationPayload } from "@/app/db/schema/notifications"

/** Map notification type to alert severity. */
function toSeverity(type: string): AlertSeverity {
  switch (type) {
    case "compliance_alert":
      return "critical"
    case "document_expiring":
    case "task_due":
    case "capital_call_due":
    case "capital_call_overdue":
      return "warning"
    default:
      return "info"
  }
}

/** Map a notifications DB row to the Alert shape. */
function toAlert(row: typeof notifications.$inferSelect): Alert {
  const payload = (row.payload ?? {}) as NotificationPayload
  return {
    id: row.id,
    title: row.title,
    description: row.message ?? "",
    severity: toSeverity(row.type),
    timestamp: row.createdAt.toISOString(),
    entityId: payload.entityId,
    entityType: payload.entityType,
    isRead: row.readAt !== null,
    actionUrl: row.link ?? undefined,
  }
}

export async function getAlerts(): Promise<Alert[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(isNull(notifications.deletedAt))
  return rows.map(toAlert)
}

export async function getUnreadAlerts(): Promise<Alert[]> {
  const all = await getAlerts()
  return all.filter((a) => !a.isRead)
}

export async function getAlertsBySeverity(severity: AlertSeverity): Promise<Alert[]> {
  const all = await getAlerts()
  return all.filter((a) => a.severity === severity)
}

export async function getAlertCount() {
  const all = await getAlerts()
  const unread = all.filter((a) => !a.isRead)
  return {
    total: all.length,
    unread: unread.length,
    critical: unread.filter((a) => a.severity === "critical").length,
    warning: unread.filter((a) => a.severity === "warning").length,
  }
}
