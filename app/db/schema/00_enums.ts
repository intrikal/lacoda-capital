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
 * Document request status
 * - open: Request is active, awaiting upload
 * - fulfilled: Document has been provided
 * - cancelled: Request was cancelled
 * - overdue: Past due date, not yet fulfilled
 */
export const documentRequestStatusEnum = pgEnum("document_request_status", [
  "open",
  "fulfilled",
  "cancelled",
  "overdue",
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
 * - needs_attention: No approved evidence exists (default state for new controls)
 * - in_progress: Evidence has been submitted and is pending review
 * - compliant: At least one approved, non-expired evidence record exists
 */
export const complianceControlStatusEnum = pgEnum("compliance_control_status", [
  "needs_attention",
  "in_progress",
  "compliant",
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
 */
export const integrationProviderEnum = pgEnum("integration_provider", [
  "plaid",
  "yodlee",
  "quickbooks",
  "xero",
  "salesforce",
  "hubspot",
  "google_drive",
  "dropbox",
  "docusign",
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
  "system",
]);
