/**
 * ============================================================================
 * IMPORTS EXPLAINED
 * ============================================================================
 *
 * Kevin, imports bring in code from other files so we can use it here.
 * Let's explain each one:
 */

/**
 * import { relations } from "drizzle-orm"
 *
 * WHAT: Imports the "relations" function from the Drizzle ORM library.
 * WHY:  We use this to define HOW tables connect to each other.
 *       For example, "a compliance control has many evidence records."
 *       Without relations, we could store data but couldn't easily query
 *       "give me a control AND all its evidence" in one go.
 * WHERE: "drizzle-orm" is a package we installed via npm (it's in node_modules).
 *
 * See orgs.ts for full explanation of relations.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, boolean, index, unique }
 *   from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each import is a tool for creating different parts of a table.
 * WHERE: "drizzle-orm/pg-core" is the PostgreSQL-specific part of Drizzle.
 *        The "/pg-core" means "PostgreSQL core functions".
 *
 * Let's break down each one:
 *
 * pgTable   = Function to create a new database table.
 *             Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *             See orgs.ts for full explanation.
 *
 * uuid      = Column type for UUIDs (Universally Unique Identifier).
 *             A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *             It's a random 36-character string that's practically impossible to guess.
 *             See orgs.ts for full explanation.
 *
 * text      = Column type for text/strings (like "KYC-001" or "Client Identity Verification").
 *             Can hold any length of text.
 *             See orgs.ts for full explanation.
 *
 * timestamp = Column type for dates and times (like "2024-01-15 10:30:00").
 *             We use { withTimezone: true } to track the timezone too.
 *             See orgs.ts for full explanation.
 *
 * jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format).
 *             Allows storing flexible, structured data like:
 *             { "regulatorySource": "SEC", "riskLevel": "high" }
 *             The "b" in jsonb means "binary" - it's stored efficiently.
 *             See orgs.ts for full explanation.
 *
 * boolean   = Column type for TRUE or FALSE values.
 *             ┌─────────────────────────────────────────────────────────────┐
 *             │ WHAT IS A BOOLEAN?                                          │
 *             │                                                             │
 *             │ A boolean can only be one of two values: TRUE or FALSE.     │
 *             │                                                             │
 *             │ Think of it like a light switch:                            │
 *             │   - ON  = true  (the control is active)                     │
 *             │   - OFF = false (the control is disabled)                   │
 *             │                                                             │
 *             │ In our database, we use it for the is_active column:        │
 *             │   - true  → this compliance control is enforced             │
 *             │   - false → this control is disabled (soft-deleted)         │
 *             │                                                             │
 *             │ WHY NOT JUST DELETE THE ROW?                                │
 *             │   Because we might need to re-enable it later, or keep it   │
 *             │   for historical records. Setting is_active = false lets    │
 *             │   us "turn off" a control without losing its data.          │
 *             └─────────────────────────────────────────────────────────────┘
 *
 * index     = Function to create database indexes (makes searches faster).
 *             Like the index at the back of a book - helps you find things quickly.
 *             See orgs.ts for full explanation.
 *
 * unique    = Function to create a UNIQUE CONSTRAINT across multiple columns.
 *             ┌─────────────────────────────────────────────────────────────┐
 *             │ WHAT IS unique()?                                           │
 *             │                                                             │
 *             │ You've already seen .unique() on a single column in         │
 *             │ orgs.ts (the slug column). That ensures no two orgs have    │
 *             │ the same slug.                                              │
 *             │                                                             │
 *             │ But unique() (the FUNCTION, imported separately) lets us    │
 *             │ create a COMPOSITE unique constraint - meaning the          │
 *             │ COMBINATION of two or more columns must be unique.          │
 *             │                                                             │
 *             │ We'll use it below to ensure:                               │
 *             │   unique().on(org_id, code)                                 │
 *             │                                                             │
 *             │ This means "within a single org, each code must be unique." │
 *             │ Two DIFFERENT orgs CAN have code "KYC-001".                 │
 *             │ The SAME org CANNOT have two controls with code "KYC-001".  │
 *             │                                                             │
 *             │ See the composite unique section below for a full example.  │
 *             └─────────────────────────────────────────────────────────────┘
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { complianceControlStatusEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition from the orgs.ts file.
 * WHY:  We need to reference orgs.id to create a Foreign Key relationship.
 *       Every compliance control belongs to an org (multi-tenant isolation).
 * WHERE: "./" means "same directory", so this imports from app/db/schema/orgs.ts
 *
 * See clients.ts for full explanation of importing table references.
 */
import { orgs } from "./orgs";

/**
 * import { documents } from "./documents"
 *
 * WHAT: Imports the documents table definition from documents.ts.
 * WHY:  Compliance evidence links a document to a control as "proof".
 *       We need the documents table to create that Foreign Key relationship.
 * WHERE: Same directory - app/db/schema/documents.ts
 */
import { documents } from "./documents";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition from users.ts.
 * WHY:  Compliance evidence tracks WHO reviewed/approved the evidence.
 *       The reviewed_by column references users.id so we know which
 *       user approved or rejected a piece of evidence.
 * WHERE: Same directory - app/db/schema/users.ts
 */
import { users } from "./users";

/**
 * ============================================================================
 * COMPLIANCE CONTROLS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the first of TWO compliance tables. Together they form a
 * RULES vs PROOF pattern:
 *
 *   ┌──────────────────────────────┐          ┌──────────────────────────────┐
 *   │ COMPLIANCE CONTROLS          │          │ COMPLIANCE EVIDENCE          │
 *   │ (the RULES)                  │          │ (the PROOF)                  │
 *   │                              │          │                              │
 *   │ "What MUST be done"          │          │ "Proof it WAS done"          │
 *   │                              │          │                              │
 *   │ Examples:                    │          │ Examples:                    │
 *   │ - KYC-001: Verify identity   │ ───────< │ - John's passport.pdf       │
 *   │ - AML-002: Source of funds   │          │ - Jane's bank statement.pdf  │
 *   │ - TAX-001: Annual tax return │          │ - Smith LLC tax return 2024  │
 *   └──────────────────────────────┘          └──────────────────────────────┘
 *
 * This table (compliance_controls) stores the RULES - the checklist of things
 * that must be satisfied. Think of it as a compliance officer writing down:
 *   "Every client must provide proof of identity."
 *   "Every client must provide source-of-funds documentation."
 *   "Every client must submit an annual tax return."
 *
 * The second table (compliance_evidence, defined further below) stores the
 * PROOF - it links a specific document to a specific rule for a specific client.
 *
 * Design decisions:
 * - org_id: Each org can have different compliance requirements
 * - code: Short identifier (e.g., "KYC-001", "AML-002")
 * - name/description: Human-readable explanation
 * - is_active: Soft-disable controls without deleting
 * - frequency: How often evidence needs to be refreshed
 *
 * Examples:
 * - "KYC-001: Client Identity Verification"
 * - "AML-002: Source of Funds Documentation"
 * - "TAX-001: Annual Tax Return Collection"
 */

