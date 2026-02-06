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
 *       For example, "a report has many report_versions."
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See orgs.ts for full explanation.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, integer, index }
 *   from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
 *
 * BREAKDOWN:
 *   pgTable   = Function to CREATE a new database table.
 *               See orgs.ts for full explanation.
 *
 *   uuid      = Column type for UUIDs (Universally Unique Identifiers).
 *               A UUID is a 36-character random string like:
 *               "550e8400-e29b-41d4-a716-446655440000"
 *               See orgs.ts for full explanation.
 *
 *   text      = Column type for text/strings (like "Q4 Portfolio Summary").
 *               Can hold any length of text.
 *               See orgs.ts for full explanation.
 *
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00").
 *               We use { withTimezone: true } to track the timezone too.
 *               See orgs.ts for full explanation.
 *
 *   jsonb     = Column type for JSON data (JavaScript Object Notation, Binary).
 *               Stores flexible, structured data like:
 *               { "dateRange": { "start": "2024-01-01", "end": "2024-03-31" } }
 *               See orgs.ts for full explanation.
 *
 *   integer   = Column type for whole numbers (1, 2, 3, 42, 100, etc.)
 *               ┌─────────────────────────────────────────────────────────────┐
 *               │ WHAT IS INTEGER?                                            │
 *               │                                                             │
 *               │ An integer is a WHOLE NUMBER - no decimals allowed.          │
 *               │   Valid:   1, 2, 3, 42, 0, -5                               │
 *               │   Invalid: 1.5, 3.14, 0.99                                  │
 *               │                                                             │
 *               │ In PostgreSQL, integer stores numbers from                   │
 *               │   -2,147,483,648 to 2,147,483,647                           │
 *               │   (way more than enough for version numbers!)               │
 *               │                                                             │
 *               │ WHY USE INTEGER here?                                        │
 *               │   We use it for version_number (1, 2, 3...) and             │
 *               │   current_version_number. These are counting numbers -      │
 *               │   you'd never have version 1.5 of a report.                 │
 *               └─────────────────────────────────────────────────────────────┘
 *
 *   index     = Function to create database indexes (makes queries faster).
 *               See orgs.ts for full explanation.
 *
 * WHERE: "drizzle-orm/pg-core" is the PostgreSQL-specific part of Drizzle.
 *        The "/pg-core" means "PostgreSQL core functions".
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";

/**
 * import { reportTypeEnum, reportStatusEnum } from "./00_enums"
 *
 * WHAT: Imports two ENUM column types from our centralized enums file.
 * WHY:  These enums restrict a column to a fixed set of allowed values.
 *       Think of it like a dropdown menu - you can only pick from the list.
 * WHERE: "./00_enums" is our enums file at app/db/schema/00_enums.ts.
 *
 * reportTypeEnum:
 *   Allowed values: "portfolio_summary", "asset_allocation", "performance",
 *                   "tax_summary", "compliance", "client_statement", "custom"
 *   WHY: Categorizes what KIND of report this is. Lets you filter:
 *        "Show me all portfolio_summary reports for this client."
 *
 * reportStatusEnum:
 *   Allowed values: "draft", "published", "archived"
 *   WHY: Tracks the LIFECYCLE of a report:
 *        draft → published → archived
 *        "Draft" means it's being worked on. "Published" means it's
 *        been finalized and possibly shared with clients.
 *        "Archived" means it's old and no longer actively used.
 *
 * See 00_enums.ts for the full list of all enums in the system.
 */
