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
 *       For this file: "an integration belongs to one org" and
 *       "an integration was connected by one user".
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See orgs.ts for full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
 *
 * BREAKDOWN:
 *   pgTable   = Function to CREATE a new database table.
 *               Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *               See orgs.ts for full explanation.
 *
 *   uuid      = Column type for UUIDs (Universally Unique Identifier).
 *               A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *               It's a random 36-character string that's practically impossible to guess.
 *               See orgs.ts for full explanation of why we use UUIDs.
 *
 *   text      = Column type for text/strings (like "Main Plaid Connection").
 *               Can hold any length of text.
 *               See orgs.ts for full explanation.
 *
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00").
 *               We use { withTimezone: true } to track the timezone too.
 *               See orgs.ts for full explanation of timestamps.
 *
 *   jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format).
 *               Allows storing flexible, structured data like:
 *               { "plaid": { "products": ["transactions"] }, "syncFrequency": "daily" }
 *               The "b" in jsonb means "binary" - it's stored efficiently.
 *               See orgs.ts for full explanation of JSONB.
 *
 *   index     = Function to create database indexes (makes queries faster).
 *               See orgs.ts for full explanation of indexes.
 *
 *   unique    = Function to create a UNIQUE CONSTRAINT across multiple columns.
 *               ┌─────────────────────────────────────────────────────────────┐
 *               │ WHAT IS A UNIQUE CONSTRAINT?                                │
 *               │                                                             │
 *               │ A unique constraint says: "This combination of values       │
 *               │ cannot appear more than once in the table."                 │
 *               │                                                             │
 *               │ We use it here to say: "One org can only have ONE           │
 *               │ integration per provider." So org "Acme" can't have TWO     │
 *               │ Plaid connections, but CAN have one Plaid + one QuickBooks. │
 *               │                                                             │
 *               │ DIFFERENCE FROM .unique() on a single column:               │
 *               │   .unique() on a single column = that ONE column must       │
 *               │   be unique across the whole table.                         │
 *               │   unique() on MULTIPLE columns = the COMBINATION must       │
 *               │   be unique. Each column individually can repeat.           │
 *               │                                                             │
 *               │ See the unique constraint section below for a full example. │
 *               └─────────────────────────────────────────────────────────────┘
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
  index,
  unique,
} from "drizzle-orm/pg-core";

/**
 * import { integrationStatusEnum, integrationProviderEnum } from "./00_enums"
 *
 * WHAT: Imports two PostgreSQL ENUM types from our central enums file.
 * WHY:  These enums restrict columns to a fixed set of allowed values.
 *       The database itself enforces these - you physically CANNOT insert
 *       a value that isn't in the enum.
 *
 * integrationStatusEnum:
 *   Allowed values: "connected", "disconnected", "error", "pending"
 *   Used for the "status" column - tracks whether the integration is working.
 *
 * integrationProviderEnum:
 *   Allowed values: "plaid", "yodlee", "quickbooks", "xero", "salesforce",
 *                   "hubspot", "google_drive", "dropbox", "docusign", "other"
 *   Used for the "provider" column - identifies which external service this is.
 *
 * WHERE: "./00_enums" means the file at app/db/schema/00_enums.ts.
 *        The "00_" prefix makes it sort first - enums must be defined BEFORE
 *        tables that use them (so migration order is correct).
 *
 * See 00_enums.ts for the full glossary of database fundamentals and
 * the complete list of all enums in the system.
 */