/**
 * export const complianceControls = pgTable(...)
 *
 * BREAKDOWN:
 *   export             = Makes this available for other files to import
 *   const              = Declares a constant (value that won't change)
 *   complianceControls = The name we're giving this table in our TypeScript code
 *   pgTable            = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "compliance_controls" = The actual table name in the database
 *   2. { columns }           = An object defining all the columns
 *   3. (table) => []         = A function that returns an array of indexes
 *                               and unique constraints
 *
 * See orgs.ts for full explanation of pgTable.
 */
export const complianceControls = pgTable(
  "compliance_controls", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The PRIMARY KEY for the compliance_controls table.                  │
     * │                                                                     │
     * │ id:                                                                 │
     * │   TypeScript property name. In code: complianceControls.id          │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "550e8400-e29b-41d4-a716-446655440000"             │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each row. No two controls    │
     * │   can have the same id. Every row MUST have one.                    │
     * │   See orgs.ts for full explanation of Primary Keys.                 │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID if you don't provide one.   │
     * │   So when inserting a new control, you don't have to create the ID. │
     * │   See orgs.ts for full explanation of defaultRandom.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull()                                     │
     * │   .references(() => orgs.id, { onDelete: "cascade" })               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) linking each control to an organization. │
     * │                                                                     │
     * │ orgId:                                                              │
     * │   TypeScript property name. In code: complianceControls.orgId       │
     * │   Note: camelCase in TypeScript, but snake_case ("org_id") in the   │
     * │   database. Drizzle handles the conversion.                         │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" in the database. It stores a UUID │
     * │   that must match an id in the orgs table.                          │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every compliance control MUST belong to an org. You cannot create  │
     * │   a "floating" control that doesn't belong to anyone.               │
     * │   See clients.ts for full explanation of notNull.                   │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   FOREIGN KEY: This column's value MUST exist in orgs.id.           │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     orgs table               compliance_controls table              │
     * │     ┌────────────┐           ┌──────────────────────┐               │
     * │     │ id (PK)    │◄──────────│ org_id (FK)          │               │
     * │     │ "abc-123"  │           │ "abc-123"            │               │
     * │     │ "def-456"  │           │ code: "KYC-001"      │               │
     * │     └────────────┘           │ name: "Verify ID"    │               │
     * │                              └──────────────────────┘               │
     * │                                                                     │
     * │   { onDelete: "cascade" }                                           │
     * │     If the org is deleted, ALL its compliance controls are deleted   │
     * │     too. Like deleting a folder deletes all files inside.            │
     * │     See clients.ts for full explanation of onDelete options.         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Org scope
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ code: text("code").notNull()                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A short, human-readable identifier for this compliance control.     │
     * │                                                                     │
     * │ code:                                                               │
     * │   TypeScript property name. In code: complianceControls.code        │
     * │                                                                     │
     * │ text("code")                                                        │
     * │   Creates a text column named "code" in the database.               │
     * │   Example values: "KYC-001", "AML-002", "TAX-001"                   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every control MUST have a code. It's the short reference that     │
     * │   compliance officers use in conversation:                          │
     * │   "Did we get KYC-001 for the new client?"                          │
     * │                                                                     │
     * │ NOTE: This column participates in a COMPOSITE UNIQUE constraint     │
     * │ with org_id (defined in the indexes section below). This means:     │
     * │   - Org A can have "KYC-001" AND Org B can also have "KYC-001"     │
     * │   - But Org A CANNOT have two controls both called "KYC-001"        │
     * │   See the unique constraint explanation in the indexes section.      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Control identification
    code: text("code").notNull(), // e.g., "KYC-001"

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ name: text("name").notNull()                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The full human-readable name of this compliance control.            │
     * │                                                                     │
     * │ text("name")                                                        │
     * │   Creates a text column named "name" in the database.               │
     * │   Example values:                                                   │
     * │     "Client Identity Verification"                                  │
     * │     "Source of Funds Documentation"                                  │
     * │     "Annual Tax Return Collection"                                   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every control MUST have a name. While "code" is the short         │
     * │   reference (KYC-001), "name" is the full descriptive title.        │
     * │   Used in the UI for display: "KYC-001: Client Identity Verification"│
     * └─────────────────────────────────────────────────────────────────────┘
     */
    name: text("name").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ description: text("description")                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ An optional longer explanation of what this control requires.        │
     * │                                                                     │
     * │ text("description")                                                 │
     * │   Creates a text column named "description" in the database.        │
     * │   Example: "Client must provide a valid government-issued photo     │
     * │   ID such as a passport or driver's license. The document must      │
     * │   not be expired."                                                  │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The value CAN be empty (null)                                   │
     * │   - Description is optional - some controls may be self-explanatory │
     * │     from their name alone                                           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    description: text("description"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ framework: text("framework")                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The compliance framework this control belongs to.             │
     * │ WHY:  Different organizations follow different compliance standards. │
     * │       SOC 2, ISO 27001, PCI-DSS, NIST, or custom internal policies. │
     * │       Grouping by framework lets the UI show "SOC 2 Controls" vs    │
     * │       "Internal Controls" separately.                               │
     * │                                                                     │
     * │ Examples: "SOC2", "ISO27001", "PCI-DSS", "NIST", "INTERNAL"       │
     * │                                                                     │
     * │ NULLABLE — not all controls map to a formal framework.              │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    framework: text("framework"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assigneeId: uuid("assignee_id")                                     │
     * │   .references(() => users.id, { onDelete: "set null" })             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The user responsible for ensuring this control is met.        │
     * │ WHY:  Every compliance control should have an accountable owner.    │
     * │       When the dashboard shows "KYC-001: Not Started", someone      │
     * │       specific needs to be responsible for fixing it.               │
     * │                                                                     │
     * │ NULLABLE — new controls may be unassigned initially.                │
     * │ onDelete: "set null" — if the assignee leaves, the control stays   │
     * │ but needs to be reassigned.                                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ dueDate: date("due_date")                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The deadline by which this control must be implemented.        │
     * │ WHY:  Compliance deadlines are real — "SOC 2 audit is April 30"     │
     * │       or "PCI-DSS remediation due by Q3." The system uses this to   │
     * │       flag overdue controls and prioritize work.                     │
     * │                                                                     │
     * │ date("due_date") — stores date only (no time component).            │
     * │ NULLABLE — not all controls have hard deadlines.                     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    dueDate: date("due_date"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ category: text("category")                                          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ An optional grouping label for organizing controls by type.         │
     * │                                                                     │
     * │ text("category")                                                    │
     * │   Creates a text column named "category" in the database.           │
     * │   Example values: "KYC", "AML", "TAX", "REGULATORY"                │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The value CAN be empty (null)                                   │
     * │   - Category is optional for flexibility                            │
     * │                                                                     │
     * │ WHY HAVE CATEGORIES?                                                │
     * │   So the UI can group controls together:                            │
     * │   ┌──────────────────────────────┐                                  │
     * │   │ KYC Controls                 │                                  │
     * │   │  - KYC-001: Verify Identity  │                                  │
     * │   │  - KYC-002: Proof of Address │                                  │
     * │   │ AML Controls                 │                                  │
     * │   │  - AML-001: Source of Funds  │                                  │
     * │   │  - AML-002: PEP Screening    │                                  │
     * │   └──────────────────────────────┘                                  │
     * │                                                                     │
     * │ There's an index on (org_id, category) below to make these          │
     * │ "show me all KYC controls for this org" queries fast.               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    category: text("category"), // e.g., "KYC", "AML", "TAX", "REGULATORY"

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ isActive: boolean("is_active").notNull().default(true)              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Whether this compliance control is currently enforced.              │
     * │                                                                     │
     * │ isActive:                                                           │
     * │   TypeScript property name. In code: complianceControls.isActive    │
     * │                                                                     │
     * │ boolean("is_active")                                                │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ BOOLEAN COLUMN EXPLAINED:                                   │   │
     * │   │                                                             │   │
     * │   │ A boolean stores only TRUE or FALSE. That's it.             │   │
     * │   │ Think of it as a light switch: ON (true) or OFF (false).    │   │
     * │   │                                                             │   │
     * │   │ In PostgreSQL, the column stores:                           │   │
     * │   │   true  → the control IS active (being enforced)            │   │
     * │   │   false → the control is NOT active (disabled)              │   │
     * │   │                                                             │   │
     * │   │ In queries:                                                 │   │
     * │   │   SELECT * FROM compliance_controls WHERE is_active = true  │   │
     * │   │   → "Give me only the controls that are currently enforced" │   │
     * │   │                                                             │   │
     * │   │ This is also called a "SOFT DELETE" pattern:                 │   │
     * │   │   Instead of deleting a control (losing its data forever),  │   │
     * │   │   we set is_active = false to "turn it off".                │   │
     * │   │   We can always set it back to true to re-enable it.        │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every control MUST have an active/inactive status.                │
     * │   We can't leave it undefined - the system needs to know whether    │
     * │   to enforce this control or not.                                   │
     * │                                                                     │
     * │ .default(true)                                                      │
     * │   New controls are ACTIVE by default. When a compliance officer     │
     * │   creates a new rule, it should be enforced immediately unless they │
     * │   explicitly disable it.                                            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Active/inactive toggle — soft-deactivation without deleting the control
    isActive: boolean("is_active").notNull().default(true),

    /**
     * Compliance status — the current state of this control.
     *
     * Updated manually by advisors or automatically when evidence is reviewed.
     *
     * Lifecycle:
     *   not_started  → (work begins)            → in_progress
     *   in_progress  → (control implemented)     → implemented
     *   implemented  → (independently verified)  → verified
     *   verified     → (evidence expired)        → not_started
     *
     * Default: "not_started" — every new control starts with no work done.
     */
    status: complianceControlStatusEnum("status").notNull().default("not_started"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ frequency: text("frequency")                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ How often evidence for this control needs to be refreshed.          │
     * │                                                                     │
     * │ text("frequency")                                                   │
     * │   Creates a text column named "frequency" in the database.          │
     * │   Example values: "once", "annually", "quarterly", "monthly"        │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - Some controls might not have a set frequency                    │
     * │   - null could mean "one-time only" or "as needed"                  │
     * │                                                                     │
     * │ WHY IS THIS IMPORTANT?                                              │
     * │   Compliance is not a one-time thing. Many regulations require      │
     * │   periodic re-verification:                                         │
     * │     - "once"      → Collect identity docs when client onboards      │
     * │     - "annually"  → Collect tax returns every year                  │
     * │     - "quarterly" → Review transaction reports every 3 months       │
     * │                                                                     │
     * │   The system can use this value combined with valid_until in the    │
     * │   evidence table to flag when evidence has expired and needs        │
     * │   to be re-collected.                                               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Requirements
    frequency: text("frequency"), // 'once', 'annually', 'quarterly', etc.

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ requiredDocumentTypes: jsonb("required_document_types")              │
     * │   .$type<string[]>().default([])                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A list of document types that satisfy this compliance control.       │
     * │                                                                     │
     * │ jsonb("required_document_types")                                    │
     * │   Creates a JSONB column named "required_document_types".            │
     * │   JSONB stores structured data - in this case, an array of strings. │
     * │   See orgs.ts for full explanation of JSONB.                        │
     * │                                                                     │
     * │ .$type<string[]>()                                                  │
     * │   Tells TypeScript this column holds an ARRAY of strings.           │
     * │   string[] means "a list of text values".                           │
     * │   Example value: ["passport", "drivers_license", "national_id"]     │
     * │                                                                     │
     * │   This gives us type safety:                                        │
     * │     control.requiredDocumentTypes  // TypeScript knows it's string[] │
     * │     control.requiredDocumentTypes[0]  // TypeScript knows it's string│
     * │                                                                     │
     * │ .default([])                                                        │
     * │   If no value is provided, use an empty array [].                   │
     * │   New controls start with no required document types, and they can  │
     * │   be specified later.                                               │
     * │                                                                     │
     * │ WHY USE THIS?                                                       │
     * │   A compliance officer can specify what kinds of documents satisfy   │
     * │   a control. For "KYC-001: Verify Identity", the acceptable types   │
     * │   might be: ["passport", "drivers_license", "national_id"].         │
     * │   The system can then check if a client has uploaded any of these.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    requiredDocumentTypes: jsonb("required_document_types")
      .$type<string[]>()
      .default([]),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ metadata: jsonb("metadata")                                         │
     * │   .$type<ComplianceControlMetadata>().default({})                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Flexible structured data for additional control information.         │
     * │                                                                     │
     * │ jsonb("metadata")                                                   │
     * │   Creates a JSONB column named "metadata".                          │
     * │   See orgs.ts for full explanation of JSONB.                        │
     * │                                                                     │
     * │ .$type<ComplianceControlMetadata>()                                 │
     * │   Tells TypeScript what shape the JSON should have.                 │
     * │   ComplianceControlMetadata is defined below - it's a TypeScript    │
     * │   interface that specifies fields like regulatorySource, riskLevel, │
     * │   automatedCheck, etc.                                              │
     * │   See clients.ts for full explanation of .$type<>.                  │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no metadata is provided, use an empty object {}.               │
     * │   Controls can start with no metadata and have it filled in later.  │
     * │                                                                     │
     * │ WHY USE JSONB FOR THIS INSTEAD OF SEPARATE COLUMNS?                 │
     * │   Metadata varies widely between controls. One control might need   │
     * │   a regulatory source, another might need an escalation path.       │
     * │   JSONB lets us store all of these without adding a column for      │
     * │   every possible metadata field.                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Additional metadata
    metadata: jsonb("metadata").$type<ComplianceControlMetadata>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })           │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this compliance control was first created.                      │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Stores date + time + timezone.                                    │
     * │   Example: "2024-01-15T10:30:00+05:00"                              │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every control must have a creation timestamp.                     │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   Automatically set to the current time when the row is inserted.   │
     * │                                                                     │
     * │ See orgs.ts for full explanation of timestamp, notNull, defaultNow. │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Standard timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })           │
     * │   .notNull().defaultNow().$onUpdate(() => new Date())               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this compliance control was last modified.                      │
     * │                                                                     │
     * │ Same as createdAt, plus:                                            │
     * │                                                                     │
     * │ .$onUpdate(() => new Date())                                        │
     * │   Automatically updates this timestamp whenever the row is changed. │
     * │   Example: If a compliance officer renames the control at 5:00 PM,  │
     * │   updated_at automatically becomes 5:00 PM while created_at stays   │
     * │   at the original time.                                             │
     * │                                                                     │
     * │ See orgs.ts for full explanation of $onUpdate.                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    /**
     * SOFT DELETE — see documents.ts deletedAt for full explanation.
     * NULL = active row. NOT NULL = "deleted" at that timestamp.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },

  // ==================== INDEXES & CONSTRAINTS ====================
  /**
   * (table) => [...]
   *
   * This function receives the table and returns an array of INDEXES
   * and UNIQUE CONSTRAINTS. See orgs.ts for full explanation of indexes.
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ unique("compliance_controls_org_code_unique")                       │
     * │   .on(table.orgId, table.code)                                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE UNIQUE CONSTRAINT EXPLAINED:                              │
     * │                                                                     │
     * │ This ensures the COMBINATION of (org_id + code) is unique.          │
     * │ In plain English: "Within a single org, each control code must be   │
     * │ unique. But different orgs can reuse the same codes."               │
     * │                                                                     │
     * │ EXAMPLE - THIS IS ALLOWED:                                          │
     * │   Org A: code = "KYC-001"  (Org A's version of KYC-001)            │
     * │   Org B: code = "KYC-001"  (Org B's version of KYC-001)            │
     * │   → Different orgs, so the COMBINATION is different:                │
     * │     ("org-A-id", "KYC-001") vs ("org-B-id", "KYC-001")             │
     * │                                                                     │
     * │ EXAMPLE - THIS IS BLOCKED:                                          │
     * │   Org A: code = "KYC-001"                                           │
     * │   Org A: code = "KYC-001"  ← DUPLICATE!                            │
     * │   → Same org + same code = DATABASE ERROR:                          │
     * │     "duplicate key violates unique constraint"                      │
     * │                                                                     │
     * │ WHY DO WE NEED THIS?                                                │
     * │   Codes are how compliance officers identify controls:              │
     * │   "Did we get KYC-001 for the client?" If two controls in the       │
     * │   same org had the same code, nobody would know which one you mean. │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   ┌──────────┬──────────┬────────────────────────┐                  │
     * │   │ org_id   │ code     │ name                   │ ALLOWED?         │
     * │   ├──────────┼──────────┼────────────────────────┤                  │
     * │   │ Org-A    │ KYC-001  │ Verify Identity        │ YES              │
     * │   │ Org-A    │ KYC-002  │ Proof of Address       │ YES (diff code)  │
     * │   │ Org-B    │ KYC-001  │ ID Check               │ YES (diff org)   │
     * │   │ Org-A    │ KYC-001  │ Another ID Check       │ NO! Duplicate!   │
     * │   └──────────┴──────────┴────────────────────────┘                  │
     * │                                                                     │
     * │ HOW IS THIS DIFFERENT FROM .unique() ON A SINGLE COLUMN?            │
     * │   .unique() on code alone would mean NO two controls anywhere       │
     * │   could share a code - even in different orgs. That's too strict.   │
     * │   A composite unique on (org_id, code) scopes the uniqueness        │
     * │   to within each org.                                               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Unique code per org
    unique("compliance_controls_org_code_unique").on(table.orgId, table.code),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_controls_org_id_idx").on(table.orgId)             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the org_id column.                              │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me ALL compliance controls for this org."                   │
     * │   SELECT * FROM compliance_controls WHERE org_id = 'abc-123'        │
     * │                                                                     │
     * │ WHY: Every query in a multi-tenant app filters by org_id first      │
     * │ (to ensure tenants only see their own data). This index makes       │
     * │ that filter instant instead of scanning every row.                   │
     * │                                                                     │
     * │ NAMING: compliance_controls_org_id_idx follows the convention       │
     * │ tablename_columnname_idx.                                           │
     * │ See orgs.ts for full explanation of indexes.                        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Org-scoped queries
    index("compliance_controls_org_id_idx").on(table.orgId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_controls_org_category_idx")                       │
     * │   .on(table.orgId, table.category)                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on org_id AND category.                           │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me all KYC controls for this org."                          │
     * │   SELECT * FROM compliance_controls                                 │
     * │     WHERE org_id = 'abc-123' AND category = 'KYC'                   │
     * │                                                                     │
     * │ WHY: The compliance dashboard often groups controls by category.    │
     * │ A composite index on (org_id, category) means the database can      │
     * │ quickly find all controls for an org AND filter by category at       │
     * │ the same time, rather than finding all org controls first and        │
     * │ then filtering.                                                     │
     * │                                                                     │
     * │ See clients.ts for full explanation of composite indexes.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Filter by category
    index("compliance_controls_org_category_idx").on(
      table.orgId,
      table.category
    ),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_controls_org_active_idx")                         │
     * │   .on(table.orgId, table.isActive)                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on org_id AND is_active.                          │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me only the ACTIVE controls for this org."                  │
     * │   SELECT * FROM compliance_controls                                 │
     * │     WHERE org_id = 'abc-123' AND is_active = true                   │
     * │                                                                     │
     * │ WHY: The most common query is "show me what's currently enforced."  │
     * │ Almost every compliance page will filter to active controls only.    │
     * │ This index makes that query fast.                                   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Active controls only
    index("compliance_controls_org_active_idx").on(table.orgId, table.isActive),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ComplianceControlMetadata interface
 *
 * This defines the SHAPE of the JSON stored in the "metadata" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 * A control might have regulatorySource but not riskLevel, or vice versa.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ FIELD-BY-FIELD EXPLANATION:                                         │
 * │                                                                     │
 * │ regulatorySource?: string                                           │
 * │   Which regulatory body requires this control.                      │
 * │   Example values: "SEC", "FINRA", "State", "IRS"                    │
 * │   Helps compliance officers know WHERE a rule comes from.           │
 * │                                                                     │
 * │ riskLevel?: "low" | "medium" | "high" | "critical"                  │
 * │   How important this control is. The | means "OR" - the value       │
 * │   must be one of these four options (a TypeScript "union type").     │
 * │   Used to prioritize which controls to address first.               │
 * │   Example: "critical" for anti-money-laundering, "low" for          │
 * │   optional internal documentation.                                  │
 * │                                                                     │
 * │ automatedCheck?: boolean                                            │
 * │   Whether this control can be verified automatically by the system  │
 * │   (true) or requires manual review by a human (false).              │
 * │   Example: Checking if a document was uploaded = automated.         │
 * │   Reviewing if the document content is valid = manual.              │
 * │                                                                     │
 * │ escalationPath?: string[]                                           │
 * │   A list of people/roles to notify if this control is not met.      │
 * │   string[] means "an array of strings".                             │
 * │   Example: ["compliance_officer", "manager", "ceo"]                 │
 * │   First notify the compliance officer, then escalate to manager,    │
 * │   then to CEO if still unresolved.                                  │
 * │                                                                     │
 * │ notes?: string                                                      │
 * │   Free-text field for any additional information.                   │
 * │   Example: "This control was added after the 2024 SEC audit."       │
 * └─────────────────────────────────────────────────────────────────────┘
 */
