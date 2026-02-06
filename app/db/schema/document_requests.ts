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
 * WHY:  We use this to tell Drizzle HOW tables connect to each other
 *       so we can do queries like "get a document request AND the user
 *       who created it" in one go.
 * WHERE: "drizzle-orm" is an npm package (lives in node_modules).
 *
 * See clients.ts for full explanation of relations.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each import is a building block for creating a database table.
 *
 * Quick summary of each (see clients.ts for full explanation):
 *
 * pgTable   = Function to create a new database table.
 *             Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *
 * uuid      = Column type for UUIDs (Universally Unique Identifier).
 *             A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *             It's a random 36-character string that's practically impossible
 *             to duplicate, making it ideal for IDs in distributed systems.
 *
 * text      = Column type for text/strings of any length.
 *             Examples: "2023 Tax Return", "john@email.com"
 *
 * timestamp = Column type for dates and times.
 *             We use { withTimezone: true } so we also store the timezone.
 *             Example: "2024-06-15T14:30:00+05:00"
 *
 * jsonb     = Column type for JSON data stored in binary format.
 *             Allows flexible, structured data like:
 *             { "remindersSent": 3, "tags": ["urgent", "tax"] }
 *             The "b" means "binary" - PostgreSQL stores it efficiently
 *             and can index/query inside it.
 *
 * index     = Function to create database indexes (like a book index -
 *             makes lookups fast). See the INDEXES section below.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/**
 * import { documentRequestStatusEnum, taskPriorityEnum } from "./00_enums"
 *
 * WHAT: Imports two PostgreSQL ENUM types defined in the centralized enums file.
 * WHY:  Enums restrict a column to a fixed set of allowed values.
 *       The database will REJECT any value not in the list.
 *
 * documentRequestStatusEnum:
 *   Allowed values: "open" | "fulfilled" | "cancelled" | "overdue"
 *   Controls the lifecycle of a document request.
 *   Example: A request starts as "open", then becomes "fulfilled" when
 *   the client uploads the document.
 *
 * taskPriorityEnum:
 *   Allowed values: "low" | "medium" | "high" | "urgent"
 *   We reuse the same priority levels from tasks for document requests
 *   because urgency works the same way across both features.
 *
 * WHERE: "./00_enums" is the centralized enums file.
 *        The "00_" prefix ensures it loads first (alphabetical ordering).
 *        See 00_enums.ts for full explanation of PostgreSQL enums.
 */
