import { pgEnum } from "drizzle-orm/pg-core";

/**
 * ============================================================================
 * GLOSSARY FOR KEVIN - Database Fundamentals
 * ============================================================================
 *
 * Before diving into the schema, let's define key terms you'll see everywhere:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PRIMARY KEY (PK)                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ WHAT: A column (or columns) that UNIQUELY identifies each row           │
 * │ WHY:  Every table needs a way to find a specific row                    │
 * │ RULES:                                                                   │
 * │   - Must be UNIQUE (no two rows can have the same PK)                   │
 * │   - Cannot be NULL (every row must have a value)                        │
 * │   - Should NEVER change once set                                        │
 * │                                                                         │
 * │ EXAMPLE:                                                                │
 * │   clients table:                                                        │
 * │   ┌──────────────────────────────────────┬────────────────┐             │
 * │   │ id (PK)                              │ display_name   │             │
 * │   ├──────────────────────────────────────┼────────────────┤             │
 * │   │ 550e8400-e29b-41d4-a716-446655440000 │ John Smith     │             │
 * │   │ 6ba7b810-9dad-11d1-80b4-00c04fd430c8 │ Jane Doe       │             │
 * │   └──────────────────────────────────────┴────────────────┘             │
 * │   Each UUID is unique → you can find exactly ONE row with that ID       │
 * │                                                                         │
 * │ IN DRIZZLE:                                                             │
 * │   id: uuid("id").primaryKey().defaultRandom()                           │
 * │        ▲ column   ▲ "this is the PK"  ▲ auto-generate UUID              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ FOREIGN KEY (FK)                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ WHAT: A column that REFERENCES a PK in another table                    │
 * │ WHY:  Creates RELATIONSHIPS between tables                              │
 * │ RULES:                                                                   │
 * │   - Value must exist in the referenced table (referential integrity)    │
 * │   - Can be NULL if the relationship is optional                         │
 * │   - Points from CHILD table to PARENT table                             │
 * │                                                                         │
 * │ EXAMPLE:                                                                │
 * │   entities table:                                                       │
 * │   ┌──────────────────────┬──────────────────────┬────────────┐          │
 * │   │ id (PK)              │ client_id (FK)       │ name       │          │
 * │   ├──────────────────────┼──────────────────────┼────────────┤          │
 * │   │ aaa-111              │ 550e8400-e29b-...    │ Smith LLC  │          │
 * │   │ bbb-222              │ 550e8400-e29b-...    │ Smith Trust│          │
 * │   │ ccc-333              │ 6ba7b810-9dad-...    │ Doe Family │          │
 * │   └──────────────────────┴──────────────────────┴────────────┘          │
 * │         ▲                       ▲                                       │
 * │      This table's PK     Points to clients.id (PK of clients table)     │
 * │                                                                         │
 * │ RELATIONSHIP: One client (John Smith) has TWO entities (LLC, Trust)     │
 * │                                                                         │
 * │ IN DRIZZLE:                                                             │
 * │   clientId: uuid("client_id")                                           │
 * │     .notNull()                              // FK is required           │
 * │     .references(() => clients.id,           // Points to clients.id     │
 * │       { onDelete: "cascade" })              // Delete entities if       │
 * │                                             // client is deleted        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ONE-TO-MANY Relationship                                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ WHAT: One row in Table A relates to MANY rows in Table B                │
 * │                                                                         │
 * │ VISUAL:                                                                 │
 * │                                                                         │
 * │   ┌────────────┐         ┌────────────────┐                             │
 * │   │  Clients   │ ──────< │    Entities    │                             │
 * │   │   (ONE)    │         │     (MANY)     │                             │
 * │   │   id (PK)  │         │ client_id (FK) │                             │
 * │   └────────────┘         └────────────────┘                             │
 * │        │                         │                                      │
 * │        │                         ▼                                      │
 * │   "John Smith"          "Smith LLC", "Smith Trust"                      │
 * │                                                                         │
 * │ THE FK IS ALWAYS ON THE "MANY" SIDE (the child table)                   │
 * │                                                                         │
 * │ IN DRIZZLE RELATIONS:                                                   │
 * │   // On clients.ts (the ONE side - parent):                             │
 * │   entities: many(entities)  // "A client has MANY entities"             │
 * │                                                                         │
 * │   // On entities.ts (the MANY side - child):                            │
 * │   client: one(clients, {                                                │
 * │     fields: [entities.clientId],  // FK on THIS table                   │
 * │     references: [clients.id],     // PK on PARENT table                 │
 * │   })                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ MANY-TO-MANY Relationship                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ WHAT: Many rows in Table A relate to Many rows in Table B               │
 * │ HOW:  Requires a JUNCTION TABLE (also called "join table" or "pivot")   │
 * │                                                                         │
 * │ VISUAL:                                                                 │
 * │                                                                         │
 * │   ┌──────────────┐      ┌───────────────┐      ┌────────────┐           │
 * │   │ OrgMembers   │ ───< │  Assignments  │ >─── │  Clients   │           │
 * │   │ (Assistants) │      │  (JUNCTION)   │      │            │           │
 * │   └──────────────┘      └───────────────┘      └────────────┘           │
 * │         │                      │                     │                  │
 * │         │         ┌────────────┴────────────┐        │                  │
 * │         │         │ assistant_member_id (FK)│        │                  │
 * │         │         │ client_id (FK)          │        │                  │
 * │         │         └─────────────────────────┘        │                  │
 * │         │                                            │                  │
 * │      "Alice"  ←── assigns to ──→  "John Smith"       │                  │
 * │      "Alice"  ←── assigns to ──→  "Jane Doe"         │                  │
 * │      "Bob"    ←── assigns to ──→  "John Smith"       │                  │
 * │                                                                         │
 * │ JUNCTION TABLE has TWO FKs - one to each side                           │
 * │                                                                         │
 * │ IN DRIZZLE RELATIONS:                                                   │
 * │   // On assignments.ts (junction):                                      │
 * │   assistant: one(orgMembers, { fields, references })                    │
 * │   client: one(clients, { fields, references })                          │
 * │                                                                         │
 * │   // On orgMembers.ts:                                                  │
 * │   assignmentsAsAssistant: many(assignments)                             │
 * │                                                                         │
 * │   // On clients.ts:                                                     │
 * │   assignments: many(assignments)                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ onDelete Options                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ What happens to child rows when the parent is deleted?                  │
 * │                                                                         │
 * │ "cascade"   → Delete children too (client deleted → entities deleted)   │
 * │ "set null"  → Set FK to NULL (keep orphan rows)                         │
 * │ "restrict"  → Prevent deletion if children exist (throws error)         │
 * │ "no action" → Same as restrict in PostgreSQL                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ============================================================================
 */