// Type-safe metadata
export interface ComplianceControlMetadata {
  regulatorySource?: string; // "SEC", "FINRA", "State", etc.
  riskLevel?: "low" | "medium" | "high" | "critical";
  automatedCheck?: boolean;
  escalationPath?: string[];
  notes?: string;
}

/**
 * ============================================================================
 * COMPLIANCE EVIDENCE TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the SECOND of the two compliance tables - the PROOF side.
 *
 * Remember the pattern:
 *   Controls = "What must be done" (the checklist / the RULES)
 *   Evidence = "Proof it was done" (links a document to a control / the PROOF)
 *
 * This table is a JUNCTION TABLE (also called a "join table" or "bridge table").
 * It sits BETWEEN two other tables and connects them:
 *
 *   ┌──────────────────────┐      ┌───────────────────┐      ┌────────────┐
 *   │ ComplianceControls   │      │ ComplianceEvidence │      │ Documents  │
 *   │ (the rule)           │──<──│ (the link/proof)   │──>──│ (the file) │
 *   │ "KYC-001: Verify ID" │      │ status: "approved" │      │ passport   │
 *   └──────────────────────┘      └───────────────────┘      └────────────┘
 *
 * But it's more than just a link - it also carries EXTRA DATA:
 *   - status: Is this evidence pending, approved, rejected, or expired?
 *   - validFrom / validUntil: When is this evidence valid?
 *   - reviewedBy / reviewedAt: Who approved it and when?
 *   - reviewNotes: Comments from the reviewer
 *
 * REAL-WORLD EXAMPLE:
 *   Control: "KYC-001: Client must provide government-issued photo ID"
 *   Evidence: {
 *     controlId: → points to KYC-001
 *     documentId: → points to "john_passport.pdf"
 *     clientId: → points to John Smith
 *     status: "approved"
 *     validFrom: "2024-01-15"
 *     validUntil: "2025-01-15"  (passport evidence expires in 1 year)
 *     reviewedBy: → points to Alice (the compliance officer)
 *     reviewedAt: "2024-01-16"
 *     reviewNotes: "Valid US passport, expires 2030"
 *   }
 */