import { reportTypeEnum, reportStatusEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition from the orgs.ts file.
 * WHY:  We need to reference orgs.id to create a Foreign Key relationship.
 *       Every report MUST belong to an org (multi-tenant isolation).
 * WHERE: "./" means "same directory", so this imports from app/db/schema/orgs.ts.
 *
 * See clients.ts for full explanation of Foreign Key imports.
 */
import { orgs } from "./orgs";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition from the users.ts file.
 * WHY:  Reports track WHO created them (created_by → users.id) and
 *       report_versions track WHO generated them (generated_by → users.id).
 *       We need to reference users.id for these Foreign Key relationships.
 * WHERE: Same directory - app/db/schema/users.ts.
 */
import { users } from "./users";

/**
 * import { clients } from "./clients"
 *
 * WHAT: Imports the clients table definition from the clients.ts file.
 * WHY:  A report can OPTIONALLY be scoped to a specific client.
 *       For example, "Q4 Portfolio Summary for John Smith".
 *       We need to reference clients.id for this Foreign Key relationship.
 * WHERE: Same directory - app/db/schema/clients.ts.
 */
import { clients } from "./clients";

/**
 * ============================================================================
 * REPORTS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this table stores report METADATA - the "what" and "when" of reports,
 * NOT the actual report content. Think of it like a folder label on a filing
 * cabinet: it tells you the report's name, type, and configuration, but the
 * actual generated PDF/document is stored in report_versions.
 *
 * WHY SEPARATE REPORTS FROM REPORT_VERSIONS?
 *
 *   Imagine you generate a "Q4 Portfolio Summary" every quarter.
 *   Each time you generate it, you get a new version (v1, v2, v3...).
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ PARENT/CHILD PATTERN:                                               │
 *   │                                                                     │
 *   │   reports (PARENT - the "definition")                               │
 *   │   ┌──────────────────────────────────────────────┐                  │
 *   │   │ name: "Q4 Portfolio Summary"                  │                  │
 *   │   │ type: "portfolio_summary"                     │                  │
 *   │   │ parameters: { dateRange: Q4 2024 }            │                  │
 *   │   └──────────┬───────────────────────────────────┘                  │
 *   │              │                                                      │
 *   │              │ has MANY versions (children)                          │
 *   │              │                                                      │
 *   │   report_versions (CHILDREN - the "generated outputs")              │
 *   │   ┌──────────────────────────────────────────────┐                  │
 *   │   │ v1 - Generated Jan 1  - storagePath: /v1.pdf │                  │
 *   │   │ v2 - Generated Jan 15 - storagePath: /v2.pdf │                  │
 *   │   │ v3 - Generated Feb 1  - storagePath: /v3.pdf │                  │
 *   │   └──────────────────────────────────────────────┘                  │
 *   │                                                                     │
 *   │ WHY THIS MATTERS:                                                   │
 *   │ 1. Reports can be RE-GENERATED (new version, same parameters)       │
 *   │ 2. Preserves HISTORY of what was shared with clients                │
 *   │ 3. Supports "as of" reporting for COMPLIANCE - auditors can see     │
 *   │    exactly what was shown to a client on a specific date            │
 *   │ 4. Versions are IMMUTABLE - once created, they never change         │
 *   │    (like entries in a ledger)                                        │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * Design decisions:
 * - Reports are org-scoped (every report belongs to an org)
 * - Reports are OPTIONALLY client-scoped (org-wide vs client-specific)
 * - report_type enum: Categorization for filtering
 * - status: draft -> published -> archived lifecycle
 * - parameters JSONB: Report configuration (date range, filters, etc.)
 */

/**
 * export const reports = pgTable(...)
 *
 * BREAKDOWN:
 *   export   = Makes this table definition available for other files to import
 *   const    = Declares a constant (value that won't change)
 *   reports  = The name we give this table in our TypeScript code
 *   pgTable  = The function that creates a PostgreSQL table definition
 *
 * pgTable takes 3 arguments:
 *   1. "reports"     = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes
 *
 * See orgs.ts for full explanation of pgTable.
 */
export const reports = pgTable(
  "reports", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the reports table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column for the reports table.          │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In code, we use: reports.id         │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "550e8400-e29b-41d4-a716-446655440000"             │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each report row.             │
     * │   No two reports can have the same id.                              │
     * │   See orgs.ts for full explanation of Primary Keys.                 │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when inserting a new row.   │
     * │   You don't have to provide an id yourself.                         │
     * │   See orgs.ts for full explanation of defaultRandom.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull()                                     │
     * │   .references(() => orgs.id, { onDelete: "cascade" })               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) that links every report to an ORG.       │
     * │ This is how multi-tenant isolation works: every report belongs to   │
     * │ exactly one organization, and org A can never see org B's reports.  │
     * │                                                                     │
     * │ orgId:                                                              │
     * │   TypeScript property name. We use reports.orgId in code.           │
     * │   Note: camelCase in TypeScript (orgId), but snake_case in the      │
     * │   database (org_id). Drizzle handles the translation.               │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" in the database.                  │
     * │   It stores a UUID that MUST match an existing orgs.id value.       │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every report MUST belong to an org. Cannot be empty.              │
     * │   See clients.ts for full explanation of .notNull().                 │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   FOREIGN KEY: This column's value must exist in orgs.id.           │
     * │   { onDelete: "cascade" } = If the org is deleted, all its          │
     * │   reports are automatically deleted too.                            │
     * │   See clients.ts for full explanation of Foreign Keys and           │
     * │   onDelete options.                                                 │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   orgs table              reports table                             │
     * │   ┌────────────┐          ┌────────────────────┐                    │
     * │   │ id (PK)    │◄─────────│ org_id (FK)        │                    │
     * │   │ "abc-123"  │          │ "abc-123"          │                    │
     * │   │ "def-456"  │          │ id (PK)            │                    │
     * │   └────────────┘          │ name               │                    │
     * │                           └────────────────────┘                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id")                                         │
     * │   .references(() => clients.id, { onDelete: "set null" })           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ OPTIONAL Foreign Key linking a report to a specific CLIENT.          │
     * │                                                                     │
     * │ clientId:                                                           │
     * │   TypeScript property name. We use reports.clientId in code.         │
     * │                                                                     │
     * │ uuid("client_id")                                                   │
     * │   Creates a column named "client_id" in the database.               │
     * │   Stores a UUID pointing to a specific client.                      │
     * │                                                                     │
     * │ NO .notNull() - THIS IS INTENTIONALLY NULLABLE:                     │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHY IS client_id NULLABLE?                                  │   │
     * │   │                                                             │   │
     * │   │ Not all reports are for a specific client. There are two    │   │
     * │   │ kinds of reports:                                           │   │
     * │   │                                                             │   │
     * │   │ 1. ORG-WIDE reports (client_id = NULL):                     │   │
     * │   │    "Firm Performance Overview" - covers the whole firm      │   │
     * │   │    "Annual Compliance Summary" - not about one client       │   │
     * │   │                                                             │   │
     * │   │ 2. CLIENT-SPECIFIC reports (client_id = a valid UUID):      │   │
     * │   │    "Q4 Portfolio Summary for John Smith"                    │   │
     * │   │    "Tax Summary for Jane Doe"                               │   │
     * │   │                                                             │   │
     * │   │ By making this NULLABLE, we support both patterns.          │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .references(() => clients.id, { onDelete: "set null" })             │
     * │   FOREIGN KEY: client_id must exist in clients.id (if not null).    │
     * │                                                                     │
     * │   { onDelete: "set null" } means:                                   │
     * │     If the client is DELETED, don't delete the report.              │
     * │     Instead, set client_id to NULL (the report becomes org-wide).   │
     * │     This preserves report history even if a client is removed.      │
     * │                                                                     │
     * │     Compare with orgId above which uses "cascade" (delete report    │
     * │     if org is deleted). The difference:                             │
     * │     - Org deleted = report makes no sense → cascade (delete it)     │
     * │     - Client deleted = report still has value → set null (keep it)  │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   clients table           reports table                             │
     * │   ┌────────────┐          ┌────────────────────┐                    │
     * │   │ id (PK)    │◄ ─ ─ ─ ─│ client_id (FK)     │                    │
     * │   │ "jsmith-1" │          │ "jsmith-1" or NULL │                    │
     * │   └────────────┘          └────────────────────┘                    │
     * │         ▲                                                           │
     * │     Dashed line = OPTIONAL relationship (can be NULL)               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ name: text("name").notNull()                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The human-readable NAME of this report.                             │
     * │                                                                     │
     * │ text("name")                                                        │
     * │   Creates a TEXT column named "name" in the database.               │
     * │   Can hold any string of any length.                                │
     * │   Examples: "Q4 2024 Portfolio Summary", "Annual Tax Report",       │
     * │             "Client Statement - John Smith"                         │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every report MUST have a name. You can't have a report without   │
     * │   knowing what it's called.                                         │
     * │   See orgs.ts for full explanation of .notNull().                   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    name: text("name").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ description: text("description")                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ An OPTIONAL longer description of what this report covers.          │
     * │                                                                     │
     * │ text("description")                                                 │
     * │   Creates a TEXT column named "description" in the database.        │
     * │   Example: "Quarterly portfolio performance review including        │
     * │   asset allocation breakdown and risk metrics."                     │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE (optional):                                │
     * │   The report name might be descriptive enough on its own.           │
     * │   A description adds extra context but isn't required.              │
     * │   If not provided, this column's value will be NULL.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    description: text("description"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ reportType: reportTypeEnum("report_type").notNull()                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The CATEGORY of this report, restricted to a fixed set of values.   │
     * │                                                                     │
     * │ reportTypeEnum("report_type")                                       │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT IS AN ENUM COLUMN?                                     │   │
     * │   │                                                             │   │
     * │   │ An enum (short for "enumeration") restricts a column to     │   │
     * │   │ a FIXED SET of allowed values. Think of it like a dropdown  │   │
     * │   │ menu: you can ONLY pick from the list.                      │   │
     * │   │                                                             │   │
     * │   │ reportTypeEnum allows these values:                         │   │
     * │   │   "portfolio_summary"  - Overview of portfolio holdings     │   │
     * │   │   "asset_allocation"   - How assets are distributed         │   │
     * │   │   "performance"        - Investment returns over time       │   │
     * │   │   "tax_summary"        - Tax-related figures                │   │
     * │   │   "compliance"         - Regulatory compliance report       │   │
     * │   │   "client_statement"   - Statement sent to a client         │   │
     * │   │   "custom"             - Any other type                     │   │
     * │   │                                                             │   │
     * │   │ If you try to insert a value not in this list:              │   │
     * │   │   INSERT INTO reports (report_type) VALUES ('random_type')  │   │
     * │   │   → DATABASE ERROR: invalid enum value                      │   │
     * │   │                                                             │   │
     * │   │ WHY USE ENUMS?                                              │   │
     * │   │   - Prevents typos ("portflio_summary" would be rejected)   │   │
     * │   │   - Makes filtering reliable:                               │   │
     * │   │     SELECT * FROM reports WHERE report_type = 'tax_summary' │   │
     * │   │   - Self-documenting: the enum IS the list of allowed values│   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every report MUST have a type. You can't create a report          │
     * │   without categorizing it.                                          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    reportType: reportTypeEnum("report_type").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: reportStatusEnum("status").notNull().default("draft")       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Tracks the LIFECYCLE of this report.                                │
     * │                                                                     │
     * │ reportStatusEnum("status")                                          │
     * │   Creates an enum column named "status" with these allowed values:  │
     * │                                                                     │
     * │   "draft"     → Report is being created/edited. Not ready to share. │
     * │   "published" → Report is finalized and can be shared with clients. │
     * │   "archived"  → Report is old/outdated, kept for historical records.│
     * │                                                                     │
     * │   LIFECYCLE FLOW:                                                   │
     * │     draft ──────► published ──────► archived                        │
     * │     (creating)    (finalized)       (historical)                    │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every report MUST have a status. Cannot be empty.                 │
     * │                                                                     │
     * │ .default("draft")                                                   │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT DOES .default("draft") DO?                             │   │
     * │   │                                                             │   │
     * │   │ If you don't specify a status when creating a report, the   │   │
     * │   │ database automatically sets it to "draft".                  │   │
     * │   │                                                             │   │
     * │   │ This makes sense because a new report always starts as a    │   │
     * │   │ draft - you create it, configure it, generate it, THEN     │   │
     * │   │ publish it.                                                 │   │
     * │   │                                                             │   │
     * │   │ USAGE:                                                      │   │
     * │   │   await db.insert(reports).values({                         │   │
     * │   │     orgId: "abc-123",                                       │   │
     * │   │     name: "Q4 Summary",                                     │   │
     * │   │     reportType: "portfolio_summary",                        │   │
     * │   │     // status is NOT provided → defaults to "draft"         │   │
     * │   │   });                                                       │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    status: reportStatusEnum("status").notNull().default("draft"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ parameters: jsonb("parameters")                                     │
     * │   .$type<ReportParameters>().default({})                            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Stores the CONFIGURATION for generating this report as JSON.        │
     * │                                                                     │
     * │ jsonb("parameters")                                                 │
     * │   Creates a JSONB column named "parameters" in the database.        │
     * │   JSONB stores structured data (objects, arrays) efficiently.        │
     * │   See orgs.ts for full explanation of JSONB.                        │
     * │                                                                     │
     * │   Example value stored in this column:                              │
     * │   {                                                                 │
     * │     "dateRange": { "start": "2024-10-01", "end": "2024-12-31" },   │
     * │     "groupBy": "asset_class",                                       │
     * │     "currency": "USD"                                               │
     * │   }                                                                 │
     * │                                                                     │
     * │ .$type<ReportParameters>()                                          │
     * │   Tells TypeScript what SHAPE the JSON should have.                 │
     * │   ReportParameters is an interface defined below.                   │
     * │   This gives us autocomplete when accessing parameters:             │
     * │     report.parameters?.dateRange?.start  // TypeScript knows!       │
     * │   See clients.ts for full explanation of .$type<>().                │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no parameters are provided, use an empty object {}.            │
     * │   A report might start with no configuration and have parameters    │
     * │   added later before the first version is generated.                │
     * │                                                                     │
     * │ WHY STORE PARAMETERS AS JSONB?                                      │
     * │   Different report types need different parameters:                  │
     * │   - Portfolio Summary: needs dateRange, groupBy                     │
     * │   - Tax Summary: needs asOfDate, excludeAssetClasses                │
     * │   - Custom: could need anything!                                    │
     * │   JSONB is flexible enough to handle all of them without needing    │
     * │   a separate column for every possible parameter.                   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    parameters: jsonb("parameters").$type<ReportParameters>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ currentVersionId: uuid("current_version_id")                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Stores the UUID of the CURRENTLY ACTIVE version of this report.     │
     * │                                                                     │
     * │ uuid("current_version_id")                                          │
     * │   Creates a UUID column named "current_version_id".                 │
     * │   This will hold the id of a row in the report_versions table.      │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE:                                           │
     * │   A brand-new report hasn't been generated yet, so it has           │
     * │   no current version. This column starts as NULL and gets set       │
     * │   after the first version is generated.                             │
     * │                                                                     │
     * │ NO .references() - WHY NOT?                                         │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ This is a CIRCULAR REFERENCE situation:                      │   │
     * │   │                                                             │   │
     * │   │   reports.current_version_id → report_versions.id           │   │
     * │   │   report_versions.report_id  → reports.id                   │   │
     * │   │                                                             │   │
     * │   │ If both had .references(), you'd have a chicken-and-egg     │   │
     * │   │ problem: can't create the report without the version,       │   │
     * │   │ and can't create the version without the report.            │   │
     * │   │                                                             │   │
     * │   │ Solution: skip the FK constraint here and enforce it in     │   │
     * │   │ application code instead. The REAL FK is on                 │   │
     * │   │ report_versions.report_id (which does have .references()).  │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ USAGE PATTERN:                                                      │
     * │   1. Create report (currentVersionId = NULL)                        │
     * │   2. Generate first version → report_versions row created           │
     * │   3. Update report: set currentVersionId = that version's id        │
     * │   4. Generate new version → new report_versions row                 │
     * │   5. Update report: set currentVersionId = new version's id         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    currentVersionId: uuid("current_version_id"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ currentVersionNumber: integer("current_version_number").default(0)  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Stores the VERSION NUMBER of the currently active version.          │
     * │                                                                     │
     * │ integer("current_version_number")                                   │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT IS integer?                                            │   │
     * │   │                                                             │   │
     * │   │ An integer column stores WHOLE NUMBERS (no decimals).       │   │
     * │   │   Valid:   0, 1, 2, 3, 42, 100                              │   │
     * │   │   Invalid: 1.5, 3.14                                        │   │
     * │   │                                                             │   │
     * │   │ We use it here because version numbers are always whole     │   │
     * │   │ numbers: version 1, version 2, version 3, etc.             │   │
     * │   │ You'd never have version 2.5 of a report.                  │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .default(0)                                                         │
     * │   Starts at 0, meaning "no version has been generated yet."         │
     * │   After the first version is generated, this becomes 1.             │
     * │   After the second, 2. And so on.                                   │
     * │                                                                     │
     * │ WHY STORE BOTH currentVersionId AND currentVersionNumber?           │
     * │   - currentVersionId: Lets you quickly LOOK UP the full version     │
     * │     record (JOIN to report_versions by id)                          │
     * │   - currentVersionNumber: Lets you quickly DISPLAY "Version 3"     │
     * │     without needing to query report_versions at all                 │
     * │   Both are conveniences to avoid extra database queries.            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    currentVersionNumber: integer("current_version_number").default(0),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdBy: uuid("created_by")                                       │
     * │   .references(() => users.id, { onDelete: "set null" })             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Tracks WHICH USER created this report.                              │
     * │                                                                     │
     * │ uuid("created_by")                                                  │
     * │   Creates a UUID column named "created_by" in the database.         │
     * │   Stores the id of the user who created this report.                │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE:                                           │
     * │   In edge cases (system-generated reports, migrated data), there    │
     * │   might not be a specific user who "created" the report.            │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   FOREIGN KEY: created_by must match an existing users.id.          │
     * │                                                                     │
     * │   { onDelete: "set null" } means:                                   │
     * │     If the user who created this report is DELETED from the system, │
     * │     don't delete the report! Just set created_by to NULL.           │
     * │     The report is still valuable even if the creator's account      │
     * │     no longer exists.                                               │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   users table             reports table                             │
     * │   ┌────────────┐          ┌────────────────────┐                    │
     * │   │ id (PK)    │◄ ─ ─ ─ ─│ created_by (FK)    │                    │
     * │   │ "user-abc" │          │ "user-abc" or NULL │                    │
     * │   └────────────┘          └────────────────────┘                    │
     * │         ▲                                                           │
     * │     Dashed line = OPTIONAL relationship (can be NULL)               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this report was created.                               │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Stores a date + time + timezone.                                  │
     * │   Example: "2024-10-15T14:30:00-05:00" (Oct 15, 2:30 PM Eastern)   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every report must have a creation timestamp.                      │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   Automatically set to the current time when the row is inserted.   │
     * │                                                                     │
     * │ See orgs.ts for full explanation of timestamp, notNull, defaultNow. │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })          │
     * │   .notNull().defaultNow().$onUpdate(() => new Date())               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this report was last modified.                          │
     * │                                                                     │
     * │ Same as createdAt (timestamp, notNull, defaultNow), plus:           │
     * │                                                                     │
     * │ .$onUpdate(() => new Date())                                        │
     * │   Automatically updates this timestamp whenever the row is changed. │
     * │   For example, when the report status changes from "draft" to       │
     * │   "published", updatedAt is automatically refreshed.                │
     * │                                                                     │
     * │ See orgs.ts for full explanation of .$onUpdate().                   │
     * │                                                                     │
     * │ NOTE: report_versions do NOT have updatedAt because they are        │
     * │ IMMUTABLE (never modified after creation). Reports DO have          │
     * │ updatedAt because their metadata (status, name, parameters)         │
     * │ CAN change over time.                                               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },

  // ==================== INDEXES ====================
  /**
   * (table) => [...]
   *
   * This function returns an array of INDEXES for the reports table.
   * Indexes make database queries faster by creating "lookup tables."
   * See orgs.ts for full explanation of what indexes are and their tradeoffs.
   *
   * Each index below is designed for a specific QUERY PATTERN that our
   * application frequently uses.
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("reports_org_id_idx").on(table.orgId)                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on org_id for org-scoped queries.                             │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get ALL reports belonging to a specific org"                     │
     * │   SELECT * FROM reports WHERE org_id = 'abc-123'                    │
     * │                                                                     │
     * │ WHY: Every single query in our app filters by org_id first          │
     * │ (multi-tenant isolation). This is the most fundamental index.       │
     * │ Without it, the database would scan every report in the system      │
     * │ just to find reports for one org.                                   │
     * │                                                                     │
     * │ NAMING: reports_org_id_idx = table_column_idx convention            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("reports_org_id_idx").on(table.orgId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("reports_org_client_idx").on(table.orgId, table.clientId)      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE INDEX on org_id AND client_id.                            │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get all reports for a specific CLIENT within an org"             │
     * │   SELECT * FROM reports                                             │
     * │     WHERE org_id = 'abc-123' AND client_id = 'jsmith-1'            │
     * │                                                                     │
     * │ WHY: When viewing a client's profile, you want to see all their    │
     * │ reports. This index makes that lookup fast. It's "composite"        │
     * │ (two columns) because we always filter by org_id first, then       │
     * │ narrow down by client_id.                                           │
     * │                                                                     │
     * │ See clients.ts for full explanation of composite indexes.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("reports_org_client_idx").on(table.orgId, table.clientId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("reports_org_type_idx").on(table.orgId, table.reportType)      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE INDEX on org_id AND report_type.                          │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get all PORTFOLIO SUMMARY reports in this org"                   │
     * │   SELECT * FROM reports                                             │
     * │     WHERE org_id = 'abc-123' AND report_type = 'portfolio_summary' │
     * │                                                                     │
     * │ WHY: Filtering by report type is a common action in the UI.         │
     * │ An admin might want to see "all compliance reports" or              │
     * │ "all tax summaries." This index makes that filter fast.             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("reports_org_type_idx").on(table.orgId, table.reportType),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("reports_org_status_idx").on(table.orgId, table.status)        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE INDEX on org_id AND status.                               │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get all PUBLISHED reports in this org"                           │
     * │   SELECT * FROM reports                                             │
     * │     WHERE org_id = 'abc-123' AND status = 'published'              │
     * │                                                                     │
     * │ WHY: The dashboard likely shows reports grouped by status.          │
     * │ "Show me all drafts" or "Show me all published reports" are         │
     * │ common filtering patterns. This index speeds up those queries.      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("reports_org_status_idx").on(table.orgId, table.status),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("reports_org_created_at_idx")                                  │
     * │   .on(table.orgId, table.createdAt)                                 │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE INDEX on org_id AND created_at.                           │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get the most RECENT reports in this org"                         │
     * │   SELECT * FROM reports                                             │
     * │     WHERE org_id = 'abc-123'                                       │
     * │     ORDER BY created_at DESC                                        │
     * │     LIMIT 10                                                        │
     * │                                                                     │
     * │   (ORDER BY = sort the results. DESC = descending = newest first.   │
     * │    LIMIT 10 = only return the first 10 results.)                    │
     * │                                                                     │
     * │ WHY: The reports dashboard likely shows "recent reports" by default. │
     * │ This index makes sorting by creation date efficient.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("reports_org_created_at_idx").on(table.orgId, table.createdAt),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ReportParameters Interface                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This defines the SHAPE of the JSON stored in the "parameters" column    │
 * │ of the reports table AND the "parameters_snapshot" column of            │
 * │ report_versions.                                                        │
 * │                                                                         │
 * │ TypeScript uses this interface for:                                      │
 * │   - Autocomplete: report.parameters?.dateRange?.start                   │
 * │   - Type checking: report.parameters?.groupBy = "invalid" → ERROR       │
 * │                                                                         │
 * │ The "?" after each property means it's OPTIONAL (can be undefined).     │
 * │ Different report types need different subsets of these parameters.       │
 * │ A portfolio_summary might use dateRange + groupBy, while a tax_summary  │
 * │ might use asOfDate + excludeAssetClasses.                               │
 * │                                                                         │
 * │ See clients.ts ClientProfile for a similar pattern with JSONB + interface│
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface ReportParameters {
  /**
   * dateRange?: { start: string; end: string }
   *
   * The date window the report covers.
   * Example: { start: "2024-10-01", end: "2024-12-31" }
   * This means "show data from October 1 to December 31, 2024."
   * Used by portfolio_summary, performance, and asset_allocation reports.
   */
  dateRange?: {
    start: string;
    end: string;
  };

  /**
   * asOfDate?: string
   *
   * A single point-in-time date for "as of" reporting.
   * Example: "2024-12-31"
   * This means "show the portfolio as it looked on December 31, 2024."
   * Used for compliance and audit reports where you need a snapshot in time.
   */
  asOfDate?: string;

  /**
   * includeEntities?: string[]
   *
   * An array of entity IDs to INCLUDE in the report.
   * Example: ["entity-abc", "entity-def"]
   * If provided, only these entities' data appears in the report.
   * If not provided, all entities are included by default.
   */
  includeEntities?: string[];

  /**
   * excludeAssetClasses?: string[]
   *
   * An array of asset classes to EXCLUDE from the report.
   * Example: ["crypto", "collectibles"]
   * Useful when a client wants a report without certain asset types.
   */
  excludeAssetClasses?: string[];

  /**
   * groupBy?: "entity" | "asset_class" | "none"
   *
   * How to GROUP the data in the report.
   * - "entity": Group by legal entity (Trust, LLC, Personal)
   * - "asset_class": Group by asset type (Equities, Real Estate, Cash)
   * - "none": Flat list, no grouping
   */
  groupBy?: "entity" | "asset_class" | "none";

  /**
   * currency?: string
   *
   * Which currency to display values in.
   * Example: "USD", "EUR", "GBP"
   * If a client has assets in multiple currencies, this controls
   * which currency everything is converted to for the report.
   */
  currency?: string;

  /**
   * customFilters?: Record<string, unknown>
   *
   * A catch-all for any additional filters not covered above.
   * Record<string, unknown> means "an object with string keys and any values."
   * Example: { "minimumValue": 100000, "showInactive": false }
   * This provides flexibility for custom report types.
   */
  customFilters?: Record<string, unknown>;
}