/**
 * Centralized Enum Definitions
 *
 * Kevin, we define all enums in one place for several reasons:
 * 1. Prevents circular dependencies between schema files
 * 2. Single source of truth for allowed values
 * 3. Easy to extend when business requirements change
 * 4. PostgreSQL enums are type-safe at the database level
 *
 * Naming convention: singular noun describing the enum type
 */

// ============================================================================
// Organization & User Roles
// ============================================================================

/**
 * Org member roles - determines permissions within an organization
 * - admin: Full access, can manage org settings and members
 * - assistant: Can manage clients and their data, limited org settings
 * - client: Read-only access to their own data via client portal
 */
export const orgMemberRoleEnum = pgEnum("org_member_role", [
  "admin",
  "assistant",
  "client",
]);

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Legal entity types that can hold assets
 * - personal: Individual ownership
 * - llc: Limited Liability Company
 * - trust: Various trust structures (revocable, irrevocable, etc.)
 * - corporation: C-corp, S-corp
 * - partnership: LP, LLP, GP
 * - foundation: Private foundations
 */
export const entityTypeEnum = pgEnum("entity_type", [
  "personal",
  "llc",
  "trust",
  "corporation",
  "partnership",
  "foundation",
]);

// ============================================================================
// Asset Classes
// ============================================================================

/**
 * Asset classification for portfolio analysis and reporting
 * These align with standard wealth management categories
 */
export const assetClassEnum = pgEnum("asset_class", [
  "real_estate",
  "equities",
  "fixed_income",
  "private_equity",
  "venture_capital",
  "hedge_funds",
  "commodities",
  "cash",
  "crypto",
  "collectibles",
  "intellectual_property",
  "insurance",
  "other",
]);

/**
 * Asset status lifecycle
 * - active: Currently held and valued
 * - pending: Acquisition in progress
 * - sold: Disposed of (kept for historical reporting)
 * - transferred: Moved to another entity
 */
export const assetStatusEnum = pgEnum("asset_status", [
  "active",
  "pending",
  "sold",
  "transferred",
]);