import { integrationStatusEnum, integrationProviderEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition from the orgs.ts file.
 * WHY:  We need to reference orgs.id to create a Foreign Key relationship.
 *       This line says "I need to know about the orgs table so I can point to it."
 *       Every integration belongs to exactly ONE org (multi-tenant isolation).
 * WHERE: "./" means "same directory", so this imports from app/db/schema/orgs.ts
 *
 * See clients.ts for full explanation of why we import parent tables.
 */
import { orgs } from "./orgs";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition from the users.ts file.
 * WHY:  We need to reference users.id to create a Foreign Key relationship.
 *       The "connected_by" column tracks WHICH USER set up this integration.
 *       For example: "Alice connected the Plaid integration on Jan 15."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/users.ts
 */
import { users } from "./users";

/**
 * ============================================================================
 * INTEGRATIONS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this table tracks connections to EXTERNAL SERVICES for an organization.
 *
 * WHAT IS AN INTEGRATION?
 *   An integration is a connection between our app and an outside service.
 *   Think of it like plugging an appliance into a wall outlet - the outlet
 *   (our app) connects to the appliance (external service) so they can
 *   share data.
 *
 * REAL-WORLD EXAMPLES:
 *   - Plaid / Yodlee:    Connect to bank accounts to pull financial data
 *   - QuickBooks / Xero: Sync accounting data (invoices, transactions)
 *   - Salesforce / HubSpot: Sync CRM client data
 *   - Google Drive / Dropbox: Store and retrieve documents
 *   - DocuSign:          Send documents for electronic signature
 *
 * WHAT THIS TABLE STORES:
 *   - Which provider (Plaid, QuickBooks, etc.)
 *   - Connection status (connected, disconnected, error, pending)
 *   - Non-secret metadata (account IDs, item IDs)
 *   - Sync tracking (when was data last pulled, did it succeed?)
 *   - Provider-specific settings (which Plaid products, which CRM objects, etc.)
 *   - A reference to where secrets are stored (vault_secret_id)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ CRITICAL SECURITY NOTE:                                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                        │
 * │ This table NEVER stores sensitive credentials directly.                │
 * │ NO access tokens. NO refresh tokens. NO API keys. NO passwords.       │
 * │                                                                        │
 * │ WHY? Because if someone gains access to the database, they would      │
 * │ get ALL the credentials for ALL external services. That would be      │
 * │ catastrophic - they could access bank accounts, CRM data, etc.        │
 * │                                                                        │
 * │ INSTEAD, we store a vault_secret_id that POINTS TO the secret in      │
 * │ Supabase Vault (an encrypted secrets manager). The Vault encrypts     │
 * │ secrets at rest, and only authorized code can decrypt them.            │
 * │                                                                        │
 * │ VISUAL:                                                                │
 * │   integrations table          Supabase Vault                          │
 * │   ┌────────────────────┐      ┌─────────────────────────┐             │
 * │   │ vault_secret_id ───│─────>│ id: "vault-abc-123"     │             │
 * │   │ "vault-abc-123"    │      │ secret: [ENCRYPTED]     │             │
 * │   │                    │      │   access_token: "sk_..." │             │
 * │   │ (NO secrets here!) │      │   refresh_token: "rt_..."│             │
 * │   └────────────────────┘      └─────────────────────────┘             │
 * │        SAFE to query              ENCRYPTED at rest                   │
 * │                                                                        │
 * │ This is called "secrets management" - a fundamental security practice.│
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * export const integrations = pgTable(...)
 *
 * BREAKDOWN:
 *   export        = Makes this available for other files to import.
 *                   Other files can do: import { integrations } from "./integrations"
 *   const         = Declares a constant (value that won't change).
 *   integrations  = The name we give this table in our TypeScript code.
 *                   We'll use it like: db.query.integrations.findMany()
 *   pgTable       = The function that creates a PostgreSQL table.
 *                   See orgs.ts for full explanation of pgTable.
 *
 * pgTable takes 3 arguments:
 *   1. "integrations" = The actual table name in the database
 *   2. { columns }    = An object defining all the columns
 *   3. (table) => []  = A function that returns an array of indexes and constraints
 */
export const integrations = pgTable(
  "integrations", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column.                                │
     * │ See orgs.ts for the full explanation of Primary Keys and UUIDs.     │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │                                                                     │
     * │ id:                                                                 │
     * │   TypeScript property name. In code: integrations.id                │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" with type UUID.                       │
     * │   Example value: "7f3b8c2a-e4d5-4f6a-9b1c-2d3e4f5a6b7c"            │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each row.                    │
     * │   - UNIQUE: No two integrations can have the same id                │
     * │   - NOT NULL: Every integration MUST have an id                     │
     * │   - IMMUTABLE: Should never change once set                         │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when inserting a new row.   │
     * │   You don't have to create the ID yourself.                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull()                                     │
     * │        .references(() => orgs.id, { onDelete: "cascade" })          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) - it creates a relationship to the orgs │
     * │ table. See clients.ts for the full explanation of Foreign Keys.     │
     * │                                                                     │
     * │ orgId:                                                              │
     * │   TypeScript property name. In code: integrations.orgId             │
     * │   Note: camelCase in TypeScript, but snake_case ("org_id") in DB.   │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" that stores a UUID.               │
     * │   This UUID must match an id in the orgs table.                     │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every integration MUST belong to an org. This cannot be empty.    │
     * │   See orgs.ts for full explanation of .notNull().                   │
     * │                                                                     │
     * │   If you try to insert an integration without org_id:               │
     * │     INSERT INTO integrations (provider, name) VALUES ('plaid', ...) │
     * │     → DATABASE ERROR: "org_id cannot be null"                       │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   FOREIGN KEY constraint:                                           │
     * │   - This column's value MUST exist in orgs.id                       │
     * │   - If the org is deleted, all its integrations are deleted too      │
     * │     (that's what "cascade" means - like a waterfall of deletions)   │
     * │                                                                     │
     * │   See clients.ts for the full visual explanation of onDelete options.│
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   orgs table              integrations table                        │
     * │   ┌────────────┐          ┌──────────────────────────┐              │
     * │   │ id (PK)    │◄─────────│ org_id (FK)              │              │
     * │   │ "abc-123"  │          │ "abc-123"                │              │
     * │   │ "def-456"  │          │ provider: "plaid"        │              │
     * │   └────────────┘          │ name: "Main Plaid"       │              │
     * │        ▲                  └──────────────────────────┘              │
     * │        │                                                            │
     * │   This is the              This POINTS TO                           │
     * │   Primary Key              that Primary Key                         │
     * │   (the source)             (the reference)                          │
     * │                                                                     │
     * │ WHY CASCADE? If a wealth management firm (org) is deleted from      │
     * │ the system, all their external service connections should go too.    │
     * │ An integration without an org is meaningless.                        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ provider: integrationProviderEnum("provider").notNull()              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This column identifies WHICH external service this integration is.  │
     * │                                                                     │
     * │ provider:                                                           │
     * │   TypeScript property name. In code: integrations.provider          │
     * │                                                                     │
     * │ integrationProviderEnum("provider")                                 │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT IS AN ENUM COLUMN?                                     │   │
     * │   │                                                             │   │
     * │   │ An ENUM restricts a column to a fixed list of values.       │   │
     * │   │ Think of it like a dropdown menu - you can ONLY pick from   │   │
     * │   │ the predefined options.                                     │   │
     * │   │                                                             │   │
     * │   │ Allowed values (defined in 00_enums.ts):                    │   │
     * │   │   "plaid"        - Bank account data aggregation            │   │
     * │   │   "yodlee"       - Alternative bank data aggregation        │   │
     * │   │   "quickbooks"   - Accounting software by Intuit            │   │
     * │   │   "xero"         - Cloud accounting software                │   │
     * │   │   "salesforce"   - Enterprise CRM platform                  │   │
     * │   │   "hubspot"      - Marketing/sales CRM platform             │   │
     * │   │   "google_drive" - Cloud file storage by Google             │   │
     * │   │   "dropbox"      - Cloud file storage                       │   │
     * │   │   "docusign"     - Electronic signature service             │   │
     * │   │   "other"        - Catch-all for unlisted providers         │   │
     * │   │                                                             │   │
     * │   │ If you try to insert an invalid value:                      │   │
     * │   │   INSERT INTO integrations (provider) VALUES ('stripe')     │   │
     * │   │   → DATABASE ERROR: invalid enum value "stripe"             │   │
     * │   │                                                             │   │
     * │   │ WHY USE AN ENUM instead of plain text?                      │   │
     * │   │   - Prevents typos: "pliad" would be caught by the DB       │   │
     * │   │   - Self-documenting: The allowed values ARE the docs       │   │
     * │   │   - Type-safe: TypeScript knows the exact allowed values    │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every integration MUST specify which provider it connects to.     │
     * │   An integration without a provider makes no sense.                 │
     * │                                                                     │
     * │ NOTE: This column participates in a COMPOSITE UNIQUE constraint     │
     * │ with org_id. See the unique constraint in the indexes section below.│
     * └─────────────────────────────────────────────────────────────────────┘
     */
    provider: integrationProviderEnum("provider").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ name: text("name").notNull()                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A human-friendly display name for this integration.                 │
     * │                                                                     │
     * │ name:                                                               │
     * │   TypeScript property name. In code: integrations.name              │
     * │                                                                     │
     * │ text("name")                                                        │
     * │   Creates a TEXT column named "name" in the database.               │
     * │   Can hold any string of any length.                                │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   "Main Plaid Connection"                                           │
     * │   "QuickBooks - Acme Corp"                                          │
     * │   "Salesforce CRM Sync"                                             │
     * │   "Shared Google Drive"                                             │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every integration MUST have a display name.                       │
     * │   This makes it easy for users to identify which integration is     │
     * │   which in the UI, especially if an org later has multiple          │
     * │   integrations of the same type.                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    name: text("name").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: integrationStatusEnum("status")                             │
     * │         .notNull().default("disconnected")                          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Tracks the current CONNECTION STATUS of this integration.           │
     * │                                                                     │
     * │ status:                                                             │
     * │   TypeScript property name. In code: integrations.status            │
     * │                                                                     │
     * │ integrationStatusEnum("status")                                     │
     * │   An ENUM column (same concept as provider above) with values:      │
     * │                                                                     │
     * │   "connected"     - Everything is working. Data flows normally.     │
     * │                     Example: Plaid successfully linked to bank.     │
     * │   "disconnected"  - Not currently connected. No data flowing.       │
     * │                     Example: User hasn't set it up yet, or          │
     * │                     intentionally disconnected it.                  │
     * │   "error"         - Something went wrong. Needs attention.          │
     * │                     Example: Plaid token expired, bank changed      │
     * │                     their API, authentication failed.               │
     * │   "pending"       - Connection in progress but not complete.        │
     * │                     Example: User started the Plaid Link flow       │
     * │                     but hasn't finished the bank login yet.         │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every integration MUST have a status. We always need to know      │
     * │   whether it's working or not.                                      │
     * │                                                                     │
     * │ .default("disconnected")                                            │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT DOES .default() DO?                                    │   │
     * │   │                                                             │   │
     * │   │ If you insert a row without specifying a status, the        │   │
     * │   │ database automatically uses "disconnected".                 │   │
     * │   │                                                             │   │
     * │   │ WHY "disconnected" as default?                              │   │
     * │   │ When you first create an integration record, the external   │   │
     * │   │ service isn't connected yet. The user still needs to go     │   │
     * │   │ through the OAuth/setup flow. So "disconnected" is the      │   │
     * │   │ safe, accurate starting state.                              │   │
     * │   │                                                             │   │
     * │   │ EXAMPLE:                                                    │   │
     * │   │   await db.insert(integrations).values({                    │   │
     * │   │     orgId: "abc-123",                                       │   │
     * │   │     provider: "plaid",                                      │   │
     * │   │     name: "Main Bank Link",                                 │   │
     * │   │     // status not provided → defaults to "disconnected"     │   │
     * │   │   });                                                       │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    status: integrationStatusEnum("status").notNull().default("disconnected"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ statusMessage: text("status_message")                               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ An optional text field for human-readable status details.           │
     * │ Most useful when status is "error" - stores the error message.      │
     * │                                                                     │
     * │ statusMessage:                                                      │
     * │   TypeScript property name. In code: integrations.statusMessage     │
     * │                                                                     │
     * │ text("status_message")                                              │
     * │   Creates a TEXT column named "status_message" in the database.     │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The value CAN be empty (null)                                   │
     * │   - When status is "connected", there's no message needed           │
     * │   - When status is "error", this holds the error details            │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   null (when connected - everything is fine, no message needed)     │
     * │   "Access token expired. Please reconnect."                         │
     * │   "Bank requires re-authentication via Plaid Link."                 │
     * │   "QuickBooks API rate limit exceeded. Will retry in 1 hour."       │
     * │                                                                     │
     * │ This is displayed to users in the UI so they know WHAT went wrong.  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    statusMessage: text("status_message"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ externalAccountId: text("external_account_id")                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The account ID assigned by the EXTERNAL SERVICE (not our system).   │
     * │                                                                     │
     * │ externalAccountId:                                                  │
     * │   TypeScript property name. In code: integrations.externalAccountId │
     * │                                                                     │
     * │ text("external_account_id")                                         │
     * │   Creates a TEXT column named "external_account_id".                │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - Not all providers assign an account ID                          │
     * │   - The ID may only be available after connection is established    │
     * │   - Some providers use different identifiers                        │
     * │                                                                     │
     * │ Example values by provider:                                         │
     * │   Plaid:       null (Plaid uses item_id instead, see below)         │
     * │   QuickBooks:  "4620816365174429250" (Intuit company realm ID)      │
     * │   Salesforce:  "00D5f000004abcD" (Salesforce org ID)                │
     * │   Google Drive: "user@company.com" (Google account identifier)      │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ SECURITY NOTE:                                                  │ │
     * │ │ This is NOT a secret. It's just an identifier - like a          │ │
     * │ │ customer number at a store. Knowing the number doesn't give     │ │
     * │ │ you access to the account. The actual credentials (tokens,      │ │
     * │ │ keys) are stored in the Vault via vault_secret_id.              │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    externalAccountId: text("external_account_id"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ externalItemId: text("external_item_id")                            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A secondary external identifier, used by providers like Plaid.      │
     * │                                                                     │
     * │ externalItemId:                                                     │
     * │   TypeScript property name. In code: integrations.externalItemId    │
     * │                                                                     │
     * │ text("external_item_id")                                            │
     * │   Creates a TEXT column named "external_item_id".                   │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - Only some providers use this concept (mainly Plaid)             │
     * │   - May not be available until after the connection is complete     │
     * │                                                                     │
     * │ WHY DO WE NEED TWO EXTERNAL IDS?                                    │
     * │   Some providers have hierarchical IDs. For example, Plaid:         │
     * │                                                                     │
     * │   Plaid's Data Model:                                               │
     * │     Item (external_item_id)                                         │
     * │       └── Account 1 (one of potentially many accounts)              │
     * │       └── Account 2                                                 │
     * │       └── Account 3                                                 │
     * │                                                                     │
     * │   An "Item" in Plaid represents a single bank LOGIN (e.g., your     │
     * │   Chase login). Under that login, there might be multiple accounts  │
     * │   (checking, savings, credit card). So we store the item_id here    │
     * │   and individual account IDs might go in settings.plaid.accountIds. │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   Plaid:   "item-sand-abc123def456" (Plaid Item ID)                 │
     * │   Others:  null (most providers don't use a second identifier)      │
     * │                                                                     │
     * │ SECURITY NOTE: Same as external_account_id - this is NOT a secret.  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    externalItemId: text("external_item_id"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ lastSyncAt: timestamp("last_sync_at", { withTimezone: true })       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When data was LAST PULLED from the external service.                │
     * │                                                                     │
     * │ lastSyncAt:                                                         │
     * │   TypeScript property name. In code: integrations.lastSyncAt        │
     * │                                                                     │
     * │ timestamp("last_sync_at", { withTimezone: true })                   │
     * │   Creates a TIMESTAMP column with timezone awareness.               │
     * │   See orgs.ts for full explanation of timestamps.                   │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - A brand-new integration has NEVER synced yet                    │
     * │   - null means "no sync has ever happened"                          │
     * │                                                                     │
     * │ NO .defaultNow() because:                                           │
     * │   - We only set this when a sync ACTUALLY happens                   │
     * │   - Creating the integration record is NOT a sync                   │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   null                            (never synced)                    │
     * │   "2024-06-15T14:30:00-05:00"     (last synced June 15 at 2:30 PM) │
     * │                                                                     │
     * │ WHY TRACK THIS?                                                     │
     * │   - Show users "Last synced: 5 minutes ago" in the UI               │
     * │   - Detect stale data: "This hasn't synced in 3 days!"              │
     * │   - For incremental syncs: "Give me all transactions SINCE this     │
     * │     timestamp" (avoids re-downloading everything)                   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ lastSyncStatus: text("last_sync_status")                            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The OUTCOME of the most recent sync attempt.                        │
     * │                                                                     │
     * │ lastSyncStatus:                                                     │
     * │   TypeScript property name. In code: integrations.lastSyncStatus    │
     * │                                                                     │
     * │ text("last_sync_status")                                            │
     * │   Creates a TEXT column named "last_sync_status".                   │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - null means "no sync has ever been attempted"                    │
     * │                                                                     │
     * │ Expected values (convention, not enum-enforced):                    │
     * │   "success"  - Sync completed without errors.                       │
     * │                All data was pulled/pushed successfully.              │
     * │   "partial"  - Sync partially completed.                            │
     * │                Some data was synced but some failed.                 │
     * │                Example: 95 of 100 transactions imported.            │
     * │   "failed"   - Sync completely failed.                              │
     * │                No data was synced. Check syncErrorMessage.           │
     * │                                                                     │
     * │ NOTE: This is a text column, not an enum. This gives us flexibility │
     * │ to add new status values without a database migration.              │
     * │ The tradeoff is less type safety (see provider enum above for       │
     * │ comparison). This is a design choice - sync statuses may evolve     │
     * │ more frequently than providers.                                     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    lastSyncStatus: text("last_sync_status"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ syncErrorMessage: text("sync_error_message")                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Error details from the most recent sync failure.                    │
     * │                                                                     │
     * │ syncErrorMessage:                                                   │
     * │   TypeScript property name. In code: integrations.syncErrorMessage  │
     * │                                                                     │
     * │ text("sync_error_message")                                          │
     * │   Creates a TEXT column named "sync_error_message".                 │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - null when no sync error has occurred                            │
     * │   - Only populated when lastSyncStatus is "failed" or "partial"    │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   null (sync succeeded or never ran)                                │
     * │   "Plaid API returned 401: ITEM_LOGIN_REQUIRED"                     │
     * │   "QuickBooks rate limit exceeded, retry after 2024-06-15T15:00:00" │
     * │   "Connection timeout after 30 seconds"                             │
     * │                                                                     │
     * │ HOW THIS DIFFERS FROM statusMessage:                                │
     * │   statusMessage    = About the CONNECTION status (e.g., token expired)
     * │   syncErrorMessage = About the last SYNC attempt (e.g., API timeout) │
     * │   They can both be populated at the same time.                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    syncErrorMessage: text("sync_error_message"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ settings: jsonb("settings").$type<IntegrationSettings>().default({})│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Provider-specific configuration stored as structured JSON.          │
     * │                                                                     │
     * │ settings:                                                           │
     * │   TypeScript property name. In code: integrations.settings          │
     * │                                                                     │
     * │ jsonb("settings")                                                   │
     * │   Creates a JSONB column named "settings".                          │
     * │   See orgs.ts for full explanation of JSONB.                        │
     * │                                                                     │
     * │   WHY JSONB for settings?                                           │
     * │   Each provider needs DIFFERENT settings. Plaid needs product       │
     * │   types and account IDs. QuickBooks needs a company ID. Salesforce  │
     * │   needs object type mappings. JSONB lets us store all of these      │
     * │   different shapes in one flexible column.                          │
     * │                                                                     │
     * │   Example value:                                                    │
     * │   {                                                                 │
     * │     "plaid": {                                                      │
     * │       "products": ["transactions", "auth"],                         │
     * │       "accountIds": ["acct_001", "acct_002"],                       │
     * │       "webhookUrl": "https://api.lacoda.com/webhooks/plaid"         │
     * │     },                                                              │
     * │     "syncFrequency": "daily"                                        │
     * │   }                                                                 │
     * │                                                                     │
     * │ .$type<IntegrationSettings>()                                       │
     * │   Tells TypeScript what SHAPE the JSON should have.                 │
     * │   IntegrationSettings is defined below - it's a TypeScript          │
     * │   interface with sections for each provider type.                   │
     * │   This gives us autocomplete and type checking!                     │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no settings are provided, use an empty object {}.              │
     * │   Settings can be added later after the integration is connected.   │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ SECURITY REMINDER:                                              │ │
     * │ │ Settings should NEVER contain secrets! Only store configuration │ │
     * │ │ like "which products to sync" or "which folder to upload to".   │ │
     * │ │ API keys, tokens, and passwords go in the Vault (see            │ │
     * │ │ vault_secret_id below).                                         │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    settings: jsonb("settings").$type<IntegrationSettings>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ vaultSecretId: text("vault_secret_id")                              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A REFERENCE (pointer) to the encrypted secret in Supabase Vault.   │
     * │                                                                     │
     * │ vaultSecretId:                                                      │
     * │   TypeScript property name. In code: integrations.vaultSecretId     │
     * │                                                                     │
     * │ text("vault_secret_id")                                             │
     * │   Creates a TEXT column named "vault_secret_id".                    │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - A new integration might not have credentials yet                │
     * │   - Some integrations might not need stored secrets                 │
     * │     (e.g., public API integrations that only need an API key        │
     * │     passed at request time)                                         │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ THIS IS THE MOST SECURITY-CRITICAL COLUMN IN THIS TABLE         │ │
     * │ │                                                                 │ │
     * │ │ WHAT IS SUPABASE VAULT?                                         │ │
     * │ │   Supabase Vault is an encrypted secrets manager built into     │ │
     * │ │   Supabase. It encrypts data at rest using AES-256-GCM.        │ │
     * │ │   Even if someone dumps the database, the secrets are           │ │
     * │ │   unreadable without the decryption key.                        │ │
     * │ │                                                                 │ │
     * │ │ HOW IT WORKS:                                                   │ │
     * │ │                                                                 │ │
     * │ │   1. When a user connects a Plaid integration:                  │ │
     * │ │      - Plaid gives us an access_token: "access-sand-abc123"     │ │
     * │ │                                                                 │ │
     * │ │   2. We store the token in Supabase Vault:                      │ │
     * │ │      SELECT vault.create_secret(                                │ │
     * │ │        '{"access_token": "access-sand-abc123"}',                │ │
     * │ │        'plaid_integration_abc'                                   │ │
     * │ │      );                                                         │ │
     * │ │      → Returns vault_id: "vault-abc-123"                        │ │
     * │ │                                                                 │ │
     * │ │   3. We store ONLY the vault_id in this column:                 │ │
     * │ │      vault_secret_id = "vault-abc-123"                          │ │
     * │ │                                                                 │ │
     * │ │   4. When we need the token later:                              │ │
     * │ │      SELECT decrypted_secret FROM vault.decrypted_secrets       │ │
     * │ │      WHERE id = 'vault-abc-123';                                │ │
     * │ │      → Returns: '{"access_token": "access-sand-abc123"}'        │ │
     * │ │                                                                 │ │
     * │ │ WHY NOT JUST STORE THE TOKEN IN THIS TABLE?                     │ │
     * │ │   - Database backups would contain plaintext tokens             │ │
     * │ │   - SQL injection could expose all tokens at once               │ │
     * │ │   - Admin database access = access to all external services     │ │
     * │ │   - No audit trail of who accessed which secret                 │ │
     * │ │                                                                 │ │
     * │ │ WITH VAULT:                                                     │ │
     * │ │   - Secrets are encrypted even in backups                       │ │
     * │ │   - SQL injection only gets a meaningless vault ID              │ │
     * │ │   - Access requires specific Vault permissions                  │ │
     * │ │   - Vault can log access attempts                               │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   null (no credentials stored yet)                                  │
     * │   "vault-7f3b8c2a-e4d5-4f6a-9b1c-2d3e4f5a6b7c" (Vault secret ID)  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    vaultSecretId: text("vault_secret_id"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ connectedBy: uuid("connected_by")                                   │
     * │              .references(() => users.id, { onDelete: "set null" })  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Which USER set up / connected this integration.                     │
     * │                                                                     │
     * │ connectedBy:                                                        │
     * │   TypeScript property name. In code: integrations.connectedBy       │
     * │                                                                     │
     * │ uuid("connected_by")                                                │
     * │   Creates a UUID column named "connected_by".                       │
     * │   Stores the user's ID (matches a row in the users table).          │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - The connecting user might have been deleted (set to null)       │
     * │   - Some integrations might be set up by system processes           │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ FOREIGN KEY with "set null" onDelete                        │   │
     * │   │                                                             │   │
     * │   │ This is a FK pointing to users.id, BUT with a different     │   │
     * │   │ onDelete behavior than org_id above:                        │   │
     * │   │                                                             │   │
     * │   │ onDelete: "cascade" (used for org_id above):                │   │
     * │   │   Delete the parent → DELETE the child too                  │   │
     * │   │   Delete the org → Delete this integration                  │   │
     * │   │                                                             │   │
     * │   │ onDelete: "set null" (used HERE for connected_by):          │   │
     * │   │   Delete the parent → SET this column to NULL               │   │
     * │   │   Delete the user → connected_by becomes null               │   │
     * │   │   The integration STAYS. We just don't know who set it up.  │   │
     * │   │                                                             │   │
     * │   │ WHY "set null" instead of "cascade"?                        │   │
     * │   │   If an employee leaves the company and their user account  │   │
     * │   │   is deleted, we don't want to DISCONNECT all integrations  │   │
     * │   │   they set up! The Plaid connection should keep working.    │   │
     * │   │   We just lose the record of WHO connected it.              │   │
     * │   │                                                             │   │
     * │   │ See clients.ts for the full explanation of all onDelete     │   │
     * │   │ options (cascade, set null, restrict).                      │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   users table               integrations table                      │
     * │   ┌────────────┐            ┌──────────────────────────┐            │
     * │   │ id (PK)    │◄───────────│ connected_by (FK)        │            │
     * │   │ "alice-id" │            │ "alice-id"               │            │
     * │   └────────────┘            │ provider: "plaid"        │            │
     * │                             └──────────────────────────┘            │
     * │                                                                     │
     * │   If Alice's user is deleted:                                       │
     * │   ┌────────────┐            ┌──────────────────────────┐            │
     * │   │ (deleted)   │            │ connected_by: NULL       │            │
     * │   │             │            │ provider: "plaid"        │ ← STAYS!  │
     * │   └────────────┘            └──────────────────────────┘            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    connectedBy: uuid("connected_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ connectedAt: timestamp("connected_at", { withTimezone: true })      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When the integration was successfully CONNECTED (not created).      │
     * │                                                                     │
     * │ connectedAt:                                                        │
     * │   TypeScript property name. In code: integrations.connectedAt       │
     * │                                                                     │
     * │ timestamp("connected_at", { withTimezone: true })                   │
     * │   Creates a TIMESTAMP column with timezone awareness.               │
     * │   See orgs.ts for full explanation of timestamps.                   │
     * │                                                                     │
     * │ NO .notNull() - this is NULLABLE because:                           │
     * │   - null means the integration hasn't been connected yet            │
     * │   - The record might be created BEFORE the connection is complete   │
     * │                                                                     │
     * │ NO .defaultNow() because:                                           │
     * │   - Creating the record != connecting the integration               │
     * │   - We only set this when the OAuth flow completes successfully     │
     * │                                                                     │
     * │ HOW THIS DIFFERS FROM createdAt:                                    │
     * │   createdAt   = When the integration RECORD was created in our DB   │
     * │   connectedAt = When the external service was actually CONNECTED    │
     * │                                                                     │
     * │   Timeline example:                                                 │
     * │     1. User clicks "Add Plaid"   → record created (createdAt set)   │
     * │     2. User goes through Plaid Link flow...                         │
     * │     3. User completes bank login → connection made (connectedAt set) │
     * │     4. There might be minutes between step 1 and step 3             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    connectedAt: timestamp("connected_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })           │
     * │           .notNull().defaultNow()                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this integration record was first created in our database.      │
     * │ See orgs.ts for full explanation of timestamp, .notNull(),           │
     * │ and .defaultNow().                                                   │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   timestamp(..., { withTimezone: true })                             │
     * │     Stores date, time, AND timezone.                                │
     * │     Example: "2024-06-15T14:30:00-05:00"                            │
     * │                                                                     │
     * │   .notNull()                                                        │
     * │     Every row must have a creation timestamp.                        │
     * │                                                                     │
     * │   .defaultNow()                                                     │
     * │     Automatically set to the current time when the row is inserted. │
     * │     Handled by the database's clock (more reliable than JS).        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })           │
     * │           .notNull().defaultNow().$onUpdate(() => new Date())        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Automatically tracks when this row was last modified.                │
     * │ See orgs.ts for full explanation of $onUpdate.                       │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   Same as createdAt (timestamp, notNull, defaultNow), plus:         │
     * │                                                                     │
     * │   .$onUpdate(() => new Date())                                      │
     * │     AUTOMATICALLY updates this timestamp whenever the row changes.  │
     * │     Handled by Drizzle, not the database itself.                    │
     * │                                                                     │
     * │   EXAMPLE:                                                          │
     * │     1. Integration created at 2:00 PM                               │
     * │        → created_at: 2:00 PM, updated_at: 2:00 PM                  │
     * │     2. Status changes to "connected" at 2:05 PM                     │
     * │        → created_at: 2:00 PM (unchanged)                            │
     * │        → updated_at: 2:05 PM (automatically updated!)               │
     * │     3. Sync completes at 3:00 PM                                    │
     * │        → created_at: 2:00 PM (unchanged)                            │
     * │        → updated_at: 3:00 PM (automatically updated again!)         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },

  // ==================== INDEXES & CONSTRAINTS ====================
  /**
   * (table) => [...]
   *
   * This function returns an array of INDEXES and UNIQUE CONSTRAINTS.
   * See orgs.ts for the full explanation of what indexes are and why we need them.
   *
   * QUICK REFRESHER:
   *   - Index = like the index at the back of a book
   *   - Makes finding specific rows MUCH faster
   *   - Tradeoff: Slightly slower writes (INSERT/UPDATE)
   *   - Only add indexes for columns you frequently search/filter by
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ unique("integrations_org_provider_unique")                          │
     * │   .on(table.orgId, table.provider)                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE UNIQUE CONSTRAINT EXPLAINED:                              │
     * │                                                                     │
     * │ This enforces: "Each org can have at most ONE integration per       │
     * │ provider." The COMBINATION of (org_id + provider) must be unique.   │
     * │                                                                     │
     * │ ALLOWED (different combos):                                         │
     * │   ┌─────────────┬────────────┐                                      │
     * │   │ org_id      │ provider   │                                      │
     * │   ├─────────────┼────────────┤                                      │
     * │   │ "acme-123"  │ "plaid"    │  ← OK: Acme + Plaid (first time)   │
     * │   │ "acme-123"  │ "quickbooks"│ ← OK: Acme + QuickBooks (diff provider)
     * │   │ "best-456"  │ "plaid"    │  ← OK: Best + Plaid (diff org)     │
     * │   └─────────────┴────────────┘                                      │
     * │                                                                     │
     * │ REJECTED (duplicate combo):                                         │
     * │   ┌─────────────┬────────────┐                                      │
     * │   │ org_id      │ provider   │                                      │
     * │   ├─────────────┼────────────┤                                      │
     * │   │ "acme-123"  │ "plaid"    │  ← Already exists!                  │
     * │   │ "acme-123"  │ "plaid"    │  ← DATABASE ERROR: duplicate key    │
     * │   └─────────────┴────────────┘                                      │
     * │                                                                     │
     * │ WHY THIS RULE?                                                      │
     * │   - Prevents confusion: One org doesn't need two Plaid connections  │
     * │   - Simplifies queries: "Get Acme's Plaid integration" returns      │
     * │     exactly one row, not a list                                     │
     * │   - The comment says "(can be relaxed if needed)" - meaning if a    │
     * │     future requirement needs multiple Plaid connections per org,    │
     * │     we can remove this constraint via a migration                   │
     * │                                                                     │
     * │ HOW IS THIS DIFFERENT FROM a single-column .unique()?               │
     * │   .unique() on org_id alone = "each org_id appears only ONCE"       │
     * │     → An org could only have ONE integration total! Too strict.     │
     * │   .unique() on provider alone = "each provider appears only ONCE"   │
     * │     → Only ONE org could use Plaid! Way too strict.                 │
     * │   unique() on (org_id, provider) = "each COMBO appears only ONCE"   │
     * │     → An org can have many integrations, just one per provider.     │
     * │     → Perfect!                                                      │
     * │                                                                     │
     * │ NAMING: "integrations_org_provider_unique" follows the convention:  │
     * │   tablename_column1_column2_unique                                  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    unique("integrations_org_provider_unique").on(table.orgId, table.provider),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("integrations_org_id_idx").on(table.orgId)                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the org_id column.                              │
     * │                                                                     │
     * │ WHY: Every query for integrations will be scoped to an org          │
     * │ (multi-tenant isolation). This is the most common query pattern:    │
     * │                                                                     │
     * │   "Get all integrations for this org"                               │
     * │   SELECT * FROM integrations WHERE org_id = 'abc-123'               │
     * │                                                                     │
     * │ Without this index, the database would scan EVERY row in the        │
     * │ integrations table to find the ones matching org_id = 'abc-123'.    │
     * │ With the index, it finds them instantly.                            │
     * │                                                                     │
     * │ NAMING: tablename_columnname_idx (standard convention)              │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("integrations_org_id_idx").on(table.orgId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("integrations_org_status_idx").on(table.orgId, table.status)  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on TWO columns: org_id AND status.                │
     * │                                                                     │
     * │ WHY: For queries that filter integrations by BOTH org and status.   │
     * │ This is a common pattern in the UI - showing only integrations      │
     * │ that need attention:                                                │
     * │                                                                     │
     * │   "Get all integrations in error state for this org"                │
     * │   SELECT * FROM integrations                                        │
     * │     WHERE org_id = 'abc-123' AND status = 'error'                   │
     * │                                                                     │
     * │   "Get all connected integrations for this org"                     │
     * │   SELECT * FROM integrations                                        │
     * │     WHERE org_id = 'abc-123' AND status = 'connected'               │
     * │                                                                     │
     * │ A single-column index on org_id would find all integrations for     │
     * │ the org, but then would need to scan those results for the status.  │
     * │ This composite index handles BOTH filters in one lookup.            │
     * │                                                                     │
     * │ NAMING: tablename_column1_column2_idx                               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("integrations_org_status_idx").on(table.orgId, table.status),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("integrations_provider_idx").on(table.provider)               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the provider column alone.                      │
     * │                                                                     │
     * │ WHY: For system-wide queries that are NOT scoped to a single org.   │
     * │ Useful for admin/operations tasks:                                  │
     * │                                                                     │
     * │   "How many Plaid integrations exist across all orgs?"              │
     * │   SELECT COUNT(*) FROM integrations WHERE provider = 'plaid'        │
     * │                                                                     │
     * │   "Find all QuickBooks integrations in error state"                 │
     * │   SELECT * FROM integrations                                        │
     * │     WHERE provider = 'quickbooks' AND status = 'error'              │
     * │                                                                     │
     * │ This supports operational monitoring and system-wide dashboards.    │
     * │                                                                     │
     * │ NAMING: tablename_columnname_idx                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("integrations_provider_idx").on(table.provider),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ IntegrationSettings interface                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This defines the SHAPE of the JSON stored in the "settings" column.     │
 * │ See orgs.ts OrgSettings and clients.ts ClientProfile for the same      │
 * │ pattern - a TypeScript interface that describes the JSON structure.      │
 * │                                                                         │
 * │ The "?" after each property means it's OPTIONAL (can be undefined).     │
 * │ Each integration will only use the sections relevant to its provider.   │
 * │ A Plaid integration fills in "plaid", a QuickBooks integration fills    │
 * │ in "accounting", etc.                                                   │
 * │                                                                         │
 * │ WHY ONE BIG INTERFACE instead of separate ones per provider?            │
 * │   - Simpler: One column, one type, one place to look                    │
 * │   - Flexible: Easy to add new provider sections                         │
 * │   - The "?" optionals mean unused sections are just absent, not errors  │
 * │                                                                         │
 * │ EXAMPLE for a Plaid integration:                                        │
 * │   {                                                                     │
 * │     plaid: { products: ["transactions", "auth"], accountIds: ["a1"] },  │
 * │     syncFrequency: "daily",                                             │
 * │     enabledFeatures: ["auto_sync", "webhook_notifications"]             │
 * │   }                                                                     │
 * │                                                                         │
 * │ EXAMPLE for a Salesforce integration:                                   │
 * │   {                                                                     │
 * │     crm: { objectTypes: ["Contact", "Account"], fieldMappings: {...} }, │
 * │     syncFrequency: "hourly"                                             │
 * │   }                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface IntegrationSettings {
  /**
   * plaid?: { ... }
   *
   * Settings specific to the PLAID integration (bank data aggregation).
   * Only populated when provider = "plaid".
   *
   *   products?: string[]
   *     Which Plaid products are enabled for this connection.
   *     Plaid organizes its data by "products" - you subscribe to only
   *     the data types you need.
   *     Example values: ["transactions", "auth", "identity", "assets",
   *                      "investments", "liabilities"]
   *     - "transactions" = bank transaction history
   *     - "auth"         = account and routing numbers
   *     - "identity"     = account holder name/address
   *
   *   accountIds?: string[]
   *     Which specific bank accounts to sync from this Plaid Item.
   *     One bank login might have checking, savings, and credit card.
   *     We might only want to sync checking and savings.
   *     Example: ["acct_001_checking", "acct_002_savings"]
   *
   *   webhookUrl?: string
   *     URL that Plaid should call when new data is available.
   *     Instead of us constantly asking Plaid "any new data?",
   *     Plaid calls OUR server when something changes. This is called
   *     a "webhook" (web + callback).
   *     Example: "https://api.lacoda.com/webhooks/plaid"
   */
  plaid?: {
    products?: string[];
    accountIds?: string[];
    webhookUrl?: string;
  };

  /**
   * accounting?: { ... }
   *
   * Settings for ACCOUNTING integrations (QuickBooks, Xero).
   * Only populated when provider = "quickbooks" or "xero".
   *
   *   companyId?: string
   *     The company/organization ID in the accounting system.
   *     QuickBooks calls this a "Realm ID". Xero calls it a "Tenant ID".
   *     Example: "4620816365174429250"
   *
   *   syncTransactions?: boolean
   *     Whether to sync financial transactions from the accounting system.
   *     true = pull transaction data, false = don't pull transactions.
   *
   *   syncInvoices?: boolean
   *     Whether to sync invoice data from the accounting system.
   *     true = pull invoice data, false = don't pull invoices.
   */
  accounting?: {
    companyId?: string;
    syncTransactions?: boolean;
    syncInvoices?: boolean;
  };

  /**
   * crm?: { ... }
   *
   * Settings for CRM integrations (Salesforce, HubSpot).
   * Only populated when provider = "salesforce" or "hubspot".
   *
   *   objectTypes?: string[]
   *     Which CRM objects (data types) to sync.
   *     CRMs organize data into "objects" - like database tables.
   *     Example: ["Contact", "Account", "Opportunity"]
   *     - "Contact" = individual people
   *     - "Account" = companies/organizations
   *     - "Opportunity" = potential deals
   *
   *   fieldMappings?: Record<string, string>
   *     How OUR fields map to THEIR fields.
   *     Our "displayName" might be their "Name" or "FullName__c".
   *     Example: { "displayName": "Name", "email": "Email" }
   *
   *     Record<string, string> means an object where both keys and
   *     values are strings. Think of it as a lookup/translation table.
   */
  crm?: {
    objectTypes?: string[];
    fieldMappings?: Record<string, string>;
  };

  /**
   * storage?: { ... }
   *
   * Settings for CLOUD STORAGE integrations (Google Drive, Dropbox).
   * Only populated when provider = "google_drive" or "dropbox".
   *
   *   folderId?: string
   *     The specific folder in the cloud storage to sync with.
   *     Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs04OVGerks" (Google Drive)
   *
   *   syncDirection?: "upload" | "download" | "bidirectional"
   *     Which way data flows:
   *     - "upload"        = Our app pushes files TO the cloud
   *     - "download"      = Our app pulls files FROM the cloud
   *     - "bidirectional" = Both directions (two-way sync)
   */
  storage?: {
    folderId?: string;
    syncDirection?: "upload" | "download" | "bidirectional";
  };

  /**
   * syncFrequency?: "realtime" | "hourly" | "daily" | "weekly" | "manual"
   *
   * How often to automatically sync data with the external service.
   * This is a GENERAL setting that applies to all provider types.
   *
   *   "realtime" = Sync immediately when data changes (via webhooks)
   *   "hourly"   = Run a sync job every hour
   *   "daily"    = Run a sync job once per day (usually overnight)
   *   "weekly"   = Run a sync job once per week
   *   "manual"   = Only sync when a user explicitly clicks "Sync Now"
   */
  syncFrequency?: "realtime" | "hourly" | "daily" | "weekly" | "manual";

  /**
   * enabledFeatures?: string[]
   *
   * A list of feature flags enabled for this integration.
   * Allows toggling specific behaviors without changing code.
   * Example: ["auto_sync", "webhook_notifications", "error_alerts"]
   */
  enabledFeatures?: string[];

  /**
   * notes?: string
   *
   * Free-text notes about this integration.
   * Example: "Connected by Alice on Jan 15. Uses sandbox credentials for testing."
   */
  notes?: string;
}

/**
 * Integration Relations (LEAF NODE - No children)
 *
 * Kevin, integrations are simple LEAF NODES.
 * They belong to an org and were set up by a user. That's it.
 * No other table points TO integrations.
 *
 *   ┌──────┐          ┌───────────────┐
 *   │ Org  │ ───────< │ Integrations  │ >─── connectedByUser
 *   │(PK)  │          │ org_id (FK)   │
 *   └──────┘          │ connected_by  │
 *                     └───────────────┘
 *                        (LEAF NODE)
 *                     No one references this table.
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
 *   For each integration:
 *     integration.org             → "Find the ONE org this integration belongs to"
 *                                   SELECT * FROM orgs WHERE id = integration.org_id
 *     integration.connectedByUser → "Find the ONE user who set up this integration"
 *                                   SELECT * FROM users WHERE id = integration.connected_by
 *
 * QUERY EXAMPLE - Get all integrations for an org with who connected them:
 *   const integrations = await db.query.integrations.findMany({
 *     where: eq(integrations.orgId, orgId),
 *     with: {
 *       connectedByUser: true,
 *     },
 *   });
 *   // integrations[0].provider = "plaid"
 *   // integrations[0].status = "connected"
 *   // integrations[0].connectedByUser.fullName = "Alice"
 */
export const integrationsRelations = relations(integrations, ({ one }) => ({
  /**
   * ONE relationship: Integration belongs to ONE Org (REQUIRED)
   * SQL: SELECT * FROM orgs WHERE id = integration.org_id
   */
  org: one(orgs, {
    fields: [integrations.orgId],
    references: [orgs.id],
  }),

  /**
   * ONE relationship: Integration was set up by ONE User (OPTIONAL)
   *
   * "Who connected this integration?"
   * Optional because the user may have been deleted (onDelete: "set null").
   * SQL: SELECT * FROM users WHERE id = integration.connected_by
   */
  connectedByUser: one(users, {
    fields: [integrations.connectedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Integration = typeof integrations.$inferSelect
 *
 * Creates a TypeScript type representing an INTEGRATION ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 * See orgs.ts for full explanation of $inferSelect.
 *
 * WHAT THIS TYPE LOOKS LIKE (roughly):
 *   {
 *     id: string;
 *     orgId: string;
 *     provider: "plaid" | "quickbooks" | ...;
 *     name: string;
 *     status: "connected" | "disconnected" | "error" | "pending";
 *     statusMessage: string | null;
 *     externalAccountId: string | null;
 *     externalItemId: string | null;
 *     lastSyncAt: Date | null;
 *     lastSyncStatus: string | null;
 *     syncErrorMessage: string | null;
 *     settings: IntegrationSettings;
 *     vaultSecretId: string | null;
 *     connectedBy: string | null;
 *     connectedAt: Date | null;
 *     createdAt: Date;
 *     updatedAt: Date;
 *   }
 *
 * USAGE:
 *   const integration: Integration = await db.query.integrations.findFirst();
 *   integration.provider     // TypeScript knows: "plaid" | "quickbooks" | ...
 *   integration.status       // TypeScript knows: "connected" | "disconnected" | ...
 *   integration.settings     // TypeScript knows: IntegrationSettings
 *   integration.vaultSecretId // TypeScript knows: string | null
 */
export type Integration = typeof integrations.$inferSelect;

/**
 * export type NewIntegration = typeof integrations.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new integration.
 * Some fields are optional (have defaults), so this type reflects that.
 * See orgs.ts for full explanation of $inferInsert.
 *
 * USAGE:
 *   const newIntegration: NewIntegration = {
 *     orgId: "abc-123",              // Required (FK to orgs)
 *     provider: "plaid",             // Required (enum value)
 *     name: "Main Bank Connection",  // Required (display name)
 *     // status defaults to "disconnected"
 *     // settings defaults to {}
 *     // id, createdAt, updatedAt are auto-generated
 *     // all other fields are optional (nullable)
 *   };
 *   await db.insert(integrations).values(newIntegration);
 */
export type NewIntegration = typeof integrations.$inferInsert;