/**
 * ============================================================================
 * REPORT VERSIONS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this table stores the ACTUAL GENERATED OUTPUT of each report.
 * Every time a report is generated, a new row is added here. These rows
 * are IMMUTABLE - once created, they are NEVER updated or deleted.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT DOES "IMMUTABLE" MEAN?                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ "Immutable" means "cannot be changed after creation."                   │
 * │                                                                         │
 * │ Think of it like a printed book:                                        │
 * │   - Once printed, you can't change the text on page 42.                │
 * │   - If you want changes, you print a NEW EDITION (new version).         │
 * │   - The old edition still exists exactly as it was.                      │
 * │                                                                         │
 * │ For report versions:                                                    │
 * │   - Version 1 is generated on Jan 1 → row is created, NEVER modified  │
 * │   - Client asks for updates → Version 2 is generated → NEW row         │
 * │   - Version 1 still exists exactly as it was on Jan 1                  │
 * │                                                                         │
 * │ WHY IMMUTABLE?                                                          │
 * │   1. AUDIT TRAIL: "What did the client see on Jan 1?"                  │
 * │      → Look at version 1. It hasn't changed since then.               │
 * │   2. LEGAL PROTECTION: Prove what was communicated to a client.        │
 * │      → "Here's the exact PDF we sent on this date."                    │
 * │   3. DEBUGGING: Compare versions to find discrepancies.                │
 * │      → "Version 2 shows $500K but version 1 showed $450K. Why?"       │
 * │                                                                         │
 * │ NOTICE: report_versions has createdAt but NO updatedAt.                │
 * │ That's a deliberate signal: this row should never be updated.          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * export const reportVersions = pgTable(...)
 *
 * BREAKDOWN:
 *   export          = Makes this table definition available for other files
 *   const           = Declares a constant (value that won't change)
 *   reportVersions  = The name we give this table in our TypeScript code
 *   pgTable         = The function that creates a PostgreSQL table definition
 *
 * pgTable takes 3 arguments:
 *   1. "report_versions" = The actual table name in the database
 *   2. { columns }       = An object defining all the columns
 *   3. (table) => []     = A function that returns an array of indexes
 *
 * See orgs.ts for full explanation of pgTable.
 */