// ============================================================================
// Valuation Sources
// ============================================================================

/**
 * Valuation source — how a valuation number was obtained
 * Every valuation must declare its source for audit credibility:
 * - manual: Entered by a human (advisor or assistant)
 * - appraisal: From a professional appraisal (e.g., property appraisal)
 * - market_data: From a market data feed (e.g., stock price, index value)
 * - ai_extraction: Extracted by an AI agent from a document or data source
 * - api_feed: From an integrated API (e.g., Plaid, Yodlee)
 */
export const valuationSourceEnum = pgEnum("valuation_source", [
  "manual",
  "appraisal",
  "market_data",
  "ai_extraction",
  "api_feed",
]);

// ============================================================================
// Document Management
// ============================================================================

/**
 * Document verification status
 * - pending: Uploaded but not reviewed
 * - verified: Reviewed and confirmed valid
 * - expired: Past expiration date, needs renewal
 * - rejected: Reviewed and found invalid
 */
export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "verified",
  "expired",
  "rejected",
]);

/**
 * Document request status — tracks the lifecycle of a document request
 * - pending: Request created, not yet sent to the recipient
 * - sent: Request has been sent (email/portal notification delivered)
 * - received: Document has been uploaded by the recipient
 * - reviewed: Staff has reviewed the uploaded document
 * - approved: Document has been approved and linked
 */
export const documentRequestStatusEnum = pgEnum("document_request_status", [
  "pending",
  "sent",
  "received",
  "reviewed",
  "approved",
]);

// ============================================================================
// Tasks
// ============================================================================

/**
 * Task status for workflow management
 */
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

/**
 * Task priority levels
 */
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// ============================================================================
// Audit & Compliance
// ============================================================================

/**
 * Compliance control status
 * - not_started: Control has been defined but no work has begun
 * - in_progress: Evidence is being gathered or implementation underway
 * - implemented: Control is in place but not yet independently verified
 * - verified: Control has been audited/verified by a reviewer
 */
export const complianceControlStatusEnum = pgEnum("compliance_control_status", [
  "not_started",
  "in_progress",
  "implemented",
  "verified",
]);

/**
 * Ledger event actions - append-only audit log
 * These capture all significant system events for compliance
 */
export const ledgerActionEnum = pgEnum("ledger_action", [
  // CRUD operations
  "created",
  "updated",
  "deleted",
  "archived",
  // Document lifecycle
  "document_uploaded",
  "document_verified",
  "document_expired",
  "document_downloaded",
  // Asset lifecycle
  "asset_valued",
  "asset_transferred",
  "asset_sold",
  // Access events
  "login",
  "logout",
  "permission_changed",
  // Report events
  "report_generated",
  "report_shared",
  // Compliance events
  "compliance_reviewed",
  "compliance_approved",
  // System / non-user actor events
  "api_read",
  "portal_accessed",
]);

/**
 * Target types for polymorphic ledger references
 */
export const ledgerTargetTypeEnum = pgEnum("ledger_target_type", [
  "org",
  "user",
  "client",
  "entity",
  "asset",
  "document",
  "task",
  "report",
  "stakeholder_portal",
]);

// ============================================================================
// Goals
// ============================================================================

/**
 * Goal category — the type of financial objective
 * - retirement:  Long-term retirement savings
 * - education:   Tuition, college funds
 * - realestate:  Property acquisition / portfolio expansion
 * - emergency:   Liquid safety-net reserve
 * - travel:      Vacation homes, travel funds
 * - vehicle:     Car / boat / aircraft purchase
 * - investment:  General investment growth targets
 * - custom:      Any user-defined goal
 */
export const goalCategoryEnum = pgEnum("goal_category", [
  "retirement",
  "education",
  "realestate",
  "emergency",
  "travel",
  "vehicle",
  "investment",
  "custom",
]);

/**
 * Goal status — tracks progress relative to plan
 * - on_track:  Progressing as expected
 * - ahead:     Ahead of schedule
 * - behind:    Falling short of the target pace
 * - completed: Target amount reached
 */
export const goalStatusEnum = pgEnum("goal_status", [
  "on_track",
  "ahead",
  "behind",
  "completed",
]);

/**
 * Goal priority — relative importance of the goal
 */
export const goalPriorityEnum = pgEnum("goal_priority", [
  "high",
  "medium",
  "low",
]);

// ============================================================================
// Benchmarks
// ============================================================================

