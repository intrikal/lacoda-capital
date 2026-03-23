"use server"

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────
// No alerts table exists in the DB schema. Data is kept as static seed below.

import type { Alert, AlertSeverity } from "@/lib/types/mock"

const seedAlerts: Alert[] = [
  {
    id: "alert-001",
    title: "Document Expiring Soon",
    description: "Property Insurance Policy for Manhattan Tower expires in 352 days",
    severity: "info",
    timestamp: "2024-01-15T10:00:00Z",
    entityId: "doc-002",
    entityType: "document",
    isRead: false,
    actionUrl: "/app/vault",
  },
  {
    id: "alert-002",
    title: "Document Expired",
    description: "Licensing Agreement - TechCorp has expired and requires renewal",
    severity: "critical",
    timestamp: "2024-01-01T00:00:00Z",
    entityId: "doc-013",
    entityType: "document",
    isRead: false,
    actionUrl: "/app/vault",
  },
  {
    id: "alert-003",
    title: "Pending Verification",
    description: "Miami Development - Purchase Agreement awaiting legal verification",
    severity: "warning",
    timestamp: "2024-01-10T09:00:00Z",
    entityId: "doc-008",
    entityType: "document",
    isRead: true,
    actionUrl: "/app/vault",
  },
  {
    id: "alert-004",
    title: "Stale Valuation",
    description: "Software Patent Portfolio hasn't been valued in 32 days",
    severity: "warning",
    timestamp: "2024-01-15T08:00:00Z",
    entityId: "ast-009",
    entityType: "asset",
    isRead: false,
    actionUrl: "/app/assets",
  },
  {
    id: "alert-005",
    title: "High Risk Score",
    description: "Series B - Quantum Computing Startup has risk score above threshold (75)",
    severity: "info",
    timestamp: "2024-01-14T12:00:00Z",
    entityId: "ast-003",
    entityType: "asset",
    isRead: true,
    actionUrl: "/app/assets",
  },
  {
    id: "alert-006",
    title: "KYC Documents Pending",
    description: "Wellington Trust onboarding documents require review",
    severity: "warning",
    timestamp: "2024-01-12T14:00:00Z",
    entityId: "client-002",
    entityType: "client",
    isRead: false,
    actionUrl: "/app/clients",
  },
]

export async function getAlerts(): Promise<Alert[]> {
  return seedAlerts
}

export async function getUnreadAlerts(): Promise<Alert[]> {
  return seedAlerts.filter((a) => !a.isRead)
}

export async function getAlertsBySeverity(severity: AlertSeverity): Promise<Alert[]> {
  return seedAlerts.filter((a) => a.severity === severity)
}

export async function getAlertCount() {
  const unread = seedAlerts.filter((a) => !a.isRead)
  return {
    total: seedAlerts.length,
    unread: unread.length,
    critical: unread.filter((a) => a.severity === "critical").length,
    warning: unread.filter((a) => a.severity === "warning").length,
  }
}