export const reportVersions = pgTable(
  "report_versions", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the report_versions table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column for report_versions.            │
     * │                                                                     │
     * │ id:                                                                 │
     * │   TypeScript property name. In code: reportVersions.id              │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a UUID column named "id".                                 │
     * │   Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"                  │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   THE unique identifier for each version row. No duplicates.        │
     * │   See orgs.ts for full explanation of Primary Keys.                 │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Auto-generates a random UUID on insert.                           │
     * │   See orgs.ts for full explanation of defaultRandom.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ reportId: uuid("report_id").notNull()                               │
     * │   .references(() => reports.id, { onDelete: "cascade" })            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY linking each version to its PARENT report.              │
     * │                                                                     │
     * │ reportId:                                                           │
     * │   TypeScript property name. In code: reportVersions.reportId        │
     * │                                                                     │
     * │ uuid("report_id")                                                   │
     * │   Creates a UUID column named "report_id" in the database.          │
     * │   Stores the id of the parent report this version belongs to.       │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every version MUST belong to a report. A version without a        │
     * │   parent report makes no sense - it's like a chapter without a book.│
     * │   See clients.ts for full explanation of .notNull().                │
     * │                                                                     │
     * │ .references(() => reports.id, { onDelete: "cascade" })              │
     * │   FOREIGN KEY: report_id must match an existing reports.id.         │
     * │                                                                     │
     * │   { onDelete: "cascade" } means:                                    │
     * │     If the parent report is DELETED, all its versions are           │
     * │     automatically deleted too. Versions can't exist without         │
     * │     their report - they'd be orphans with no context.               │
     * │   See clients.ts for full explanation of Foreign Keys and           │
     * │   onDelete options.                                                 │
     * │                                                                     │
     * │ VISUAL (ONE-TO-MANY relationship):                                  │
     * │   reports table             report_versions table                   │
     * │   ┌────────────┐            ┌──────────────────────┐                │
     * │   │ id (PK)    │◄───────────│ report_id (FK)       │                │
     * │   │ "rpt-001"  │            │ "rpt-001"  (v1)      │                │
     * │   │            │            │ "rpt-001"  (v2)      │                │
     * │   │            │            │ "rpt-001"  (v3)      │                │
     * │   └────────────┘            └──────────────────────┘                │
     * │        │                           │                                │
     * │   ONE report              has MANY versions                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ versionNumber: integer("version_number").notNull()                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A human-readable sequential number for this version (1, 2, 3...).   │
     * │                                                                     │
     * │ integer("version_number")                                           │
     * │   Creates an INTEGER column named "version_number".                 │
     * │   Integers are whole numbers: 1, 2, 3, 4, etc.                     │
     * │   See the integer import comment above for full explanation.         │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every version MUST have a version number. Cannot be empty.        │
     * │                                                                     │
     * │ HOW IT WORKS:                                                       │
     * │   When generating a new version:                                    │
     * │   1. Look at the parent report's currentVersionNumber (e.g., 2)     │
     * │   2. Set versionNumber = currentVersionNumber + 1 = 3               │
     * │   3. Update the parent report's currentVersionNumber to 3           │
     * │                                                                     │
     * │ WHY NOT USE THE UUID AS THE VERSION IDENTIFIER?                     │
     * │   UUIDs are great for database lookups but terrible for humans:     │
     * │   - UUID: "Are you looking at version a1b2c3d4-e5f6-7890...?"      │
     * │   - Number: "Are you looking at version 3?"                         │
     * │   Version numbers are for human communication.                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    versionNumber: integer("version_number").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ storagePath: text("storage_path")                                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The file path or URL to the actual generated report file (PDF, etc.)│
     * │                                                                     │
     * │ text("storage_path")                                                │
     * │   Creates a TEXT column named "storage_path".                        │
     * │   Example values:                                                   │
     * │     "/reports/org-abc/rpt-001/v3.pdf"                               │
     * │     "https://storage.example.com/reports/rpt-001-v3.pdf"           │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE:                                           │
     * │   A version might be in the process of being generated.             │
     * │   The row is created first, then the file is generated and the      │
     * │   path is updated. During that brief window, storagePath is NULL.   │
     * │                                                                     │
     * │ WHY STORE A PATH INSTEAD OF THE FILE CONTENT?                       │
     * │   PDF files can be very large (megabytes). Databases are great      │
     * │   for structured data but NOT for large binary files. Instead:      │
     * │   - The actual file is stored in a file storage service (like S3)   │
     * │   - The database just stores the PATH to that file                  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    storagePath: text("storage_path"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ contentHash: text("content_hash")                                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A SHA-256 hash of the generated file for INTEGRITY VERIFICATION.    │
     * │                                                                     │
     * │ text("content_hash")                                                │
     * │   Creates a TEXT column named "content_hash".                        │
     * │   Example: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b│
     * │             7852b855"                                                │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ WHAT IS A HASH (SHA-256)?                                      │ │
     * │ │                                                                 │ │
     * │ │ A hash is like a fingerprint for a file. It takes ANY file     │ │
     * │ │ and produces a fixed-length string (64 characters for SHA-256). │ │
     * │ │                                                                 │ │
     * │ │ KEY PROPERTIES:                                                 │ │
     * │ │ 1. DETERMINISTIC: Same file always produces the same hash.     │ │
     * │ │ 2. ONE-WAY: You can't recreate the file from the hash.        │ │
     * │ │ 3. SENSITIVE: Even tiny changes produce a totally different hash│ │
     * │ │                                                                 │ │
     * │ │ WHY STORE IT?                                                   │ │
     * │ │ - INTEGRITY: Verify the file hasn't been tampered with.        │ │
     * │ │   "Is the PDF we stored still exactly what we generated?"      │ │
     * │ │ - COMPLIANCE: Prove the file hasn't changed since creation.    │ │
     * │ │   "This hash matches - the document is authentic."              │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE:                                           │
     * │   Same reason as storagePath - may be NULL during generation.       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    contentHash: text("content_hash"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ parametersSnapshot: jsonb("parameters_snapshot")                     │
     * │   .$type<ReportParameters>().default({})                            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A FROZEN COPY of the report's parameters at the time this version   │
     * │ was generated.                                                      │
     * │                                                                     │
     * │ jsonb("parameters_snapshot")                                        │
     * │   Creates a JSONB column named "parameters_snapshot".               │
     * │   Stores the same kind of data as reports.parameters.               │
     * │   See orgs.ts for full explanation of JSONB.                        │
     * │                                                                     │
     * │ .$type<ReportParameters>().default({})                              │
     * │   Same type shape and default as reports.parameters.                │
     * │                                                                     │
     * │ WHY A "SNAPSHOT" (frozen copy)?                                     │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ SNAPSHOT PATTERN EXPLAINED:                                  │   │
     * │   │                                                             │   │
     * │   │ The parent report's parameters can CHANGE over time.        │   │
     * │   │ But each version needs to remember what parameters were     │   │
     * │   │ used when IT was generated.                                  │   │
     * │   │                                                             │   │
     * │   │ EXAMPLE:                                                    │   │
     * │   │   Report parameters: { dateRange: Q3 2024 }                 │   │
     * │   │   → Generate Version 1 (snapshot: { dateRange: Q3 2024 })   │   │
     * │   │                                                             │   │
     * │   │   Report parameters changed to: { dateRange: Q4 2024 }      │   │
     * │   │   → Generate Version 2 (snapshot: { dateRange: Q4 2024 })   │   │
     * │   │                                                             │   │
     * │   │   Now you can see:                                          │   │
     * │   │     Version 1 used Q3 parameters                            │   │
     * │   │     Version 2 used Q4 parameters                            │   │
     * │   │                                                             │   │
     * │   │ Without snapshots, you'd only see the CURRENT parameters    │   │
     * │   │ and wouldn't know what Version 1 was actually based on.     │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    parametersSnapshot: jsonb("parameters_snapshot")
      .$type<ReportParameters>()
      .default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ generatedBy: uuid("generated_by")                                   │
     * │   .references(() => users.id, { onDelete: "set null" })             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Tracks WHICH USER triggered the generation of this version.         │
     * │                                                                     │
     * │ uuid("generated_by")                                                │
     * │   Creates a UUID column named "generated_by" in the database.       │
     * │   Stores the id of the user who clicked "Generate Report."          │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE:                                           │
     * │   Some versions might be system-generated (e.g., automatic          │
     * │   scheduled reports). In that case, no specific user triggered it.  │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   FOREIGN KEY: generated_by must match an existing users.id.        │
     * │                                                                     │
     * │   { onDelete: "set null" } means:                                   │
     * │     If the user is deleted, don't delete the version! The version   │
     * │     is immutable and must be preserved. Just set generated_by to    │
     * │     NULL ("we don't know who generated it anymore, but the version  │
     * │     itself is intact").                                              │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   users table             report_versions table                     │
     * │   ┌────────────┐          ┌────────────────────────┐                │
     * │   │ id (PK)    │◄ ─ ─ ─ ─│ generated_by (FK)      │                │
     * │   │ "user-abc" │          │ "user-abc" or NULL     │                │
     * │   └────────────┘          └────────────────────────┘                │
     * │         ▲                                                           │
     * │     Dashed line = OPTIONAL relationship (can be NULL)               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    generatedBy: uuid("generated_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ generatedAt: timestamp("generated_at", { withTimezone: true })      │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this version was generated.                            │
     * │                                                                     │
     * │ timestamp("generated_at", { withTimezone: true })                   │
     * │   Stores a date + time + timezone.                                  │
     * │   Example: "2024-12-31T23:59:00-05:00"                              │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every version must have a generation timestamp.                   │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   Automatically set to the current time when the row is inserted.   │
     * │                                                                     │
     * │ NOTE: This is named "generated_at" instead of "created_at" to       │
     * │ emphasize that this is when the REPORT CONTENT was generated, not   │
     * │ just when the database row was created. They happen at the same     │
     * │ time, but the naming makes the intent clearer.                      │
     * │                                                                     │
     * │ See orgs.ts for full explanation of timestamp, notNull, defaultNow. │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ sharedAt: timestamp("shared_at", { withTimezone: true })            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this version was shared with clients/recipients.       │
     * │                                                                     │
     * │ timestamp("shared_at", { withTimezone: true })                      │
     * │   Stores a date + time + timezone of the sharing event.             │
     * │   Example: "2025-01-02T09:00:00-05:00"                              │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE:                                           │
     * │   A version might be generated but NOT YET SHARED.                  │
     * │   This column starts as NULL and gets set when someone actually     │
     * │   shares the report. You can query for unshared versions:           │
     * │     SELECT * FROM report_versions WHERE shared_at IS NULL           │
     * │     (IS NULL = "this column is empty/not set")                      │
     * │                                                                     │
     * │ NO .defaultNow() = NO automatic value:                              │
     * │   Unlike generatedAt, sharing doesn't happen at creation time.      │
     * │   It happens later when a user explicitly shares the report.        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    sharedAt: timestamp("shared_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ sharedWith: jsonb("shared_with").$type<string[]>().default([])      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ An array of WHO this version was shared with (email addresses, IDs).│
     * │                                                                     │
     * │ jsonb("shared_with")                                                │
     * │   Creates a JSONB column named "shared_with".                       │
     * │   See orgs.ts for full explanation of JSONB.                        │
     * │                                                                     │
     * │ .$type<string[]>()                                                  │
     * │   Tells TypeScript this is an ARRAY OF STRINGS.                     │
     * │   string[] means "a list where every item is a string."             │
     * │   Example: ["john@example.com", "jane@example.com"]                 │
     * │                                                                     │
     * │ .default([])                                                        │
     * │   Defaults to an empty array [] (shared with nobody yet).           │
     * │   When someone is shared with, their identifier gets added:         │
     * │     [] → ["john@example.com"]                                       │
     * │     → ["john@example.com", "jane@example.com"]                     │
     * │                                                                     │
     * │ WHY TRACK WHO IT WAS SHARED WITH?                                   │
     * │   - Compliance: "Who saw this report?"                              │
     * │   - Communication: "Did we send this to Jane?"                      │
     * │   - Audit: "Prove that John received the Q4 statement"              │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    sharedWith: jsonb("shared_with").$type<string[]>().default([]),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this database row was created.                         │
     * │                                                                     │
     * │ See orgs.ts for full explanation of timestamp, notNull, defaultNow. │
     * │                                                                     │
     * │ IMPORTANT: No updatedAt column here!                                │
     * │ Report versions are IMMUTABLE - they should NEVER be modified       │
     * │ after creation. Having no updatedAt column is a deliberate design   │
     * │ signal: "Don't update this row. Create a new version instead."      │
     * │                                                                     │
     * │ If you're wondering about the difference between createdAt and      │
     * │ generatedAt: they're set at the same moment, but createdAt is the   │
     * │ standard "when was this row born" timestamp (every table has one),  │
     * │ while generatedAt is domain-specific ("when was this report         │
     * │ generated"). In practice, they're always equal.                     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },

  // ==================== INDEXES ====================
  /**
   * (table) => [...]
   *
   * This function returns an array of INDEXES for the report_versions table.
   * See orgs.ts for full explanation of what indexes are.
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("report_versions_report_id_idx").on(table.reportId)           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Index on report_id for finding all versions of a specific report.   │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get ALL versions of report 'rpt-001'"                            │
     * │   SELECT * FROM report_versions WHERE report_id = 'rpt-001'        │
     * │                                                                     │
     * │ WHY: When viewing a report, you'll want to see its version history. │
     * │ "Show me all versions of the Q4 Portfolio Summary."                 │
     * │ Without this index, the database would scan every version row in    │
     * │ the system to find the ones belonging to this report.               │
     * │                                                                     │
     * │ NAMING: report_versions_report_id_idx = table_column_idx            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("report_versions_report_id_idx").on(table.reportId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("report_versions_report_version_idx")                         │
     * │   .on(table.reportId, table.versionNumber)                          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE INDEX on report_id AND version_number.                    │
     * │                                                                     │
     * │ WHAT QUERY THIS SUPPORTS:                                           │
     * │   "Get the LATEST version of report 'rpt-001'"                     │
     * │   SELECT * FROM report_versions                                     │
     * │     WHERE report_id = 'rpt-001'                                    │
     * │     ORDER BY version_number DESC                                    │
     * │     LIMIT 1                                                         │
     * │                                                                     │
     * │   OR: "Get version 3 of report 'rpt-001'"                          │
     * │   SELECT * FROM report_versions                                     │
     * │     WHERE report_id = 'rpt-001' AND version_number = 3             │
     * │                                                                     │
     * │ WHY: Finding a specific version by number, or sorting versions      │
     * │ to find the latest one, are the most common operations on this      │
     * │ table. This composite index makes both patterns fast.               │
     * │                                                                     │
     * │ See clients.ts for full explanation of composite indexes.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("report_versions_report_version_idx").on(
      table.reportId,
      table.versionNumber
    ),
  ]
);

// ============================================================================
// RELATIONS DEFINITIONS
// ============================================================================

/**
 * Report Relations (PARENT of Report Versions)
 *
 * Kevin, reports use a PARENT/CHILD pattern with report_versions:
 *
 *   ┌──────────┐          ┌───────────────────┐
 *   │ Reports  │ ───────< │  Report Versions  │
 *   │  (ONE)   │          │     (MANY)        │
 *   │  id (PK) │          │ report_id (FK)    │
 *   └──────────┘          └───────────────────┘
 *       │
 *       │  "Portfolio Summary v1, v2, v3..."
 *       │
 *   A report is the DEFINITION (name, type, parameters).
 *   Versions are the GENERATED OUTPUTS (immutable snapshots).
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
 *   For each report:
 *     report.org           → "Find the ONE org this report belongs to"
 *                            SELECT * FROM orgs WHERE id = report.org_id
 *     report.client        → "Find the ONE client (if any) this report is for"
 *                            SELECT * FROM clients WHERE id = report.client_id
 *     report.createdByUser → "Find the ONE user who created this report"
 *                            SELECT * FROM users WHERE id = report.created_by
 *     report.versions      → "Find ALL versions of this report"
 *                            SELECT * FROM report_versions WHERE report_id = report.id
 *
 * QUERY EXAMPLE - Get a report with its latest version:
 *   const report = await db.query.reports.findFirst({
 *     where: eq(reports.id, reportId),
 *     with: {
 *       client: true,
 *       createdByUser: true,
 *       versions: {
 *         orderBy: desc(reportVersions.versionNumber),
 *         limit: 1,
 *       },
 *     },
 *   });
 *   // report.client?.displayName = "John Smith"
 *   // report.versions[0].storagePath = "/reports/v3.pdf"
 */
export const reportsRelations = relations(reports, ({ one, many }) => ({
  /**
   * ONE relationship: Report belongs to ONE Org (REQUIRED)
   * SQL: SELECT * FROM orgs WHERE id = report.org_id
   */
  org: one(orgs, {
    fields: [reports.orgId],
    references: [orgs.id],
  }),

  /**
   * ONE relationship: Report MAY be for ONE Client (OPTIONAL)
   *
   * Org-wide reports (e.g., "Firm Performance") have no client.
   * Client reports (e.g., "Q4 Statement for John Smith") do.
   * SQL: SELECT * FROM clients WHERE id = report.client_id
   */
  client: one(clients, {
    fields: [reports.clientId],
    references: [clients.id],
  }),

  /**
   * ONE relationship: Report was created by ONE User (OPTIONAL)
   * SQL: SELECT * FROM users WHERE id = report.created_by
   */
  createdByUser: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),

  /**
   * MANY relationship: Report has MANY Versions
   *
   * Each time a report is generated, a new version is created.
   * Versions are IMMUTABLE - you never edit a version, you create a new one.
   * SQL: SELECT * FROM report_versions WHERE report_id = report.id
   */
  versions: many(reportVersions),
}));

/**
 * Report Version Relations (IMMUTABLE CHILD of Report)
 *
 * Kevin, report versions are IMMUTABLE (like ledger events).
 * Once generated, they never change - this ensures:
 *   1. You can prove what was shared with a client on a specific date
 *   2. Auditors can verify historical reports
 *   3. Comparing versions shows what changed
 *
 * PSEUDOCODE:
 *   For each report_version:
 *     version.report          → "Find the ONE report this version belongs to"
 *                               SELECT * FROM reports WHERE id = version.report_id
 *     version.generatedByUser → "Find the ONE user who generated this version"
 *                               SELECT * FROM users WHERE id = version.generated_by
 *
 * QUERY EXAMPLE - Get version with report context:
 *   const version = await db.query.reportVersions.findFirst({
 *     where: eq(reportVersions.id, versionId),
 *     with: {
 *       report: {
 *         with: { client: true, org: true },
 *       },
 *       generatedByUser: true,
 *     },
 *   });
 *   // version.report.name = "Q4 Portfolio Summary"
 *   // version.report.client.displayName = "John Smith"
 *   // version.generatedByUser.fullName = "Alice"
 */
export const reportVersionsRelations = relations(reportVersions, ({ one }) => ({
  /**
   * ONE relationship: Version belongs to ONE Report (REQUIRED)
   * SQL: SELECT * FROM reports WHERE id = version.report_id
   */
  report: one(reports, {
    fields: [reportVersions.reportId],
    references: [reports.id],
  }),

  /**
   * ONE relationship: Version was generated by ONE User (OPTIONAL)
   * SQL: SELECT * FROM users WHERE id = version.generated_by
   */
  generatedByUser: one(users, {
    fields: [reportVersions.generatedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ export type Report = typeof reports.$inferSelect                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Creates a TypeScript type representing a REPORT ROW from the database.  │
 * │ Used when you SELECT (read) data from the reports table.                │
 * │                                                                         │
 * │ $inferSelect = "Infer the type for selecting data"                      │
 * │ Drizzle looks at all the columns and creates a type with matching       │
 * │ properties, including which ones are nullable.                          │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const report: Report = await db.query.reports.findFirst({             │
 * │     where: eq(reports.id, someId),                                      │
 * │   });                                                                   │
 * │   report.name        // TypeScript knows: string (required)             │
 * │   report.description // TypeScript knows: string | null (nullable)      │
 * │   report.status      // TypeScript knows: "draft"|"published"|"archived"│
 * │   report.clientId    // TypeScript knows: string | null (optional FK)   │
 * │                                                                         │
 * │ See orgs.ts for full explanation of $inferSelect.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type Report = typeof reports.$inferSelect;

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ export type NewReport = typeof reports.$inferInsert                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Creates a TypeScript type for INSERTING a new report into the database.  │
 * │ Fields with defaults (.defaultRandom(), .default(), .defaultNow()) are  │
 * │ optional in this type. Fields with .notNull() and no default are        │
 * │ required.                                                               │
 * │                                                                         │
 * │ $inferInsert = "Infer the type for inserting data"                      │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const newReport: NewReport = {                                        │
 * │     orgId: "abc-123",                    // Required (notNull, no default)│
 * │     name: "Q4 Summary",                  // Required (notNull, no default)│
 * │     reportType: "portfolio_summary",     // Required (notNull, no default)│
 * │     // id → optional (has defaultRandom)                                │
 * │     // status → optional (has default "draft")                          │
 * │     // parameters → optional (has default {})                           │
 * │     // clientId → optional (nullable)                                   │
 * │     // createdBy → optional (nullable)                                  │
 * │     // createdAt, updatedAt → optional (have defaultNow)                │
 * │   };                                                                    │
 * │   await db.insert(reports).values(newReport);                           │
 * │                                                                         │
 * │ See orgs.ts for full explanation of $inferInsert.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type NewReport = typeof reports.$inferInsert;

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ export type ReportVersion = typeof reportVersions.$inferSelect          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Creates a TypeScript type representing a REPORT VERSION ROW from the    │
 * │ database. Used when you SELECT (read) data from report_versions.        │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const version: ReportVersion =                                        │
 * │     await db.query.reportVersions.findFirst({                           │
 * │       where: eq(reportVersions.id, someId),                             │
 * │     });                                                                 │
 * │   version.versionNumber    // TypeScript knows: number (required)       │
 * │   version.storagePath      // TypeScript knows: string | null (nullable)│
 * │   version.contentHash      // TypeScript knows: string | null (nullable)│
 * │   version.sharedWith       // TypeScript knows: string[] | null         │
 * │   version.parametersSnapshot // TypeScript knows: ReportParameters|null │
 * │                                                                         │
 * │ See orgs.ts for full explanation of $inferSelect.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type ReportVersion = typeof reportVersions.$inferSelect;

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ export type NewReportVersion = typeof reportVersions.$inferInsert        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Creates a TypeScript type for INSERTING a new report version.            │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const newVersion: NewReportVersion = {                                │
 * │     reportId: "rpt-001",               // Required (notNull, no default)│
 * │     versionNumber: 3,                  // Required (notNull, no default)│
 * │     // id → optional (has defaultRandom)                                │
 * │     // storagePath → optional (nullable)                                │
 * │     // contentHash → optional (nullable)                                │
 * │     // parametersSnapshot → optional (has default {})                   │
 * │     // generatedBy → optional (nullable)                                │
 * │     // generatedAt → optional (has defaultNow)                          │
 * │     // sharedAt → optional (nullable)                                   │
 * │     // sharedWith → optional (has default [])                           │
 * │     // createdAt → optional (has defaultNow)                            │
 * │   };                                                                    │
 * │   await db.insert(reportVersions).values(newVersion);                   │
 * │                                                                         │
 * │ See orgs.ts for full explanation of $inferInsert.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type NewReportVersion = typeof reportVersions.$inferInsert;