/**
 * Benchmark category — the type of market reference point
 * - index:       Major market index (S&P 500, NASDAQ, Russell 2000)
 * - etf:         Exchange-traded fund used as benchmark
 * - mutual_fund: Mutual fund used as benchmark
 * - custom:      Custom or composite benchmark
 */
export const benchmarkCategoryEnum = pgEnum("benchmark_category", [
  "index",
  "etf",
  "mutual_fund",
  "custom",
]);

// ============================================================================
// Tax Deductions
// ============================================================================

/**
 * Tax deduction category — the type of tax-deductible expense
 */
export const taxDeductionCategoryEnum = pgEnum("tax_deduction_category", [
  "home_office",
  "vehicle",
  "travel",
  "equipment",
  "professional",
  "education",
  "healthcare",
  "meals",
  "utilities",
  "charitable",
  "retirement",
  "taxes",
  "other",
]);

/**
 * Tax deduction type — personal vs business deduction
 */
export const taxDeductionTypeEnum = pgEnum("tax_deduction_type", [
  "personal",
  "business",
]);

/**
 * Tax deduction status — tracking status of each deduction
 * - eligible:       Qualifies but not yet claimed
 * - pending_review: Submitted for advisor/CPA review
 * - claimed:        Filed on tax return
 * - ineligible:     Does not qualify
 */
export const taxDeductionStatusEnum = pgEnum("tax_deduction_status", [
  "eligible",
  "pending_review",
  "claimed",
  "ineligible",
]);

// ============================================================================
// Billing
// ============================================================================

/**
 * Billing record status — the payment lifecycle of an advisory fee invoice
 * - paid:     Invoice has been settled
 * - upcoming: Invoice generated but not yet due
 * - due:      Invoice is past its due date and awaiting payment
 */
export const billingStatusEnum = pgEnum("billing_status", [
  "paid",
  "upcoming",
  "due",
]);

// ============================================================================
// Insurance Policies
// ============================================================================

/**
 * Policy type — the category of insurance coverage
 */
export const policyTypeEnum = pgEnum("policy_type", [
  "home",
  "auto",
  "life",
  "umbrella",
  "liability",
  "health",
  "business",
  "property",
]);

/**
 * Policy status — current state of the insurance policy
 * - active:   Policy is in force
 * - expiring: Policy is approaching its expiration date
 * - expired:  Policy has lapsed
 * - pending:  Policy application is in progress
 */
export const policyStatusEnum = pgEnum("policy_status", [
  "active",
  "expiring",
  "expired",
  "pending",
]);

/**
 * Premium payment frequency
 */
export const premiumFrequencyEnum = pgEnum("premium_frequency", [
  "monthly",
  "quarterly",
  "annual",
]);

// ============================================================================
// Subscriptions (Stripe SaaS Billing)
// ============================================================================

/**
 * Subscription plan tier
 * - free: No active subscription (read-only after trial/cancel)
 * - starter: $499/mo — up to $25M AUM, 3 team members, 10GB storage
 * - professional: $1,499/mo — up to $100M AUM, 10 team members, 100GB storage
 * - enterprise: Custom pricing — unlimited everything
 */
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "starter",
  "growth",
  "professional",
  "elite",
  "enterprise",
]);

/**
 * Subscription lifecycle status
 * - trialing: 14-day free trial, full access
 * - active: Paid and current
 * - past_due: Payment failed, grace period
 * - cancelling: User cancelled, active until period end
 * - cancelled: Subscription ended, downgraded to free/read-only
 * - unpaid: Multiple payment failures, access restricted
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelling",
  "cancelled",
  "unpaid",
]);

// ============================================================================
// Pipeline / Deals
// ============================================================================

/**
 * Deal pipeline stage — tracks a deal through the investment lifecycle
 */
export const dealStageEnum = pgEnum("deal_stage", [
  "prospecting",
  "due_diligence",
  "negotiation",
  "closed",
  "active",
  "exit_planning",
]);

/**
 * Deal type — the asset class category of the deal
 */
export const dealTypeEnum = pgEnum("deal_type", [
  "real_estate",
  "private_equity",
  "venture_capital",
  "fixed_income",
]);

// ============================================================================
// Reports
// ============================================================================

/**
 * Report types for categorization
 */
export const reportTypeEnum = pgEnum("report_type", [
  "portfolio_summary",
  "asset_allocation",
  "performance",
  "tax_summary",
  "compliance",
  "client_statement",
  "custom",
]);