/**
 * export const complianceEvidence = pgTable(...)
 *
 * BREAKDOWN:
 *   export             = Makes this available for other files to import
 *   const              = Declares a constant (value that won't change)
 *   complianceEvidence = The name we're giving this table in our TypeScript code
 *   pgTable            = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "compliance_evidence" = The actual table name in the database
 *   2. { columns }           = An object defining all the columns
 *   3. (table) => []         = A function that returns an array of indexes
 *
 * See orgs.ts for full explanation of pgTable.
 */
export const complianceEvidence = pgTable(
  "compliance_evidence", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The PRIMARY KEY for the compliance_evidence table.                  │
     * │                                                                     │
     * │ id:                                                                 │
     * │   TypeScript property name. In code: complianceEvidence.id          │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" with type UUID.                       │
     * │   Example value: "7f3b8c2a-e29b-41d4-a716-446655440000"             │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   THE unique identifier for each evidence row.                      │
     * │   See orgs.ts for full explanation of Primary Keys.                 │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Auto-generates a random UUID when inserting.                      │
     * │   See orgs.ts for full explanation of defaultRandom.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ controlId: uuid("control_id").notNull()                             │
     * │   .references(() => complianceControls.id, { onDelete: "cascade" }) │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY linking this evidence to the compliance CONTROL (rule)  │
     * │ it satisfies.                                                       │
     * │                                                                     │
     * │ controlId:                                                          │
     * │   TypeScript property name. In code: complianceEvidence.controlId   │
     * │                                                                     │
     * │ uuid("control_id")                                                  │
     * │   Creates a column named "control_id" storing a UUID that must      │
     * │   match an id in the compliance_controls table.                     │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every piece of evidence MUST link to a control. Evidence without  │
     * │   a rule it satisfies is meaningless.                               │
     * │                                                                     │
     * │ .references(() => complianceControls.id, { onDelete: "cascade" })   │
     * │   FOREIGN KEY: control_id MUST exist in complianceControls.id.      │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     compliance_controls         compliance_evidence                 │
     * │     ┌────────────────┐          ┌──────────────────────┐            │
     * │     │ id (PK)        │◄─────────│ control_id (FK)      │            │
     * │     │ "ctrl-001"     │          │ "ctrl-001"           │            │
     * │     │ code: KYC-001  │          │ status: "approved"   │            │
     * │     └────────────────┘          └──────────────────────┘            │
     * │                                                                     │
     * │   { onDelete: "cascade" }                                           │
     * │     If a control is deleted, ALL its evidence records are deleted    │
     * │     too. If the rule no longer exists, the proof of satisfying       │
     * │     that rule is no longer relevant.                                 │
     * │     See clients.ts for full explanation of onDelete options.         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Links
    controlId: uuid("control_id")
      .notNull()
      .references(() => complianceControls.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ documentId: uuid("document_id").notNull()                           │
     * │   .references(() => documents.id, { onDelete: "cascade" })          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY linking this evidence to the DOCUMENT (file) used as    │
     * │ proof.                                                              │
     * │                                                                     │
     * │ documentId:                                                         │
     * │   TypeScript property name. In code: complianceEvidence.documentId  │
     * │                                                                     │
     * │ uuid("document_id")                                                 │
     * │   Creates a column named "document_id" storing a UUID that must     │
     * │   match an id in the documents table.                               │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every piece of evidence MUST link to a document. Evidence without │
     * │   a document is just a claim with no proof.                         │
     * │                                                                     │
     * │ .references(() => documents.id, { onDelete: "cascade" })            │
     * │   FOREIGN KEY: document_id MUST exist in documents.id.              │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     documents table             compliance_evidence                 │
     * │     ┌────────────────┐          ┌──────────────────────┐            │
     * │     │ id (PK)        │◄─────────│ document_id (FK)     │            │
     * │     │ "doc-789"      │          │ "doc-789"            │            │
     * │     │ name: passport  │          │ control_id: ...      │            │
     * │     └────────────────┘          └──────────────────────┘            │
     * │                                                                     │
     * │   { onDelete: "cascade" }                                           │
     * │     If the document is deleted, the evidence record is deleted too. │
     * │     If the proof file no longer exists, the evidence linking to it  │
     * │     is meaningless.                                                 │
     * │     See clients.ts for full explanation of onDelete options.         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id").notNull()                               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Which client this evidence is for.                                  │
     * │                                                                     │
     * │ clientId:                                                           │
     * │   TypeScript property name. In code: complianceEvidence.clientId    │
     * │                                                                     │
     * │ uuid("client_id")                                                   │
     * │   Creates a column named "client_id" storing a UUID.                │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every piece of evidence MUST be for a specific client.            │
     * │   "This passport satisfies KYC-001 FOR John Smith."                 │
     * │                                                                     │
     * │ NOTICE: There is NO .references() here!                             │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ DENORMALIZED FOR QUERY EFFICIENCY:                          │   │
     * │   │                                                             │   │
     * │   │ "Denormalized" means we're storing data here that could     │   │
     * │   │ technically be looked up through the document's client_id.  │   │
     * │   │                                                             │   │
     * │   │ Without client_id here, to find "all evidence for John":    │   │
     * │   │   1. Look up John's documents in the documents table        │   │
     * │   │   2. Then find evidence matching those document IDs         │   │
     * │   │   → This requires joining two tables (SLOWER)               │   │
     * │   │                                                             │   │
     * │   │ With client_id here:                                        │   │
     * │   │   SELECT * FROM compliance_evidence                         │   │
     * │   │     WHERE client_id = 'john-id'                             │   │
     * │   │   → Direct lookup, no joins needed (FASTER)                 │   │
     * │   │                                                             │   │
     * │   │ The tradeoff: We store the client_id in two places           │   │
     * │   │ (documents AND evidence), which means we must keep them      │   │
     * │   │ in sync. But the query performance gain is worth it.         │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Client context (denormalized for query efficiency)
    clientId: uuid("client_id").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: text("status").notNull().default("pending")                 │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The current state of this evidence in the review workflow.          │
     * │                                                                     │
     * │ text("status")                                                      │
     * │   Creates a text column named "status".                             │
     * │   Possible values: "pending", "approved", "rejected", "expired"     │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every evidence record MUST have a status. The system needs to     │
     * │   know where each piece of evidence stands in the review process.   │
     * │                                                                     │
     * │ .default("pending")                                                 │
     * │   New evidence starts as "pending" - it has been submitted but      │
     * │   not yet reviewed by a compliance officer.                         │
     * │                                                                     │
     * │ THE STATUS LIFECYCLE:                                               │
     * │   ┌─────────┐    reviewed    ┌──────────┐                           │
     * │   │ pending │───────────────►│ approved │──── time passes ──►expired│
     * │   │         │                └──────────┘                           │
     * │   │         │    reviewed    ┌──────────┐                           │
     * │   │         │───────────────►│ rejected │                           │
     * │   └─────────┘                └──────────┘                           │
     * │                                                                     │
     * │   pending  → Document uploaded, waiting for review                  │
     * │   approved → Compliance officer accepted this as valid evidence     │
     * │   rejected → Compliance officer said this doesn't satisfy the rule  │
     * │   expired  → The evidence was approved but its validity period      │
     * │              has passed (e.g., annual tax return is now 2 years old) │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Evidence status
    status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'expired'

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ validFrom: timestamp("valid_from", { withTimezone: true })          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this evidence STARTS being valid.                              │
     * │                                                                     │
     * │ timestamp("valid_from", { withTimezone: true })                     │
     * │   Stores date + time + timezone.                                    │
     * │   Example: "2024-01-15T00:00:00+00:00"                              │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - null means "valid from the moment it was approved"              │
     * │   - Some evidence doesn't have a specific start date                │
     * │                                                                     │
     * │ Used together with validUntil to define the validity window:        │
     * │   validFrom: 2024-01-15  →  validUntil: 2025-01-15                 │
     * │   "This evidence is valid for one year"                             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    validFrom: timestamp("valid_from", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ validUntil: timestamp("valid_until", { withTimezone: true })         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this evidence EXPIRES and needs to be re-collected.            │
     * │                                                                     │
     * │ timestamp("valid_until", { withTimezone: true })                    │
     * │   Stores date + time + timezone.                                    │
     * │   Example: "2025-01-15T00:00:00+00:00"                              │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - null means "this evidence never expires"                        │
     * │   - Some controls only need to be satisfied once (like onboarding)  │
     * │                                                                     │
     * │ WHY IS THIS IMPORTANT?                                              │
     * │   The system can run a query like:                                   │
     * │   SELECT * FROM compliance_evidence                                 │
     * │     WHERE valid_until < NOW()                                       │
     * │     AND status = 'approved'                                         │
     * │   → "Find all approved evidence that has expired"                   │
     * │   → Then notify the compliance team to re-collect these documents.  │
     * │                                                                     │
     * │   There's an index on valid_until below to make this query fast.    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    validUntil: timestamp("valid_until", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ reviewedBy: uuid("reviewed_by")                                     │
     * │   .references(() => users.id, { onDelete: "set null" })             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY linking to the USER who reviewed this evidence.         │
     * │                                                                     │
     * │ reviewedBy:                                                         │
     * │   TypeScript property name. In code: complianceEvidence.reviewedBy  │
     * │                                                                     │
     * │ uuid("reviewed_by")                                                 │
     * │   Creates a column named "reviewed_by" storing a UUID that          │
     * │   references users.id.                                              │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - null means "not yet reviewed" (status is still "pending")       │
     * │   - Once a compliance officer reviews the evidence, this column     │
     * │     gets filled with their user ID                                  │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   FOREIGN KEY: reviewed_by MUST exist in users.id (or be null).     │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     users table                 compliance_evidence                 │
     * │     ┌────────────────┐          ┌──────────────────────┐            │
     * │     │ id (PK)        │◄─────────│ reviewed_by (FK)     │            │
     * │     │ "user-alice"   │          │ "user-alice"         │            │
     * │     │ name: Alice    │          │ status: "approved"   │            │
     * │     └────────────────┘          └──────────────────────┘            │
     * │                                                                     │
     * │   { onDelete: "set null" }                                          │
     * │     ┌─────────────────────────────────────────────────────────┐     │
     * │     │ NOTICE: This uses "set null" instead of "cascade"!      │     │
     * │     │                                                         │     │
     * │     │ "cascade" would DELETE the evidence if the reviewer's   │     │
     * │     │ user account is deleted. That's too aggressive - we     │     │
     * │     │ don't want to lose compliance evidence just because     │     │
     * │     │ someone left the company.                               │     │
     * │     │                                                         │     │
     * │     │ "set null" keeps the evidence but sets reviewed_by      │     │
     * │     │ to NULL. The evidence record is preserved for audit     │     │
     * │     │ purposes, we just lose who specifically reviewed it.    │     │
     * │     │                                                         │     │
     * │     │ See clients.ts for full explanation of onDelete options. │     │
     * │     └─────────────────────────────────────────────────────────┘     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Review tracking
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ reviewedAt: timestamp("reviewed_at", { withTimezone: true })         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When the evidence was reviewed (approved or rejected).              │
     * │                                                                     │
     * │ timestamp("reviewed_at", { withTimezone: true })                    │
     * │   Stores date + time + timezone.                                    │
     * │   Example: "2024-01-16T14:30:00+00:00"                              │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - null means "not yet reviewed"                                   │
     * │   - Gets filled in at the same time as reviewed_by                  │
     * │                                                                     │
     * │ WHY TRACK THIS?                                                     │
     * │   Audit trail: Regulators may ask "when was this evidence approved?"│
     * │   Combined with reviewed_by, we have a complete record:             │
     * │   "Alice approved John's passport on Jan 16, 2024 at 2:30 PM"      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ reviewNotes: text("review_notes")                                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Optional comments from the reviewer about this evidence.            │
     * │                                                                     │
     * │ text("review_notes")                                                │
     * │   Creates a text column named "review_notes".                       │
     * │   Example: "Valid US passport, expires 2030. Photo matches client." │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - null when not yet reviewed, or reviewer left no comment         │
     * │   - Particularly useful when rejecting: "Rejected because the       │
     * │     document is expired. Please upload a current version."           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    reviewNotes: text("review_notes"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })           │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this evidence record was first created (when the document was  │
     * │ submitted as evidence for a control).                               │
     * │                                                                     │
     * │ timestamp + .notNull() + .defaultNow()                              │
     * │   Automatically records the current time when inserted.             │
     * │   See orgs.ts for full explanation.                                 │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Standard timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })           │
     * │   .notNull().defaultNow().$onUpdate(() => new Date())               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this evidence record was last modified (e.g., when status      │
     * │ changed from "pending" to "approved").                              │
     * │                                                                     │
     * │ Same as createdAt, plus .$onUpdate(() => new Date()) which          │
     * │ automatically updates the timestamp on any change.                  │
     * │   See orgs.ts for full explanation of $onUpdate.                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    /**
     * SOFT DELETE — see documents.ts deletedAt for full explanation.
     * NULL = active row. NOT NULL = "deleted" at that timestamp.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },

  // ==================== INDEXES ====================
  /**
   * (table) => [...]
   *
   * This function receives the table and returns an array of INDEXES.
   * See orgs.ts for full explanation of what indexes are and why we use them.
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_evidence_control_id_idx").on(table.controlId)     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on the control_id column.                                     │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me ALL evidence records for this compliance control."       │
     * │   SELECT * FROM compliance_evidence WHERE control_id = 'ctrl-001'   │
     * │                                                                     │
     * │ WHY: When viewing a control's detail page, you want to see all      │
     * │ evidence that has been submitted for it. This index makes that       │
     * │ lookup fast.                                                        │
     * │ Example: "Show me everyone who has submitted ID for KYC-001."       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find evidence for a control
    index("compliance_evidence_control_id_idx").on(table.controlId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_evidence_document_id_idx").on(table.documentId)   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on the document_id column.                                    │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Which compliance controls does this document satisfy?"           │
     * │   SELECT * FROM compliance_evidence WHERE document_id = 'doc-789'   │
     * │                                                                     │
     * │ WHY: When viewing a document, you might want to see what            │
     * │ compliance requirements it's being used for. One passport might     │
     * │ satisfy multiple controls (KYC-001 identity AND KYC-003 photo).     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find evidence documents
    index("compliance_evidence_document_id_idx").on(table.documentId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_evidence_client_id_idx").on(table.clientId)       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on the client_id column.                                      │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me ALL compliance evidence for this client."                │
     * │   SELECT * FROM compliance_evidence WHERE client_id = 'john-id'     │
     * │                                                                     │
     * │ WHY: The most common compliance view is a client's compliance       │
     * │ dashboard: "Is John Smith fully compliant? What's pending?"          │
     * │ This index makes that query fast, returning all of John's evidence  │
     * │ across all controls instantly.                                       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find compliance status for a client
    index("compliance_evidence_client_id_idx").on(table.clientId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_evidence_valid_until_idx").on(table.validUntil)   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on the valid_until column.                                    │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me all evidence that is expiring soon or already expired."  │
     * │   SELECT * FROM compliance_evidence                                 │
     * │     WHERE valid_until < '2024-02-15'                                │
     * │     AND status = 'approved'                                         │
     * │                                                                     │
     * │ WHY: Compliance teams need to proactively re-collect expiring       │
     * │ documents. A daily cron job might query: "What evidence expires     │
     * │ in the next 30 days?" and send reminder emails. Without this        │
     * │ index, that query would have to scan every evidence row.            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find expiring evidence
    index("compliance_evidence_valid_until_idx").on(table.validUntil),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("compliance_evidence_status_idx").on(table.status)            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on the status column.                                         │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Show me all PENDING evidence that needs review."                 │
     * │   SELECT * FROM compliance_evidence WHERE status = 'pending'        │
     * │                                                                     │
     * │ WHY: Compliance officers need a "review queue" of pending items.    │
     * │ This index lets the system quickly find all evidence waiting for     │
     * │ review, or all rejected evidence, or all expired evidence - any     │
     * │ status-based filter.                                                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Filter by status
    index("compliance_evidence_status_idx").on(table.status),
  ]
);

// ============================================================================
// RELATIONS DEFINITIONS
// ============================================================================

/**
 * Compliance Control Relations (PARENT of Evidence)
 *
 * Kevin, compliance works as a TWO-TABLE system:
 *
 *   ┌────────────────────────┐          ┌──────────────────────────┐
 *   │ Compliance Controls    │ ───────< │  Compliance Evidence     │
 *   │  (the RULES)           │          │  (the PROOF)             │
 *   │  "KYC-001: Verify ID"  │          │  "John's passport.pdf"   │
 *   │  id (PK)               │          │  control_id (FK)         │
 *   └────────────────────────┘          │  document_id (FK) ──────►│ Documents
 *                                       └──────────────────────────┘
 *
 *   Controls = "What must be done" (the checklist)
 *   Evidence = "Proof it was done" (links a document to a control)
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER (see documents.ts for full breakdown):                │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │   "Fetch all columns from [table] where [column] matches [value]"   │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each compliance_control:
 *     control.org      → "Find the ONE org this control belongs to"
 *                        SELECT * FROM orgs WHERE id = control.org_id
 *     control.evidence → "Find ALL evidence records for this control"
 *                        SELECT * FROM compliance_evidence WHERE control_id = control.id
 *
 * QUERY EXAMPLE - Get all controls for an org with their evidence:
 *   const controls = await db.query.complianceControls.findMany({
 *     where: and(
 *       eq(complianceControls.orgId, orgId),
 *       eq(complianceControls.isActive, true),
 *     ),
 *     with: {
 *       evidence: {
 *         with: { document: true, reviewer: true },
 *       },
 *     },
 *   });
 *   // controls[0].code = "KYC-001"
 *   // controls[0].evidence[0].document.name = "passport.pdf"
 *   // controls[0].evidence[0].reviewer.fullName = "Alice"
 */