import { documentRequestStatusEnum, taskPriorityEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition.
 * WHY:  We need to create a Foreign Key from document_requests.org_id → orgs.id.
 *       Every document request MUST belong to an org (multi-tenant isolation).
 * WHERE: "./orgs" means same directory → app/db/schema/orgs.ts
 *
 * See clients.ts for full explanation of the orgs import.
 */
import { orgs } from "./orgs";

/**
 * import { clients } from "./clients"
 *
 * WHAT: Imports the clients table definition.
 * WHY:  A document request can OPTIONALLY be linked to a specific client.
 *       We need clients.id to create the Foreign Key reference.
 * WHERE: "./clients" → app/db/schema/clients.ts
 */
import { clients } from "./clients";

/**
 * import { entities } from "./entities"
 *
 * WHAT: Imports the entities table definition.
 * WHY:  A document request can OPTIONALLY be linked to a specific entity
 *       (like "Smith Family Trust" or "Doe LLC"). We reference entities.id.
 * WHERE: "./entities" → app/db/schema/entities.ts
 */
import { entities } from "./entities";

/**
 * import { assets } from "./assets"
 *
 * WHAT: Imports the assets table definition.
 * WHY:  A document request can OPTIONALLY be linked to a specific asset
 *       (like "123 Main Street" property). We reference assets.id.
 * WHERE: "./assets" → app/db/schema/assets.ts
 */
import { assets } from "./assets";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition.
 * WHY:  Document requests have TWO relationships to the users table:
 *         1. requested_by → WHO created this request (the assistant)
 *         2. assigned_to  → WHO should provide the document (often the client)
 *       Both columns reference users.id. Having TWO Foreign Keys pointing to
 *       the SAME table is a common pattern when the same type of record
 *       plays different ROLES. See the "TWO FKs TO SAME TABLE" section below.
 * WHERE: "./users" → app/db/schema/users.ts
 */
import { users } from "./users";

/**
 * ============================================================================
 * DOCUMENT REQUESTS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this table tracks requests for MISSING documents. Think of it as a
 * to-do list specifically for paperwork that hasn't been provided yet.
 *
 * WHY THIS TABLE EXISTS:
 *   In wealth management, you constantly need documents from clients:
 *   tax returns, trust agreements, insurance policies, property deeds, etc.
 *   Instead of emailing back and forth, this table creates a formal,
 *   trackable system for requesting and fulfilling documents.
 *
 * REAL-WORLD EXAMPLES:
 *   - Onboarding a new client: "We need your 2023 W-2, trust documents,
 *     and proof of address" → 3 document request rows
 *   - Annual tax season: "Please upload your 2024 1099-B" → 1 request
 *   - Compliance audit: "Driver's license has expired, need a new copy"
 *
 * THE WORKFLOW (request lifecycle):
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  1. CREATE   → Assistant creates a request (status = "open")      │
 *   │               Title: "2023 Tax Return"                            │
 *   │               Assigned to: John Smith (the client)                │
 *   │               Due date: March 15, 2024                            │
 *   │                                                                   │
 *   │  2. NOTIFY   → Client sees it in their portal dashboard           │
 *   │               System may send email reminders                     │
 *   │                                                                   │
 *   │  3. UPLOAD   → Client uploads the document                        │
 *   │               (Creates a row in the documents table)              │
 *   │                                                                   │
 *   │  4. FULFILL  → Assistant marks the request as "fulfilled"         │
 *   │               Links to the uploaded document via                   │
 *   │               fulfilled_document_id                               │
 *   │               Sets fulfilled_at timestamp                         │
 *   │                                                                   │
 *   │  ALTERNATE:                                                       │
 *   │  - CANCEL    → Request no longer needed (status = "cancelled")    │
 *   │  - OVERDUE   → Past due_date, still open (status = "overdue")    │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * POLYMORPHIC LINKING PATTERN:
 *   This table uses the same "optional multi-level linking" pattern as the
 *   documents table. A request can be linked to:
 *     - Just a client:              "Get John's tax return"
 *     - A client + entity:          "Get the trust agreement for Smith Trust"
 *     - A client + entity + asset:  "Get the appraisal for 123 Main St"
 *   All three FK columns (clientId, entityId, assetId) are OPTIONAL (nullable).
 *   This flexibility lets one table serve all levels of the hierarchy.
 *
 * TWO FKs TO THE SAME TABLE:
 *   Both requested_by and assigned_to point to users.id, but they represent
 *   different ROLES:
 *     requested_by = "Who ASKED for this document?" (usually an assistant)
 *     assigned_to  = "Who SHOULD PROVIDE it?" (usually the client)
 *   This is a very common database pattern when the same entity type
 *   appears in multiple roles within one record.
 */

/**
 * export const documentRequests = pgTable(...)
 *
 * BREAKDOWN:
 *   export   = Makes this available for other files to import
 *   const    = Declares a constant (value that won't change)
 *   documentRequests = The name we use in TypeScript code
 *   pgTable  = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "document_requests" = The actual table name in the database
 *   2. { columns }         = An object defining all the columns
 *   3. (table) => []       = A function that returns an array of indexes
 */
export const documentRequests = pgTable(
  "document_requests", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The PRIMARY KEY for this table - uniquely identifies each           │
     * │ document request.                                                   │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" with type UUID.                       │
     * │   Example value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"            │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Marks this as THE unique identifier for each row.                 │
     * │   Rules: UNIQUE + NOT NULL + should never change.                   │
     * │   See clients.ts for full explanation of Primary Keys.              │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   PostgreSQL auto-generates a random UUID when you insert a row     │
     * │   without providing an id. You never have to create IDs manually.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull()                                     │
     * │          .references(() => orgs.id, { onDelete: "cascade" })        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A REQUIRED Foreign Key linking this request to an org.        │
     * │                                                                     │
     * │ WHY: Multi-tenant isolation. Every document request belongs to      │
     * │ exactly ONE organization. When you query requests, you ALWAYS       │
     * │ filter by org_id first, so Org A can never see Org B's requests.    │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" storing a UUID value.             │
     * │   TypeScript property name is orgId (camelCase).                    │
     * │   Database column name is org_id (snake_case).                      │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every request MUST belong to an org. Cannot be empty.             │
     * │   If you try: INSERT INTO document_requests (title) VALUES ('...')  │
     * │   → DATABASE ERROR: "org_id cannot be null"                         │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   FOREIGN KEY: The value in org_id MUST exist in orgs.id.           │
     * │   onDelete: "cascade" = If the org is deleted, all its document     │
     * │   requests are automatically deleted too.                           │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   orgs table                  document_requests table               │
     * │   ┌────────────┐              ┌─────────────────────┐               │
     * │   │ id (PK)    │◄─────────────│ org_id (FK)         │               │
     * │   │ "abc-123"  │              │ "abc-123"           │               │
     * │   └────────────┘              │ title               │               │
     * │                               │ status              │               │
     * │                               └─────────────────────┘               │
     * │                                                                     │
     * │ See clients.ts for full explanation of Foreign Keys and onDelete.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Required: org for tenant isolation
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id")                                         │
     * │             .references(() => clients.id, { onDelete: "cascade" })  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: An OPTIONAL Foreign Key linking this request to a client.     │
     * │                                                                     │
     * │ WHY: Most document requests are for a specific client, like         │
     * │ "We need John Smith's 2023 tax return." But sometimes a request     │
     * │ may be org-level (not tied to any one client), so this is optional. │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────┐     │
     * │ │ POLYMORPHIC LINKING PATTERN (Part 1 of 3):                  │     │
     * │ │                                                             │     │
     * │ │ This table has THREE optional FKs: clientId, entityId,      │     │
     * │ │ and assetId. They let you link a request at ANY level       │     │
     * │ │ of the hierarchy:                                           │     │
     * │ │                                                             │     │
     * │ │   Level 1 (client only):                                    │     │
     * │ │     clientId = "john-uuid", entityId = NULL, assetId = NULL │     │
     * │ │     → "Get John's tax return"                               │     │
     * │ │                                                             │     │
     * │ │   Level 2 (client + entity):                                │     │
     * │ │     clientId = "john-uuid", entityId = "trust-uuid",        │     │
     * │ │     assetId = NULL                                          │     │
     * │ │     → "Get the trust agreement for Smith Family Trust"      │     │
     * │ │                                                             │     │
     * │ │   Level 3 (client + entity + asset):                        │     │
     * │ │     clientId = "john-uuid", entityId = "trust-uuid",        │     │
     * │ │     assetId = "property-uuid"                               │     │
     * │ │     → "Get the appraisal for 123 Main St"                   │     │
     * │ │                                                             │     │
     * │ │ This pattern avoids needing separate tables for each level. │     │
     * │ └─────────────────────────────────────────────────────────────┘     │
     * │                                                                     │
     * │ NO .notNull() = This column is NULLABLE (optional).                 │
     * │ The value CAN be empty (null) if the request isn't tied to          │
     * │ a specific client.                                                  │
     * │                                                                     │
     * │ .references(() => clients.id, { onDelete: "cascade" })              │
     * │   FK: Value must exist in clients.id.                               │
     * │   onDelete: "cascade" = If the client is deleted, their document    │
     * │   requests are deleted too. Makes sense because the requests are    │
     * │   meaningless without the client they were for.                     │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   clients table               document_requests table               │
     * │   ┌────────────┐              ┌──────────────────────┐              │
     * │   │ id (PK)    │◄── ── ── ── │ client_id (FK)       │              │
     * │   │ "john-123" │   optional   │ "john-123" or NULL   │              │
     * │   └────────────┘              └──────────────────────┘              │
     * │   (dashed arrow = optional relationship)                            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Optional: what the document is for
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ entityId: uuid("entity_id")                                         │
     * │             .references(() => entities.id, { onDelete: "set null" })│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: An OPTIONAL Foreign Key linking this request to an entity.    │
     * │                                                                     │
     * │ WHY: Some documents are specific to a legal entity, not just the    │
     * │ client. Example: "We need the operating agreement for Smith LLC"    │
     * │ (Polymorphic Linking Pattern - Part 2 of 3, see clientId above)    │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE. Only set when the request targets a       │
     * │ specific entity.                                                    │
     * │                                                                     │
     * │ .references(() => entities.id, { onDelete: "set null" })            │
     * │   FK: Value must exist in entities.id.                              │
     * │   onDelete: "set null" = If the entity is deleted, this column      │
     * │   becomes NULL instead of deleting the request.                     │
     * │                                                                     │
     * │   WHY "set null" instead of "cascade"?                              │
     * │   The request might still be relevant even if the entity was        │
     * │   reorganized/deleted. The request stays as an orphan record        │
     * │   so the team knows a document was once requested.                  │
     * │   Compare: clientId uses "cascade" because without the client,      │
     * │   the entire request is meaningless.                                │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   entities table              document_requests table               │
     * │   ┌────────────┐              ┌──────────────────────┐              │
     * │   │ id (PK)    │◄── ── ── ── │ entity_id (FK)       │              │
     * │   │ "trust-1"  │   optional   │ "trust-1" or NULL    │              │
     * │   └────────────┘              └──────────────────────┘              │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assetId: uuid("asset_id")                                           │
     * │            .references(() => assets.id, { onDelete: "set null" })   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: An OPTIONAL Foreign Key linking this request to an asset.     │
     * │                                                                     │
     * │ WHY: Some documents are specific to an individual asset.            │
     * │ Example: "We need the property appraisal for 123 Main Street"      │
     * │ (Polymorphic Linking Pattern - Part 3 of 3, see clientId above)    │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE. Only set when the request targets a       │
     * │ specific asset. Most requests won't go this deep in the hierarchy.  │
     * │                                                                     │
     * │ .references(() => assets.id, { onDelete: "set null" })              │
     * │   FK: Value must exist in assets.id.                                │
     * │   onDelete: "set null" = If the asset is deleted (sold, etc.),      │
     * │   this column becomes NULL rather than deleting the request.         │
     * │   Same reasoning as entityId - keep the record for history.         │
     * │                                                                     │
     * │ VISUAL (full polymorphic picture):                                  │
     * │                                                                     │
     * │   clients ◄── ── client_id (cascade)                                │
     * │   entities ◄── ── entity_id (set null)   document_requests          │
     * │   assets ◄── ── asset_id (set null)                                 │
     * │                                                                     │
     * │   Any combination of these three can be set or NULL.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ title: text("title").notNull()                                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A short, human-readable name for the document being           │
     * │ requested.                                                          │
     * │                                                                     │
     * │ WHY: This is what the client sees in their portal. It should be     │
     * │ clear enough that they know exactly what to upload.                 │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "2023 Tax Return"                                                 │
     * │   "Trust Agreement - Smith Family Trust"                            │
     * │   "Proof of Insurance - 123 Main St"                                │
     * │   "Driver's License (renewed)"                                      │
     * │                                                                     │
     * │ text("title")                                                       │
     * │   Creates a text column named "title". Can hold any length string.  │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every request MUST have a title. You can't request a document     │
     * │   without saying what it is!                                        │
     * │   If you try: INSERT INTO document_requests (org_id) VALUES ('...')  │
     * │   → DATABASE ERROR: "title cannot be null"                          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Request details
    title: text("title").notNull(), // e.g., "2023 Tax Return"

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ description: text("description")                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Additional context or instructions about the request.         │
     * │                                                                     │
     * │ WHY: Sometimes a title isn't enough. The description provides       │
     * │ extra detail so the client knows exactly what's needed.             │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "Please upload the full federal return including all schedules."  │
     * │   "We need pages 1-3 only. Make sure signatures are visible."      │
     * │   "This is for the property at 123 Main St, Apt 4B."              │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE (optional). Many requests are clear       │
     * │ enough from the title alone and don't need a description.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    description: text("description"), // Additional context

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ documentType: text("document_type")                                 │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The expected category/type of document being requested.       │
     * │                                                                     │
     * │ WHY: Helps with organization and filtering. When the document is    │
     * │ eventually uploaded, this hints at what document_type to set on     │
     * │ the documents table row. It also helps the client portal display    │
     * │ the right upload form or instructions.                              │
     * │                                                                     │
     * │ Examples: "tax_return", "trust_agreement", "insurance_policy",      │
     * │           "identification", "property_deed", "bank_statement"       │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE (optional). Not all requests need a type  │
     * │ classification - sometimes you just need "a document."              │
     * │                                                                     │
     * │ NOTE: This is a free-text field, not an enum. This allows           │
     * │ flexibility for any document type without needing a database         │
     * │ migration to add new types.                                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    documentType: text("document_type"), // Expected document type

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: documentRequestStatusEnum("status")                         │
     * │           .notNull().default("open")                                │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The current lifecycle state of this document request.          │
     * │                                                                     │
     * │ WHY: Tracks where the request is in the workflow. The UI uses       │
     * │ this to show open vs. completed requests, and background jobs       │
     * │ use it to find overdue requests.                                    │
     * │                                                                     │
     * │ documentRequestStatusEnum("status")                                 │
     * │   Uses a PostgreSQL ENUM type (defined in 00_enums.ts).             │
     * │   Allowed values:                                                   │
     * │                                                                     │
     * │   "open"      → Request is active, awaiting the document.           │
     * │                  The client portal shows this as "pending."          │
     * │   "fulfilled" → The document has been provided and linked.          │
     * │                  Set when an assistant marks the request complete.   │
     * │   "cancelled" → Request was cancelled (no longer needed).           │
     * │                  Example: duplicate request, or client left.        │
     * │   "overdue"   → Past the due_date and still not fulfilled.          │
     * │                  A background job typically updates this.            │
     * │                                                                     │
     * │   LIFECYCLE:                                                        │
     * │     open ──→ fulfilled    (happy path)                              │
     * │     open ──→ cancelled    (no longer needed)                        │
     * │     open ──→ overdue      (past due date)                           │
     * │     overdue ──→ fulfilled (late but still completed)                │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every request MUST have a status. Can't be empty.                 │
     * │                                                                     │
     * │ .default("open")                                                    │
     * │   If you don't specify a status when inserting, it defaults to      │
     * │   "open". Makes sense: new requests start as open.                  │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Find all open requests in this org"                              │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE org_id = 'abc-123' AND status = 'open'                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Request management
    status: documentRequestStatusEnum("status").notNull().default("open"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ priority: taskPriorityEnum("priority").notNull().default("medium")  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: How urgent this document request is.                          │
     * │                                                                     │
     * │ WHY: Not all requests are equally important. A "Driver's License    │
     * │ expired" for a compliance deadline is "urgent", while a "nice to    │
     * │ have" reference letter is "low".                                    │
     * │                                                                     │
     * │ taskPriorityEnum("priority")                                        │
     * │   Reuses the same enum as the tasks table (defined in 00_enums.ts).│
     * │   Allowed values: "low" | "medium" | "high" | "urgent"             │
     * │                                                                     │
     * │   "low"    → Nice to have, no deadline pressure.                    │
     * │   "medium" → Standard request, should be done in reasonable time.   │
     * │   "high"   → Important, needs attention soon.                       │
     * │   "urgent" → Critical, compliance or legal deadline at risk.        │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every request MUST have a priority. Can't be empty.               │
     * │                                                                     │
     * │ .default("medium")                                                  │
     * │   If not specified, defaults to "medium". Most requests are         │
     * │   standard priority.                                                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    priority: taskPriorityEnum("priority").notNull().default("medium"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ dueDate: timestamp("due_date", { withTimezone: true })              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The deadline by which this document should be provided.        │
     * │                                                                     │
     * │ WHY: Many document requests have real deadlines:                    │
     * │   - Tax filing deadline: April 15                                   │
     * │   - Insurance renewal: policy expiration date                       │
     * │   - Compliance audit: regulatory deadline                           │
     * │ The system uses this to identify overdue requests and send          │
     * │ reminder notifications.                                             │
     * │                                                                     │
     * │ timestamp("due_date", { withTimezone: true })                       │
     * │   Stores a date/time with timezone info.                            │
     * │   Example: "2024-04-15T23:59:59+00:00" (tax day, end of day UTC)   │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE (optional). Not every request has a        │
     * │ hard deadline. "Upload your headshot for the team page" has no      │
     * │ due date.                                                           │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Find requests that are past due and still open"                  │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE due_date < NOW() AND status = 'open'                      │
     * │   (NOW() returns the current date/time in SQL)                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    dueDate: timestamp("due_date", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ requestedBy: uuid("requested_by")                                   │
     * │                .references(() => users.id, { onDelete: "set null" })│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The user who CREATED this document request.                   │
     * │                                                                     │
     * │ WHY: Accountability tracking. You need to know WHO asked for this   │
     * │ document. Typically this is a wealth management assistant or admin.  │
     * │ Example: "Sarah (admin) requested John's 2023 tax return."          │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────┐     │
     * │ │ TWO FKs TO THE SAME TABLE (Part 1 of 2):                    │     │
     * │ │                                                             │     │
     * │ │ Both requested_by AND assigned_to point to users.id.        │     │
     * │ │ This is perfectly valid! They represent DIFFERENT ROLES:     │     │
     * │ │                                                             │     │
     * │ │   requested_by → "Who ASKED for this document?"             │     │
     * │ │                   (the person who created the request)       │     │
     * │ │                                                             │     │
     * │ │   assigned_to  → "Who should PROVIDE this document?"        │     │
     * │ │                   (the person responsible for uploading)     │     │
     * │ │                                                             │     │
     * │ │ Think of it like a letter:                                  │     │
     * │ │   FROM: requested_by (sender = who wrote the request)       │     │
     * │ │   TO:   assigned_to  (recipient = who must act on it)       │     │
     * │ │                                                             │     │
     * │ │ VISUAL:                                                     │     │
     * │ │                                                             │     │
     * │ │   users table          document_requests table              │     │
     * │ │   ┌────────────┐       ┌───────────────────────┐            │     │
     * │ │   │ id (PK)    │◄──────│ requested_by (FK)     │            │     │
     * │ │   │            │       │   "Who asked?"        │            │     │
     * │ │   │ "sarah-1"  │       │   = "sarah-1"         │            │     │
     * │ │   │ "john-2"   │       │                       │            │     │
     * │ │   │            │◄──────│ assigned_to (FK)      │            │     │
     * │ │   │            │       │   "Who provides?"     │            │     │
     * │ │   │            │       │   = "john-2"          │            │     │
     * │ │   └────────────┘       └───────────────────────┘            │     │
     * │ │        ▲                                                    │     │
     * │ │   SAME table!          TWO arrows to it!                    │     │
     * │ │                                                             │     │
     * │ │ In Drizzle relations (see below), we handle this by giving  │     │
     * │ │ each relation a UNIQUE NAME:                                │     │
     * │ │   requestedByUser: one(users, { fields: [requestedBy] })    │     │
     * │ │   assignedToUser:  one(users, { fields: [assignedTo] })     │     │
     * │ │ Without unique names, Drizzle wouldn't know which FK maps   │     │
     * │ │ to which relation.                                          │     │
     * │ └─────────────────────────────────────────────────────────────┘     │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE. Optional because the requesting user     │
     * │ might be deleted, or the request might be system-generated.         │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   FK: Value must exist in users.id.                                 │
     * │   onDelete: "set null" = If the user who created the request is     │
     * │   deleted, this column becomes NULL. The request itself survives    │
     * │   because it's still relevant - we just lose track of who asked.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Responsibility tracking
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assignedTo: uuid("assigned_to")                                     │
     * │               .references(() => users.id, { onDelete: "set null" }) │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The user who is RESPONSIBLE for providing this document.       │
     * │                                                                     │
     * │ WHY: Someone needs to be accountable for fulfilling the request.    │
     * │ This is usually the client (who uploads via the portal) or an       │
     * │ assistant who gathers the document on the client's behalf.          │
     * │                                                                     │
     * │ (TWO FKs TO THE SAME TABLE - Part 2 of 2, see requestedBy above)  │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   - Client John is assigned to upload his own tax return            │
     * │   - Assistant Sarah is assigned to get the trust docs from          │
     * │     the client's attorney                                           │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE. Optional because not every request        │
     * │ has a specific assignee yet. It might be unassigned initially       │
     * │ and assigned later.                                                 │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   FK: Value must exist in users.id.                                 │
     * │   onDelete: "set null" = If the assigned user is deleted, set       │
     * │   this to NULL. The request survives but needs to be reassigned.    │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Find all open requests assigned to me"                           │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE assigned_to = 'my-user-id' AND status = 'open'            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ fulfilledAt: timestamp("fulfilled_at", { withTimezone: true })       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date/time when this request was fulfilled (document was   │
     * │ provided).                                                          │
     * │                                                                     │
     * │ WHY: Records when the request was completed. Useful for:            │
     * │   - Reporting: "How long does it take clients to provide docs?"     │
     * │   - Auditing: "When was the trust agreement actually received?"     │
     * │   - SLAs: "Was the document provided within 30 days?"              │
     * │                                                                     │
     * │ timestamp("fulfilled_at", { withTimezone: true })                   │
     * │   Stores date + time + timezone.                                    │
     * │   Example: "2024-03-10T14:22:00+00:00"                             │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE. Starts as NULL when the request is        │
     * │ created, and gets set when the request is fulfilled.                │
     * │ If status = "open", this will be NULL.                              │
     * │ If status = "fulfilled", this should have a value.                  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Resolution
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ fulfilledDocumentId: uuid("fulfilled_document_id")                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A UUID pointing to the document that fulfilled this request.  │
     * │                                                                     │
     * │ WHY: When a client uploads a document to fulfill a request, we      │
     * │ want to LINK the request to the actual document. This closes        │
     * │ the loop: "This request was answered by THAT uploaded document."    │
     * │                                                                     │
     * │ Example workflow:                                                   │
     * │   1. Request: "Upload 2023 Tax Return" (fulfilledDocumentId = NULL) │
     * │   2. Client uploads "2023_tax_return.pdf" → documents table row     │
     * │      gets id = "doc-xyz-789"                                        │
     * │   3. Assistant marks fulfilled:                                      │
     * │      fulfilledDocumentId = "doc-xyz-789"                            │
     * │      fulfilledAt = now()                                            │
     * │      status = "fulfilled"                                           │
     * │                                                                     │
     * │ NO .notNull() = NULLABLE. Starts as NULL, gets set upon             │
     * │ fulfillment.                                                        │
     * │                                                                     │
     * │ NOTE: This is NOT a formal .references() Foreign Key. It's a       │
     * │ "soft reference" - the application code manages the link.           │
     * │ This avoids circular dependency issues since the documents table    │
     * │ might also reference this table.                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    fulfilledDocumentId: uuid("fulfilled_document_id"), // Link to uploaded doc

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ metadata: jsonb("metadata")                                         │
     * │            .$type<DocumentRequestMetadata>().default({})             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A flexible JSON column for extra data that doesn't warrant    │
     * │ its own column.                                                     │
     * │                                                                     │
     * │ WHY: Some data is useful but not frequently queried or doesn't      │
     * │ fit neatly into a fixed column. Instead of adding a column for      │
     * │ every little thing, we stuff it into a JSON "catch-all" column.     │
     * │                                                                     │
     * │ jsonb("metadata")                                                   │
     * │   Creates a JSONB column named "metadata" in the database.          │
     * │   JSONB = JSON stored in binary format (fast to query).             │
     * │   See clients.ts for full explanation of JSONB.                     │
     * │                                                                     │
     * │ .$type<DocumentRequestMetadata>()                                   │
     * │   Tells TypeScript what shape this JSON should have.                │
     * │   DocumentRequestMetadata is defined below.                         │
     * │   This gives us autocomplete:                                       │
     * │     request.metadata.remindersSent  // TypeScript knows this exists │
     * │     request.metadata.foo            // TypeScript ERROR: no "foo"   │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no metadata is provided when inserting, use an empty object.   │
     * │   So metadata is never NULL - at worst it's {}.                     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Additional metadata
    metadata: jsonb("metadata").$type<DocumentRequestMetadata>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })           │
     * │             .notNull().defaultNow()                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date/time when this document request was created.          │
     * │                                                                     │
     * │ WHY: Every record should know when it was born. Used for:           │
     * │   - Sorting: "Show newest requests first"                           │
     * │   - Reporting: "How many requests were created this month?"         │
     * │   - Auditing: "When was this request originally made?"             │
     * │                                                                     │
     * │ .notNull() = Every row must have this. Cannot be empty.             │
     * │ .defaultNow() = Auto-set to current time on insert.                 │
     * │                                                                     │
     * │ See clients.ts for full explanation of timestamp columns.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Standard timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })           │
     * │             .notNull().defaultNow().$onUpdate(() => new Date())      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date/time when this document request was last modified.    │
     * │                                                                     │
     * │ WHY: Tracks the freshness of a record. If a request's status was   │
     * │ changed from "open" to "fulfilled", updatedAt shows WHEN that       │
     * │ happened.                                                           │
     * │                                                                     │
     * │ .notNull() = Every row must have this. Cannot be empty.             │
     * │ .defaultNow() = Auto-set to current time on insert.                 │
     * │ .$onUpdate(() => new Date()) = Drizzle automatically updates this   │
     * │   to the current time whenever the row is modified via Drizzle.     │
     * │   NOTE: This is a Drizzle-level feature, NOT a database trigger.    │
     * │   Direct SQL updates won't trigger this.                            │
     * │                                                                     │
     * │ See clients.ts for full explanation of $onUpdate.                   │
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
   * This function receives the table and returns an array of INDEXES.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ WHAT IS AN INDEX? (Quick refresher - see clients.ts for full)      │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ An index is like the index at the back of a textbook.              │
   * │ Without it, finding data means scanning EVERY row (slow).          │
   * │ With it, the database jumps directly to matching rows (fast).      │
   * │                                                                     │
   * │ TRADEOFF:                                                          │
   * │ - Indexes make READS faster (SELECT queries)                       │
   * │ - Indexes make WRITES slower (INSERT/UPDATE must update the index) │
   * │ - Only add indexes for columns you frequently search/filter by     │
   * │                                                                     │
   * │ This table has 5 indexes for the most common query patterns.       │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("document_requests_org_id_idx").on(table.orgId)               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Index on the org_id column alone.                             │
     * │                                                                     │
     * │ WHY: EVERY query in a multi-tenant app starts with                  │
     * │ "WHERE org_id = ?" to isolate data by organization.                │
     * │ This is the most fundamental index in the table.                   │
     * │                                                                     │
     * │ QUERY PATTERN:                                                      │
     * │   SELECT * FROM document_requests WHERE org_id = 'abc-123'          │
     * │   → "Get ALL document requests in this org"                         │
     * │                                                                     │
     * │ Without this index: Database scans every row. Slow.                 │
     * │ With this index: Database jumps to matching org rows. Fast.         │
     * │                                                                     │
     * │ NAMING: table_column_idx is a common convention.                    │
     * │         "document_requests" + "org_id" + "idx"                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Org-scoped queries
    index("document_requests_org_id_idx").on(table.orgId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("document_requests_org_client_idx")                           │
     * │   .on(table.orgId, table.clientId)                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A COMPOSITE INDEX on TWO columns: org_id AND client_id.       │
     * │                                                                     │
     * │ WHY: The most common query is "show me all document requests        │
     * │ for a specific client within an org." This index makes that fast.   │
     * │                                                                     │
     * │ QUERY PATTERN:                                                      │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE org_id = 'abc-123' AND client_id = 'john-456'             │
     * │   → "Get all requests for John in this org"                         │
     * │                                                                     │
     * │ COMPOSITE INDEX = an index on multiple columns together.            │
     * │ The order matters! (org_id, client_id) is optimized for queries     │
     * │ that filter by org FIRST, then by client.                           │
     * │ See clients.ts for full explanation of composite indexes.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find requests for a client
    index("document_requests_org_client_idx").on(table.orgId, table.clientId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("document_requests_org_status_idx")                           │
     * │   .on(table.orgId, table.status)                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Composite index on org_id AND status.                         │
     * │                                                                     │
     * │ WHY: Dashboards and reports frequently filter by status:            │
     * │ "Show all OPEN requests" or "Show all OVERDUE requests."            │
     * │ Always scoped to an org.                                            │
     * │                                                                     │
     * │ QUERY PATTERNS:                                                     │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE org_id = 'abc-123' AND status = 'open'                    │
     * │   → "Show all open requests in this org"                            │
     * │                                                                     │
     * │   SELECT COUNT(*) FROM document_requests                            │
     * │     WHERE org_id = 'abc-123' AND status = 'overdue'                 │
     * │   → "How many overdue requests does this org have?"                 │
     * │   (COUNT(*) counts the number of matching rows)                     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Filter by status
    index("document_requests_org_status_idx").on(table.orgId, table.status),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("document_requests_due_date_idx").on(table.dueDate)           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Index on the due_date column.                                 │
     * │                                                                     │
     * │ WHY: A background job (cron task) periodically checks for           │
     * │ requests that are past due. It needs to quickly find all rows       │
     * │ where due_date < NOW(). Without this index, scanning every          │
     * │ row's due_date would be very slow at scale.                         │
     * │                                                                     │
     * │ QUERY PATTERN:                                                      │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE due_date < NOW() AND status = 'open'                      │
     * │   → "Find all requests that are past their due date but still       │
     * │      open, so we can mark them as overdue"                          │
     * │                                                                     │
     * │ NOTE: This index is on due_date alone (not org-scoped).             │
     * │ That's because the overdue-check job runs across ALL orgs.          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find overdue requests
    index("document_requests_due_date_idx").on(table.dueDate),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("document_requests_assigned_to_idx").on(table.assignedTo)     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Index on the assigned_to column.                              │
     * │                                                                     │
     * │ WHY: Users need to see "What's assigned to me?" This index makes   │
     * │ that query fast. Think of a client logging into their portal and    │
     * │ seeing a list of documents they need to upload.                     │
     * │                                                                     │
     * │ QUERY PATTERN:                                                      │
     * │   SELECT * FROM document_requests                                   │
     * │     WHERE assigned_to = 'user-789' AND status = 'open'              │
     * │   → "Show me all open requests assigned to this user"               │
     * │                                                                     │
     * │ NOTE: This index is on assigned_to alone (not org-scoped).          │
     * │ That's because a user's ID is globally unique (a UUID), so          │
     * │ filtering by user alone is sufficient. The org filter would          │
     * │ be redundant since a user's requests are already within their org.  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Requests assigned to a user
    index("document_requests_assigned_to_idx").on(table.assignedTo),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * DocumentRequestMetadata interface
 *
 * This defines the SHAPE of the JSON stored in the "metadata" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 * Since we default metadata to {}, any or all of these fields can be absent.
 *
 * WHY a metadata column instead of regular columns?
 *   These fields are used infrequently or only in specific contexts.
 *   Adding them as full columns would clutter the table schema for data
 *   that most rows won't even use. JSONB is perfect for this "overflow."
 */
export interface DocumentRequestMetadata {
  /**
   * remindersSent?: number
   *
   * WHAT: How many reminder notifications have been sent for this request.
   * WHY:  Prevents spamming. The system can check: "Have we already sent
   *       3 reminders? If so, stop sending." Also useful for reporting:
   *       "This client needed 5 reminders before uploading."
   * Example: 3 (meaning 3 reminder emails were sent)
   */
  remindersSent?: number;

  /**
   * lastReminderAt?: string
   *
   * WHAT: ISO timestamp of when the last reminder was sent.
   * WHY:  Rate limiting. "Don't send another reminder if the last one
   *       was less than 3 days ago." Stored as a string (ISO format)
   *       rather than a Date because JSON doesn't have a native Date type.
   * Example: "2024-03-15T10:00:00Z"
   */
  lastReminderAt?: string;

  /**
   * notes?: string
   *
   * WHAT: Internal notes about this request (not visible to client).
   * WHY:  Assistants may want to jot down context that doesn't fit in
   *       the description. Example: "Client said they'd mail this in.
   *       Check PO box next week."
   */
  notes?: string;

  /**
   * tags?: string[]
   *
   * WHAT: An array of string labels for categorization and filtering.
   * WHY:  Flexible tagging for organization-specific workflows.
   *       Example: ["onboarding", "tax-2023", "high-priority"]
   *       The UI could let users filter requests by tag.
   */
  tags?: string[];
}

/**
 * Document Request Relations (LEAF NODE with POLYMORPHIC LINKING)
 *
 * Kevin, document requests follow the same polymorphic pattern as documents.
 * They can link to any level of the hierarchy (client, entity, asset).
 *
 * But they also have TWO user references - a common pattern:
 *
 *   requestedByUser → WHO asked for the document
 *   assignedToUser  → WHO is responsible for providing it
 *
 * MULTIPLE FKs TO THE SAME TABLE:
 *   Both requested_by and assigned_to point to users.id, but they mean
 *   different things. Drizzle handles this by using NAMED relations:
 *     requestedByUser: one(users, { fields: [requestedBy], ... })
 *     assignedToUser:  one(users, { fields: [assignedTo], ... })
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER (see documents.ts for full breakdown):                │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │                                                                     │
 *   │ SELECT = "fetch data"                                               │
 *   │ *      = "all columns" (give me everything about this row)          │
 *   │ FROM   = "look in this table"                                       │
 *   │ WHERE  = "only rows matching this condition"                        │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each document_request:
 *     req.org             → "Find the ONE org this request belongs to"
 *                           SELECT * FROM orgs WHERE id = req.org_id
 *     req.client          → "Find the ONE client (if any) this request is for"
 *                           SELECT * FROM clients WHERE id = req.client_id
 *     req.entity          → "Find the ONE entity (if any) this request is for"
 *                           SELECT * FROM entities WHERE id = req.entity_id
 *     req.asset           → "Find the ONE asset (if any) this request is for"
 *                           SELECT * FROM assets WHERE id = req.asset_id
 *     req.requestedByUser → "Find the ONE user who created this request"
 *                           SELECT * FROM users WHERE id = req.requested_by
 *     req.assignedToUser  → "Find the ONE user who must fulfill this request"
 *                           SELECT * FROM users WHERE id = req.assigned_to
 *
 * QUERY EXAMPLE - Get open requests for a client with who asked:
 *   const requests = await db.query.documentRequests.findMany({
 *     where: and(
 *       eq(documentRequests.orgId, orgId),
 *       eq(documentRequests.clientId, clientId),
 *       eq(documentRequests.status, "open"),
 *     ),
 *     with: {
 *       requestedByUser: true,  // WHO asked
 *       assignedToUser: true,   // WHO must provide it
 *       entity: true,           // WHAT entity it's for (if any)
 *     },
 *   });
 *
 * QUERY EXAMPLE - Get overdue requests assigned to a user:
 *   const overdue = await db.query.documentRequests.findMany({
 *     where: and(
 *       eq(documentRequests.assignedTo, userId),
 *       eq(documentRequests.status, "overdue"),
 *     ),
 *     with: { client: true },
 *   });
 */
export const documentRequestsRelations = relations(
  documentRequests,
  ({ one }) => ({
    /**
     * ONE relationship: Request belongs to ONE Org (REQUIRED)
     * SQL: SELECT * FROM orgs WHERE id = request.org_id
     */
    org: one(orgs, {
      fields: [documentRequests.orgId],
      references: [orgs.id],
    }),

    /**
     * ONE relationship: Request MAY be for ONE Client (OPTIONAL)
     * SQL: SELECT * FROM clients WHERE id = request.client_id
     */
    client: one(clients, {
      fields: [documentRequests.clientId],
      references: [clients.id],
    }),

    /**
     * ONE relationship: Request MAY be for ONE Entity (OPTIONAL)
     * SQL: SELECT * FROM entities WHERE id = request.entity_id
     */
    entity: one(entities, {
      fields: [documentRequests.entityId],
      references: [entities.id],
    }),

    /**
     * ONE relationship: Request MAY be for ONE Asset (OPTIONAL)
     * SQL: SELECT * FROM assets WHERE id = request.asset_id
     */
    asset: one(assets, {
      fields: [documentRequests.assetId],
      references: [assets.id],
    }),

    /**
     * ONE relationship: Request was created by ONE User (OPTIONAL)
     *
     * "Who asked for this document?"
     * Optional because the user may have been deleted (onDelete: "set null").
     * SQL: SELECT * FROM users WHERE id = request.requested_by
     */
    requestedByUser: one(users, {
      fields: [documentRequests.requestedBy],
      references: [users.id],
    }),

    /**
     * ONE relationship: Request is assigned to ONE User (OPTIONAL)
     *
     * "Who is responsible for providing this document?"
     * Typically the client (via portal) or an assistant.
     * SQL: SELECT * FROM users WHERE id = request.assigned_to
     */
    assignedToUser: one(users, {
      fields: [documentRequests.assignedTo],
      references: [users.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type DocumentRequest = typeof documentRequests.$inferSelect
 *
 * WHAT: Creates a TypeScript type representing a document request ROW
 *       as it comes back FROM the database (a SELECT result).
 *
 * WHY: When you query document requests, TypeScript needs to know the
 *      shape of the data so it can provide autocomplete and catch errors.
 *
 * USAGE EXAMPLE:
 *   const request: DocumentRequest = await db.query.documentRequests.findFirst();
 *   request.title       // TypeScript knows this is a string
 *   request.status      // TypeScript knows this is "open"|"fulfilled"|"cancelled"|"overdue"
 *   request.clientId    // TypeScript knows this is string | null (nullable FK)
 *   request.dueDate     // TypeScript knows this is Date | null
 *   request.metadata    // TypeScript knows this is DocumentRequestMetadata
 *
 * ALL fields are present (required ones are non-null, optional ones are T | null).
 */
export type DocumentRequest = typeof documentRequests.$inferSelect;

/**
 * export type NewDocumentRequest = typeof documentRequests.$inferInsert
 *
 * WHAT: Creates a TypeScript type for INSERTING a new document request.
 *       Fields with defaults (.default(), .defaultRandom(), .defaultNow())
 *       become OPTIONAL in this type, since the database fills them in.
 *
 * WHY: When inserting a new row, you only need to provide required fields
 *      that don't have defaults. TypeScript enforces this.
 *
 * USAGE EXAMPLE:
 *   const newRequest: NewDocumentRequest = {
 *     orgId: "abc-123",              // REQUIRED - no default
 *     title: "2023 Tax Return",      // REQUIRED - no default
 *     // id         → optional (defaultRandom generates it)
 *     // status     → optional (defaults to "open")
 *     // priority   → optional (defaults to "medium")
 *     // createdAt  → optional (defaults to now)
 *     // updatedAt  → optional (defaults to now)
 *     // metadata   → optional (defaults to {})
 *     // clientId, entityId, assetId → optional (nullable)
 *     // requestedBy, assignedTo     → optional (nullable)
 *     // dueDate, fulfilledAt        → optional (nullable)
 *     // description, documentType   → optional (nullable)
 *     // fulfilledDocumentId         → optional (nullable)
 *   };
 *   await db.insert(documentRequests).values(newRequest);
 */
export type NewDocumentRequest = typeof documentRequests.$inferInsert;