/**
 * Report status
 */
export const reportStatusEnum = pgEnum("report_status", [
  "draft",
  "published",
  "archived",
]);

// ============================================================================
// Integrations
// ============================================================================

/**
 * Integration connection status
 */
export const integrationStatusEnum = pgEnum("integration_status", [
  "connected",
  "disconnected",
  "error",
  "pending",
]);

/**
 * Known integration providers
 * - stripe:       Payment processing and billing (invoices, subscriptions)
 * - plaid:        Financial data aggregation (bank accounts, holdings, transactions)
 * - docusign:     Electronic signature service (send docs for signing)
 * - quickbooks:   Accounting software sync (invoices, chart of accounts)
 * - google_drive:    Cloud document storage (import/export documents)
 * - google_calendar: Google Calendar sync (pull/push events)
 * - dropbox:         Cloud document storage (import/export documents)
 * - salesforce:      Enterprise CRM (client data sync — enterprise only)
 * - other:           Catch-all for unlisted providers
 *
 * REMOVED: yodlee (redundant with Plaid), xero (US market uses QuickBooks),
 *          hubspot (replaced by Salesforce for enterprise CRM)
 */
export const integrationProviderEnum = pgEnum("integration_provider", [
  "stripe",
  "plaid",
  "docusign",
  "quickbooks",
  "google_drive",
  "google_calendar",
  "dropbox",
  "salesforce",
  "other",
]);

// ============================================================================
// Messages
// ============================================================================

/**
 * Conversation type — determines the kind of messaging thread
 * - client: Conversation with a client (visible in client portal)
 * - team:   Internal team conversation (advisors / assistants only)
 */
export const conversationTypeEnum = pgEnum("conversation_type", [
  "client",
  "team",
]);

/**
 * Message sender type — who sent the message
 * - advisor: Sent by an advisor/admin
 * - client:  Sent by a client
 * - team:    Sent by a team member in an internal thread
 */
export const messageSenderTypeEnum = pgEnum("message_sender_type", [
  "advisor",
  "client",
  "team",
]);

// ============================================================================
// Calendar Events
// ============================================================================

/**
 * Calendar event types
 * - meeting: Client or team meetings
 * - payment: Payment due dates
 * - dividend: Dividend payout dates
 * - deadline: Compliance or filing deadlines
 * - document: Document review/signing dates
 * - call: Scheduled phone calls
 */
export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "meeting",
  "payment",
  "dividend",
  "deadline",
  "document",
  "call",
]);

// ============================================================================
// Notifications
// ============================================================================

/**
 * Notification types for categorizing alerts
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_due",
  "document_uploaded",
  "document_expiring",
  "document_requested",
  "report_ready",
  "compliance_alert",
  "capital_call_due",
  "capital_call_overdue",
  "system",
]);

// ============================================================================
// Capital Events (PE/VC)
// ============================================================================

/**
 * Capital event type — the kind of PE/VC capital activity
 * - capital_call: GP requests LP to fund committed capital
 * - distribution: GP returns capital/profits to LP
 * - recallable: distribution that can be recalled by GP for re-investment
 */
export const capitalEventTypeEnum = pgEnum("capital_event_type", [
  "capital_call",
  "distribution",
  "recallable",
]);

/**
 * Capital event status — lifecycle of a capital call or distribution
 * - pending: event created, not yet settled
 * - paid: capital call has been funded by LP
 * - received: distribution has been received by LP
 * - overdue: past due_date and still pending (set by pg_cron)
 */
export const capitalEventStatusEnum = pgEnum("capital_event_status", [
  "pending",
  "paid",
  "received",
  "overdue",
]);

// ============================================================================
// Beneficiaries (Estate Planning)
// ============================================================================

/**
 * Beneficiary designation — whether the beneficiary is primary or contingent.
 * - primary: receives assets directly upon the account holder's passing
 * - contingent: receives assets only if all primary beneficiaries predecease
 */
export const beneficiaryDesignationEnum = pgEnum("beneficiary_designation", [
  "primary",
  "contingent",
]);

// ============================================================================
// Client Transfers (Fund Movements)
// ============================================================================

/**
 * Transfer type — the kind of fund movement the client initiated.
 * - deposit: funds into an investment account from an external bank
 * - withdrawal: funds out of an investment account to an external bank
 * - transfer: internal movement between two investment accounts
 */
export const transferTypeEnum = pgEnum("transfer_type", [
  "deposit",
  "withdrawal",
  "transfer",
]);