export const complianceControlsRelations = relations(
  complianceControls,
  ({ one, many }) => ({
    /**
     * ONE relationship: Control belongs to ONE Org (REQUIRED)
     * SQL: SELECT * FROM orgs WHERE id = control.org_id
     */
    org: one(orgs, {
      fields: [complianceControls.orgId],
      references: [orgs.id],
    }),

    /**
     * ONE relationship: Control MAY have ONE Assignee (OPTIONAL)
     *
     * The user responsible for this control. NULL = unassigned.
     * SQL: SELECT * FROM users WHERE id = control.assignee_id
     */
    assignee: one(users, {
      fields: [complianceControls.assigneeId],
      references: [users.id],
    }),

    /**
     * MANY relationship: Control has MANY Evidence records
     *
     * One control can have multiple pieces of evidence across clients.
     * "KYC-001" might have John's passport AND Jane's driver's license.
     * SQL: SELECT * FROM compliance_evidence WHERE control_id = control.id
     */
    evidence: many(complianceEvidence),
  })
);

/**
 * Compliance Evidence Relations (JUNCTION: Control ↔ Document)
 *
 * Kevin, compliance_evidence is a JUNCTION TABLE that links:
 *   - A compliance control (the rule)
 *   - A document (the proof)
 *   - A client (who the proof is for)
 *
 *   ┌──────────────────────┐      ┌───────────────────┐      ┌────────────┐
 *   │ ComplianceControls   │ ───< │ ComplianceEvidence │ >─── │ Documents  │
 *   │ (the rule)           │      │ (the link)         │      │ (the file) │
 *   └──────────────────────┘      └───────────────────┘      └────────────┘
 *
 * Plus it carries extra data: status, validity dates, reviewer info.
 *
 * PSEUDOCODE:
 *   For each compliance_evidence:
 *     evidence.control  → "Find the ONE control this evidence satisfies"
 *                         SELECT * FROM compliance_controls WHERE id = evidence.control_id
 *     evidence.document → "Find the ONE document used as proof"
 *                         SELECT * FROM documents WHERE id = evidence.document_id
 *     evidence.reviewer → "Find the ONE user who reviewed this evidence"
 *                         SELECT * FROM users WHERE id = evidence.reviewed_by
 *
 * QUERY EXAMPLE - Check if a client has all required evidence:
 *   const evidence = await db.query.complianceEvidence.findMany({
 *     where: and(
 *       eq(complianceEvidence.clientId, clientId),
 *       eq(complianceEvidence.status, "approved"),
 *     ),
 *     with: {
 *       control: true,   // Which rule does this satisfy?
 *       document: true,  // What's the proof?
 *       reviewer: true,  // Who approved it?
 *     },
 *   });
 */
