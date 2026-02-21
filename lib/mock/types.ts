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
// Pipeline Types
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineStageId =
  | "prospecting"
  | "due_diligence"
  | "negotiation"
  | "closed"
  | "active"
  | "exit_planning"

export interface PipelineStage {
  id: PipelineStageId
  name: string
  color: string
  description: string
}

export interface Deal {
  id: string
  name: string
  stage: PipelineStageId
  type: string
  potentialValue: number
  probability: number
  assignee: string
  dueDate: string | null
  lastActivity: string
  notes: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Types (Advisor Dashboard — not the marketing events page)
// ─────────────────────────────────────────────────────────────────────────────

export type CalendarEventType =
  | "meeting"
  | "payment"
  | "dividend"
  | "deadline"
  | "document"
  | "call"

export interface CalendarEvent {
  id: string
  title: string
  type: CalendarEventType
  /** ISO date string — kept as string so data is serialisable */
  date: string
  time?: string
  endTime?: string
  location?: string
  amount?: number
  description?: string
  attendees?: string[]
  reminder?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageAttachment {
  name: string
  size: string
  type: string
}

export interface Message {
  id: string
  conversationId: string
  sender: string
  senderType: "advisor" | "client" | "team"
  content: string
  timestamp: string
  read: boolean
  attachments?: MessageAttachment[]
}

export interface Conversation {
  id: string
  name: string
  type: "client" | "team"
  avatar: string
  avatarColor: string
  lastMessage: string
  timestamp: string
  unread: number
  online: boolean
  /** AUM displayed in conversation list (clients only) */
  aum?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Goals Types
// ─────────────────────────────────────────────────────────────────────────────

export type GoalCategory =
  | "retirement"
  | "education"
  | "realestate"
  | "emergency"
  | "travel"
  | "vehicle"
  | "investment"
  | "custom"

export type GoalStatus = "on_track" | "ahead" | "behind" | "completed"

export interface GoalMilestone {
  name: string
  amount: number
  reached: boolean
}

export interface FinancialGoal {
  id: string
  name: string
  category: GoalCategory
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
  priority: "high" | "medium" | "low"
  status: GoalStatus
  notes?: string
  milestones?: GoalMilestone[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Summary Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalPortfolioValue: number
  monthlyChange: number
  monthlyChangePercent: number
  ytdReturn: number
  netWorth: number
  activeAlerts: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Portal Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PortfolioHolding
 *
 * Represents a single investment position in the client's personal portfolio.
 * This is the CLIENT view of holdings — distinct from the advisor-side `Asset`
 * which tracks firm-level assets under management.
 *
 * tRPC swap path: `trpc.client.portfolio.holdings.useQuery()`
 */
export interface PortfolioHolding {
  /** Unique holding identifier, e.g. "hold-001" */
  id: string
  /** Ticker symbol or short code, e.g. "VTI", "RE-NYC" */
  symbol: string
  /** Full display name of the investment */
  name: string
  /** Asset class bucket for allocation charts */
  assetClass: AssetClass
  /** Current market value in USD */
  value: number
  /** Original cost basis in USD */
  costBasis: number
  /** Number of shares / units held (null for real estate / PE) */
  shares: number | null
  /** Current price per share (null if not applicable) */
  price: number | null
  /** Dollar gain/loss vs cost basis */
  gain: number
  /** Percentage gain/loss vs cost basis */
  gainPercent: number
  /** Optional: expected annual dividend/distribution amount */
  annualIncome?: number
}

/** Type of client transfer request */
export type ClientTransferType = "deposit" | "withdrawal" | "transfer"

/** Lifecycle status of a transfer request */
export type ClientTransferStatus = "pending" | "processing" | "completed" | "cancelled" | "failed"

/**
 * ClientTransfer
 *
 * A fund movement request initiated by the client — deposit into an
 * investment account, withdrawal to a bank, or internal transfer between
 * investment accounts.
 *
 * tRPC swap path: `trpc.client.transfers.list.useQuery()`
 */
export interface ClientTransfer {
  /** Unique transfer identifier, e.g. "txfr-001" */
  id: string
  /** Type of movement */
  type: ClientTransferType
  /** Amount in USD */
  amount: number
  /** Source account label (bank name or account name) */
  fromAccount: string
  /** Destination account label */
  toAccount: string
  /** Current processing status */
  status: ClientTransferStatus
  /** "One-time" | "Weekly" | "Monthly" | "Quarterly" */
  frequency: string
  /** ISO date string when the request was created */
  createdAt: string
  /** ISO date string when the transfer was completed (if applicable) */
  completedAt?: string
  /** Optional advisor note or reference number */
  reference?: string
}

/** Beneficiary designation type in estate planning */
export type BeneficiaryDesignation = "primary" | "contingent"

/**
 * Beneficiary
 *
 * An estate planning beneficiary designation on one or more client accounts.
 * Contingent beneficiaries only receive assets if all primary beneficiaries
 * predecease the account holder.
 *
 * tRPC swap path: `trpc.client.beneficiaries.list.useQuery()`
 */
export interface Beneficiary {
  /** Unique beneficiary identifier, e.g. "ben-001" */
  id: string
  /** Full legal name */
  name: string
  /** Relationship to account holder, e.g. "Spouse", "Child" */
  relationship: string
  /** Primary or contingent designation */
  designation: BeneficiaryDesignation
  /** Percentage of assets to receive (must sum to 100 per designation type) */
  percentage: number
  /** Account names this beneficiary is assigned to */
  accounts: string[]
  /** Last four digits of SSN for identity verification */
  ssnLast4?: string
  /** Date of birth in ISO format (YYYY-MM-DD) */
  dateOfBirth?: string
  /** Phone number */
  phone?: string
  /** Email address */
  email?: string
  /** Whether identity has been verified by compliance */
  verified: boolean
}

/** Billing invoice status */
export type BillingStatus = "paid" | "upcoming" | "due"

/**
 * BillingRecord
 *
 * A historical or upcoming advisory fee invoice for the client.
 * Advisory fees are typically charged quarterly as a percentage of AUM.
 *
 * tRPC swap path: `trpc.client.billing.history.useQuery()`
 */
export interface BillingRecord {
  /** Unique invoice identifier, e.g. "inv-001" */
  id: string
  /** Human-readable billing period label, e.g. "Q4 2023" */
  period: string
  /** Total advisory fee amount in USD */
  amount: number
  /** Average assets under management for this period */
  aum: number
  /** Payment status */
  status: BillingStatus
  /** ISO date string for payment due date */
  dueDate: string
  /** ISO date string for actual payment date (if paid) */
  paidDate?: string
  /** Effective fee rate as a decimal, e.g. 0.0085 for 0.85% */
  effectiveRate: number
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
