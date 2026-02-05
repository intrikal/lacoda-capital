// ═══════════════════════════════════════════════════════════════════════════
// LACODA CAPITAL HOLDINGS - TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type AssetClass =
  | "real_estate"
  | "equities"
  | "private_equity"
  | "cash"
  | "fixed_income"
  | "crypto"
  | "intellectual_property"
  | "alternatives"

export type AssetStatus = "active" | "pending" | "sold" | "under_review"

export type DocumentStatus = "verified" | "pending" | "expired" | "missing"

export type AlertSeverity = "critical" | "warning" | "info"

export type LedgerActionType =
  | "asset_created"
  | "asset_updated"
  | "asset_sold"
  | "document_uploaded"
  | "document_verified"
  | "document_expired"
  | "valuation_updated"
  | "user_login"
  | "user_invited"
  | "report_generated"
  | "permission_changed"
  | "client_added"
  | "compliance_check"

export type ComplianceStatus = "compliant" | "non_compliant" | "in_progress" | "not_started"

export type UserRole = "owner" | "admin" | "analyst" | "viewer" | "auditor"

// ─────────────────────────────────────────────────────────────────────────────
// Core Entities
// ─────────────────────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  name: string
  class: AssetClass
  status: AssetStatus
  value: number
  previousValue: number
  acquisitionDate: string
  lastValuationDate: string
  location?: string
  description: string
  documents: string[]
  notes: string
  assignedTo?: string
  riskScore: number
}

export interface Document {
  id: string
  name: string
  type: string
  status: DocumentStatus
  assetId?: string
  clientId?: string
  uploadedBy: string
  uploadedAt: string
  expiresAt?: string
  size: string
  tags: string[]
  folder: string
}

export interface LedgerEntry {
  id: string
  timestamp: string
  action: LedgerActionType
  user: string
  entity: string
  entityType: "asset" | "document" | "user" | "client" | "report"
  details: string
  isSensitive: boolean
  ipAddress: string
}

export interface Alert {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  timestamp: string
  entityId?: string
  entityType?: string
  isRead: boolean
  actionUrl?: string
}

export interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  assignedTo: string
  priority: "high" | "medium" | "low"
  status: "pending" | "in_progress" | "completed"
  relatedEntity?: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  type: "individual" | "institution" | "trust" | "fund"
  status: "active" | "inactive" | "prospect"
  aum: number
  joinedDate: string
  lastActivity: string
  assignedAssets: string[]
  assignedDocuments: string[]
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  lastLogin: string
  mfaEnabled: boolean
  status: "active" | "inactive" | "pending"
}

export interface ComplianceControl {
  id: string
  name: string
  description: string
  category: string
  status: ComplianceStatus
  lastChecked: string
  evidenceLinks: string[]
  owner: string
}

export interface Report {
  id: string
  name: string
  type: "portfolio" | "compliance" | "tax" | "performance" | "custom"
  generatedAt: string
  generatedBy: string
  period: string
  status: "ready" | "generating" | "failed"
  downloadUrl?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Data Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KPIData {
  label: string
  value: number
  previousValue: number
  format: "currency" | "percentage" | "number" | "score"
  trend: "up" | "down" | "neutral"
}

export interface AllocationData {
  name: string
  value: number
  color: string
  class: AssetClass
}

export interface PerformanceData {
  month: string
  portfolio: number
  benchmark: number
}

export interface ActivityItem {
  id: string
  type: LedgerActionType
  description: string
  user: string
  timestamp: string
  entityName: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D Constellation Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstellationNode {
  id: string
  label: string
  class: AssetClass
  value: number
  connections: string[]
  position: [number, number, number]
  size: number
  details: {
    count: number
    performance: number
    lastUpdate: string
  }
}