/**
 * Transfer status — lifecycle of a client-initiated fund transfer.
 * - pending: request created, awaiting advisor approval
 * - processing: approved and being executed by custodian
 * - completed: funds have settled in the destination account
 * - cancelled: request was cancelled before processing
 * - failed: processing error (e.g. insufficient funds, rejected by custodian)
 */
export const transferStatusEnum = pgEnum("transfer_status", [
  "pending",
  "processing",
  "completed",
  "cancelled",
  "failed",
]);

// ─── Expenses ────────────────────────────────────────────────────────────────

/**
 * expenseCategoryEnum — what type of expense this is.
 *
 * "renovation"        → construction, remodel, or structural work on a property
 * "maintenance"       → routine upkeep (HVAC, landscaping, plumbing)
 * "capital_improvement" → upgrades that increase property value or useful life
 * "property_tax"      → local property or land taxes
 * "insurance"         → property/casualty insurance premiums
 * "management_fee"    → property manager or fund management fees
 * "legal"             → attorney fees, title work, escrow costs
 * "financing"         → loan origination, refinance closing costs, points
 * "utilities"         → electricity, gas, water, internet
 * "professional_services" → accounting, consulting, appraisal
 * "marketing"         → listing fees, staging, photography
 * "other"             → anything that does not fit above
 */
export const expenseCategoryEnum = pgEnum("expense_category", [
  "renovation",
  "maintenance",
  "capital_improvement",
  "property_tax",
  "insurance",
  "management_fee",
  "legal",
  "financing",
  "utilities",
  "professional_services",
  "marketing",
  "other",
]);

/**
 * expenseStatusEnum — payment lifecycle state.
 *
 * "pending"   → approved but not yet paid
 * "paid"      → payment confirmed
 * "overdue"   → past due date with no payment
 * "disputed"  → under review or contested
 * "cancelled" → voided before payment
 */
export const expenseStatusEnum = pgEnum("expense_status", [
  "pending",
  "paid",
  "overdue",
  "disputed",
  "cancelled",
]);

// ─── Risk Profiles ───────────────────────────────────────────────────────────

/**
 * riskToleranceEnum — client's stated risk appetite.
 *
 * "conservative"    → capital preservation, minimal volatility
 * "moderate"        → balanced growth and protection
 * "aggressive"      → maximum growth, accepts high drawdowns
 * "speculative"     → concentrated bets, illiquid positions, high risk
 */
export const riskToleranceEnum = pgEnum("risk_tolerance", [
  "conservative",
  "moderate",
  "aggressive",
  "speculative",
]);

/**
 * riskAlertStatusEnum — current breach status of a risk limit.
 *
 * "normal"   → all metrics within defined limits
 * "watch"    → approaching a threshold (e.g. 80% of drawdown limit)
 * "breach"   → limit has been crossed — requires action
 * "resolved" → breach acknowledged and addressed
 */
export const riskAlertStatusEnum = pgEnum("risk_alert_status", [
  "normal",
  "watch",
  "breach",
  "resolved",
]);

// ─── KYC / AML ───────────────────────────────────────────────────────────────

/**
 * kycStatusEnum — overall KYC verification lifecycle.
 *
 * "not_started"   → no KYC process initiated yet
 * "in_progress"   → documents requested or under review
 * "approved"      → identity verified, client may transact
 * "rejected"      → verification failed — client cannot transact
 * "expired"       → review period lapsed, renewal required
 * "suspended"     → temporarily blocked pending investigation
 */
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_started",
  "in_progress",
  "approved",
  "rejected",
  "expired",
  "suspended",
]);

/**
 * kycTierEnum — depth of due diligence performed.
 *
 * "standard"  → CDD (Customer Due Diligence) — standard clients
 * "enhanced"  → EDD (Enhanced Due Diligence) — PEPs, high-risk, large accounts
 */
export const kycTierEnum = pgEnum("kyc_tier", ["standard", "enhanced"]);

/**
 * amlStatusEnum — Anti-Money Laundering screening result.
 *
 * "not_screened"   → client has not been run through AML checks
 * "clear"          → no matches on sanctions, PEP, or adverse media lists
 * "review"         → potential match found — requires manual review
 * "flagged"        → confirmed match — escalation required
 */
export const amlStatusEnum = pgEnum("aml_status", [
  "not_screened",
  "clear",
  "review",
  "flagged",
]);