export const complianceEvidenceRelations = relations(
  complianceEvidence,
  ({ one }) => ({
    /**
     * ONE relationship: Evidence satisfies ONE Control (REQUIRED)
     * SQL: SELECT * FROM compliance_controls WHERE id = evidence.control_id
     */
    control: one(complianceControls, {
      fields: [complianceEvidence.controlId],
      references: [complianceControls.id],
    }),

    /**
     * ONE relationship: Evidence uses ONE Document as proof (REQUIRED)
     * SQL: SELECT * FROM documents WHERE id = evidence.document_id
     */
    document: one(documents, {
      fields: [complianceEvidence.documentId],
      references: [documents.id],
    }),

    /**
     * ONE relationship: Evidence was reviewed by ONE User (OPTIONAL)
     *
     * NULL if not yet reviewed (status = "pending").
     * SQL: SELECT * FROM users WHERE id = evidence.reviewed_by
     */
    reviewer: one(users, {
      fields: [complianceEvidence.reviewedBy],
      references: [users.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type ComplianceControl = typeof complianceControls.$inferSelect
 *
 * Creates a TypeScript type representing a COMPLIANCE CONTROL ROW from the
 * database. Used when you SELECT (read) data.
 *
 * $inferSelect = "Infer the type for selecting data"
 * See orgs.ts for full explanation of $inferSelect.
 *
 * Example:
 *   const control: ComplianceControl = await db.query.complianceControls.findFirst();
 *   control.code        // TypeScript knows this is string
 *   control.name        // TypeScript knows this is string
 *   control.description // TypeScript knows this is string | null
 *   control.isActive    // TypeScript knows this is boolean
 *   control.metadata    // TypeScript knows this is ComplianceControlMetadata
 */
export type ComplianceControl = typeof complianceControls.$inferSelect;

/**
 * export type NewComplianceControl = typeof complianceControls.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new compliance control.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * $inferInsert = "Infer the type for inserting data"
 * See orgs.ts for full explanation of $inferInsert.
 *
 * Example:
 *   const newControl: NewComplianceControl = {
 *     orgId: "abc-123",                    // Required (no default)
 *     code: "KYC-001",                     // Required (no default)
 *     name: "Client Identity Verification", // Required (no default)
 *     // description, category, frequency are optional (nullable)
 *     // isActive defaults to true
 *     // id, metadata, requiredDocumentTypes, createdAt, updatedAt have defaults
 *   };
 *   await db.insert(complianceControls).values(newControl);
 */
export type NewComplianceControl = typeof complianceControls.$inferInsert;

/**
 * export type ComplianceEvidence = typeof complianceEvidence.$inferSelect
 *
 * Creates a TypeScript type representing a COMPLIANCE EVIDENCE ROW from the
 * database. Used when you SELECT (read) data.
 *
 * Example:
 *   const evidence: ComplianceEvidence = await db.query.complianceEvidence.findFirst();
 *   evidence.controlId   // TypeScript knows this is string (UUID)
 *   evidence.documentId  // TypeScript knows this is string (UUID)
 *   evidence.status      // TypeScript knows this is string
 *   evidence.reviewedBy  // TypeScript knows this is string | null
 *   evidence.validUntil  // TypeScript knows this is Date | null
 */
export type ComplianceEvidence = typeof complianceEvidence.$inferSelect;

/**
 * export type NewComplianceEvidence = typeof complianceEvidence.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new compliance evidence record.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * Example:
 *   const newEvidence: NewComplianceEvidence = {
 *     controlId: "ctrl-001",     // Required - which rule this satisfies
 *     documentId: "doc-789",     // Required - which document is the proof
 *     clientId: "john-id",       // Required - who this evidence is for
 *     // status defaults to "pending"
 *     // validFrom, validUntil, reviewedBy, reviewedAt, reviewNotes are optional
 *     // id, createdAt, updatedAt have defaults
 *   };
 *   await db.insert(complianceEvidence).values(newEvidence);
 */
export type NewComplianceEvidence = typeof complianceEvidence.$inferInsert;
