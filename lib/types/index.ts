/**
 * lib/types/index.ts
 *
 * Standalone TypeScript interfaces for all 18 domain entities.
 * These replace the GraphQL codegen-generated types from lib/graphql/generated/types.ts.
 * Each interface maps directly to its Drizzle ORM table definition.
 */

// ─── Client ───────────────────────────────────────────────────────────────────

export interface ClientRecord {
  id: string
  orgId: string
  displayName: string
  email: string | null
  phone: string | null
  clientStatus: "active" | "inactive" | "prospect"
  clientType: "individual" | "institution" | "trust" | "fund"
  totalAUM: number | null
  entityCount: number
  assetCount: number
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Entity ───────────────────────────────────────────────────────────────────

export interface EntityRecord {
  id: string
  orgId: string
  clientId: string
  parentId: string | null
  name: string
  entityType:
    | "llc"
    | "trust"
    | "corporation"
    | "partnership"
    | "personal"
    | "foundation"
    | "other"
  jurisdiction: string | null
  formationDate: string | null
  taxId: string | null
  assetCount: number
  totalValue: number
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export interface AssetRecord {
  id: string
  orgId: string
  entityId: string
  name: string
  description: string | null
  assetClass:
    | "real_estate"
    | "private_equity"
    | "public_equity"
    | "fixed_income"
    | "cash"
    | "alternatives"
    | "cryptocurrency"
    | "other"
  status: "active" | "sold" | "pending" | "inactive"
  acquisitionDate: string | null
  acquisitionCost: number | null
  currency: string
  currentValue: number | null
  valuedAt: string | null
  externalId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Valuation ───────────────────────────────────────────────────────────

export interface ValuationRecord {
  id: string
  assetId: string
  asOfDate: string
  value: number
  currency: string
  source: string | null
  notes: string | null
  createdAt: string
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface DocumentRecord {
  id: string
  orgId: string
  clientId: string | null
  entityId: string | null
  assetId: string | null
  name: string
  description: string | null
  mimeType: string | null
  fileSize: string | null
  storagePath: string
  folder: string | null
  status: "pending" | "verified" | "expired" | "rejected"
  expiresAt: string | null
  verifiedAt: string | null
  verifiedBy: string | null
  tags: string[]
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Document Request ─────────────────────────────────────────────────────────

export interface DocumentRequestRecord {
  id: string
  orgId: string
  clientId: string | null
  entityId: string | null
  assetId: string | null
  title: string
  description: string | null
  documentType: string | null
  status: "open" | "fulfilled" | "cancelled" | "overdue"
  priority: "low" | "medium" | "high" | "urgent"
  requestedBy: string | null
  assignedTo: string | null
  dueDate: string | null
  fulfilledAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface TaskRecord {
  id: string
  orgId: string
  title: string
  description: string | null
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate: string | null
  assignedTo: string | null
  createdBy: string | null
  clientId: string | null
  entityId: string | null
  assetId: string | null
  documentId: string | null
  completedAt: string | null
  completedBy: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface ReportRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  description: string | null
  reportType:
    | "portfolio_summary"
    | "asset_allocation"
    | "performance"
    | "tax_summary"
    | "compliance"
    | "client_statement"
    | "custom"
  status: "draft" | "published" | "archived"
  parameters: Record<string, unknown> | null
  currentVersionId: string | null
  currentVersionNumber: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export interface ComplianceEvidenceRecord {
  id: string
  controlId: string
  documentId: string | null
  clientId: string | null
  status: "pending" | "approved" | "rejected" | "expired"
  validFrom: string | null
  validUntil: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface ComplianceControlRecord {
  id: string
  orgId: string
  code: string
  name: string
  description: string | null
  category: string | null
  isActive: boolean
  status: "needs_attention" | "in_progress" | "compliant"
  frequency: string | null
  requiredDocumentTypes: string[]
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  evidence: ComplianceEvidenceRecord[]
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

export interface GoalRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  category:
    | "retirement"
    | "education"
    | "realestate"
    | "emergency"
    | "travel"
    | "vehicle"
    | "investment"
    | "custom"
  status: "on_track" | "ahead" | "behind" | "completed"
  priority: "high" | "medium" | "low"
  targetAmount: number
  currentAmount: number
  monthlyContribution: number
  targetDate: string
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Benchmark ────────────────────────────────────────────────────────────────

export interface BenchmarkRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  symbol: string | null
  category: "index" | "etf" | "mutual_fund" | "custom"
  ytdReturn: number
  alpha: number
  beta: number
  sharpeRatio: number
  volatility: number
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Billing Record ───────────────────────────────────────────────────────────

export interface BillingRecordItem {
  id: string
  orgId: string
  clientId: string
  period: string
  amount: number
  aum: number
  status: "paid" | "upcoming" | "due"
  dueDate: string
  paidDate: string | null
  effectiveRate: number
  description: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Tax Deduction ────────────────────────────────────────────────────────────

export interface TaxDeductionItem {
  id: string
  orgId: string
  clientId: string
  name: string
  category:
    | "home_office"
    | "vehicle"
    | "travel"
    | "equipment"
    | "professional"
    | "education"
    | "healthcare"
    | "meals"
    | "utilities"
    | "charitable"
    | "retirement"
    | "taxes"
    | "other"
  type: "personal" | "business"
  status: "eligible" | "pending_review" | "claimed" | "ineligible"
  amount: number
  estimatedSavings: number
  taxYear: string
  description: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Calendar Event ───────────────────────────────────────────────────────────

export type CalendarEventType =
  | "meeting"
  | "payment"
  | "dividend"
  | "deadline"
  | "document"
  | "call"

export interface CalendarEventRecord {
  id: string
  orgId: string
  clientId: string | null
  title: string
  type: CalendarEventType
  date: string
  time: string | null
  endTime: string | null
  location: string | null
  amount: number | null
  description: string | null
  attendees: string[] | null
  reminder: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Deal ─────────────────────────────────────────────────────────────────────

export type DealStage =
  | "prospecting"
  | "due_diligence"
  | "negotiation"
  | "closed"
  | "active"
  | "exit_planning"

export type DealType =
  | "real_estate"
  | "private_equity"
  | "venture_capital"
  | "fixed_income"

export interface DealRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  stage: DealStage
  type: DealType
  potentialValue: number
  probability: number
  assignedTo: string | null
  assigneeName: string | null
  dueDate: string | null
  notes: string | null
  lastActivity: string | null
  createdAt: string
  updatedAt: string
}

// ─── Insurance Policy ─────────────────────────────────────────────────────────

export interface InsurancePolicyRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  policyType:
    | "home"
    | "auto"
    | "life"
    | "umbrella"
    | "liability"
    | "health"
    | "business"
    | "property"
  status: "active" | "expiring" | "expired" | "pending"
  provider: string
  policyNumber: string
  coverageAmount: number
  deductible: number
  premium: number
  premiumFrequency: "monthly" | "quarterly" | "annual"
  effectiveDate: string
  expirationDate: string
  coveredAssets: string[] | null
  beneficiaries: string[] | null
  agent: { name: string; phone: string; email: string } | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Message / Conversation ───────────────────────────────────────────────────

export interface ConversationRecord {
  id: string
  orgId: string
  name: string
  type: "client" | "team"
  clientId: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface MessageAttachmentRecord {
  name: string
  size: string
  type: string
}

export interface MessageRecord {
  id: string
  conversationId: string
  senderId: string | null
  senderType: "advisor" | "client" | "team"
  content: string
  read: boolean
  metadata:
    | ({ attachments?: MessageAttachmentRecord[] } & Record<string, unknown>)
    | null
  createdAt: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "document_uploaded"
  | "document_expiring"
  | "document_requested"
  | "report_ready"
  | "compliance_alert"
  | "system"

export interface NotificationRecord {
  id: string
  userId: string
  orgId: string
  type: NotificationType
  title: string
  message: string | null
  readAt: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

// ─── Pagination wrapper ───────────────────────────────────────────────────────

/** Generic paginated list result returned by all list actions. */
export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  page: number
  limit: number
}
