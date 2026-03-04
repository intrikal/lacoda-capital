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
 *       Without relations, we couldn't easily query "give me a document AND
 *       its client AND the entity it belongs to" in one go.
 * WHERE: "drizzle-orm" is an npm package (lives in node_modules).
 *
 * See clients.ts for full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each import is a tool for creating different parts of a table.
 *
 * Quick summary of each (see clients.ts for full explanation):
 *
 * pgTable   = Function to create a new database table
 *             Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *
 * uuid      = Column type for UUIDs (Universally Unique Identifier)
 *             Example: "550e8400-e29b-41d4-a716-446655440000"
 *             Used for primary keys and foreign keys in this schema.
 *
 * text      = Column type for text/strings (any length)
 *             Example: "Trust_Document_2024.pdf" or "application/pdf"
 *
 * timestamp = Column type for dates and times
 *             Example: "2024-06-15T14:30:00+00:00"
 *             We use { withTimezone: true } to track the timezone.
 *
 * jsonb     = Column type for JSON data (JavaScript Object Notation, Binary)
 *             Allows storing flexible, structured data like:
 *             { "documentType": "passport", "issuingAuthority": "US Dept of State" }
 *             The "b" in jsonb means "binary" - stored efficiently for fast queries.
 *
 * index     = Function to create database indexes (like a book's index -
 *             makes lookups fast). See the INDEXES section below for details.
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
 * import { documentStatusEnum } from "./00_enums"
 *
 * WHAT: Imports the document status enum we defined in 00_enums.ts.
 * WHY:  An ENUM (short for "enumeration") restricts a column to a fixed set
 *       of allowed values. For document status, the allowed values are:
 *         "pending"  → Uploaded but not yet reviewed
 *         "verified" → Reviewed and confirmed valid
 *         "expired"  → Past its expiration date, needs renewal
 *         "rejected" → Reviewed and found to be invalid
 *
 *       Without an enum, someone could accidentally insert "verfied" (typo)
 *       or "banana" and the database wouldn't stop them. Enums prevent that.
 *
 * WHERE: "./00_enums" is a file in the same directory. We centralize all enums
 *        in one file (00_enums.ts) to prevent circular dependency issues.
 *        See 00_enums.ts for the full enum definition.
 */
import { documentStatusEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition.
 * WHY:  We need to reference orgs.id to create a REQUIRED Foreign Key.
 *       Every document MUST belong to an org (tenant isolation).
 * WHERE: Same directory - app/db/schema/orgs.ts
 *
 * See clients.ts for full explanation of FK references to orgs.
 */
import { orgs } from "./orgs";

/**
 * import { clients } from "./clients"
 *
 * WHAT: Imports the clients table definition.
 * WHY:  We need to reference clients.id to create an OPTIONAL Foreign Key.
 *       A document MAY be linked to a specific client (but doesn't have to be).
 * WHERE: Same directory - app/db/schema/clients.ts
 */
import { clients } from "./clients";

/**
 * import { entities } from "./entities"
 *
 * WHAT: Imports the entities table definition.
 * WHY:  We need to reference entities.id for an OPTIONAL Foreign Key.
 *       A document MAY be linked to a specific legal entity (trust, LLC, etc.).
 * WHERE: Same directory - app/db/schema/entities.ts
 */
import { entities } from "./entities";

/**
 * import { assets } from "./assets"
 *
 * WHAT: Imports the assets table definition.
 * WHY:  We need to reference assets.id for an OPTIONAL Foreign Key.
 *       A document MAY be linked to a specific asset (property deed, stock cert, etc.).
 * WHERE: Same directory - app/db/schema/assets.ts
 */
import { assets } from "./assets";

/**
 * The following imports bring in other tables that have relationships with documents.
 * We import them so we can define the relationships in documentsRelations below.
 */
import { tasks } from "./tasks";
import { complianceEvidence } from "./compliance";

/**
 * ============================================================================
 * DOCUMENTS TABLE DEFINITION (The Document Vault)
 * ============================================================================
 *
 * Kevin, this is the document vault - secure storage metadata for all client
 * documents in the wealth management platform.
 *
 * WHAT THIS TABLE STORES:
 *   Every uploaded file in the system gets a row here: passports, tax returns,
 *   trust agreements, property deeds, insurance policies, etc.
 *   The actual FILE lives in cloud storage (like Supabase Storage or AWS S3).
 *   This table stores the METADATA (name, type, path, status, who verified it).
 *
 * WHY IT EXISTS:
 *   Wealth management firms handle thousands of sensitive documents.
 *   They need to:
 *     - Track which documents belong to which client/entity/asset
 *     - Know if documents are verified, pending review, or expired
 *     - Find all expiring documents for compliance alerts
 *     - Tag and categorize documents for easy search
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ POLYMORPHIC LINKING STRATEGY                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Kevin, this table uses a design pattern called "POLYMORPHIC LINKING".   │
 * │ Instead of belonging to just ONE parent table, a document can link to  │
 * │ MULTIPLE levels of the hierarchy at the same time.                      │
 * │                                                                         │
 * │   org_id     = REQUIRED (every doc must belong to an org)               │
 * │   client_id  = OPTIONAL (may or may not be linked to a client)          │
 * │   entity_id  = OPTIONAL (may or may not be linked to an entity)         │
 * │   asset_id   = OPTIONAL (may or may not be linked to an asset)          │
 * │                                                                         │
 * │ REAL-WORLD EXAMPLES:                                                    │
 * │                                                                         │
 * │ 1. Org-level policy document (compliance manual):                       │
 * │    org_id = "acme-123", client_id = NULL, entity_id = NULL, asset = NULL│
 * │    → Belongs to the firm, not tied to any specific client               │
 * │                                                                         │
 * │ 2. Client passport (ID verification):                                   │
 * │    org_id = "acme-123", client_id = "john-456", entity = NULL, asset=NULL│
 * │    → Linked to John Smith the person, no specific entity or asset       │
 * │                                                                         │
 * │ 3. Trust agreement:                                                     │
 * │    org_id = "acme-123", client_id = "john-456", entity_id = "trust-789" │
 * │    → Linked to both the client AND the trust entity                     │
 * │                                                                         │
 * │ 4. Property deed:                                                       │
 * │    org_id = "acme-123", client = "john-456", entity = "llc-012",        │
 * │    asset_id = "property-345"                                            │
 * │    → Linked to the client, the LLC that holds it, AND the asset itself  │
 * │                                                                         │
 * │ WHY NOT SEPARATE TABLES? (e.g., client_documents, entity_documents)     │
 * │   - A trust document relates to BOTH the entity AND the client          │
 * │   - A deed relates to the asset AND the entity AND the client           │
 * │   - Separate tables would require duplicating rows or complex JOINs     │
 * │   - One table with optional FKs is simpler and more flexible            │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * export const documents = pgTable(...)
 *
 * BREAKDOWN:
 *   export     = Makes this available for other files to import
 *   const      = Declares a constant (value that won't change)
 *   documents  = The name we're giving this table in our code
 *   pgTable    = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "documents"   = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes
 */
export const documents = pgTable(
  "documents", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ PRIMARY KEY (PK) - Unique identifier for this document.            │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In our code: documents.id           │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "d4e5f6a7-b8c9-1234-5678-abcdef012345"            │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each row. No two documents  │
     * │   can have the same id. Every row MUST have one.                    │
     * │   See clients.ts for full PK explanation.                           │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when inserting a new row.   │
     * │   You don't need to create the ID yourself.                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull().references(() => orgs.id, {...})    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ REQUIRED FOREIGN KEY (FK) - Every document MUST belong to an org.  │
     * │                                                                     │
     * │ orgId:                                                              │
     * │   TypeScript property name. We use documents.orgId in code.         │
     * │   Note: camelCase in TypeScript (orgId), snake_case in database     │
     * │   (org_id). Drizzle handles the conversion automatically.           │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" that stores a UUID value.         │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ REQUIRED FK - .notNull() EXPLAINED:                         │   │
     * │   │                                                             │   │
     * │   │ This column CANNOT be empty. Every document MUST have an    │   │
     * │   │ org. This is for TENANT ISOLATION - every piece of data in │   │
     * │   │ our system must belong to an organization.                   │   │
     * │   │                                                             │   │
     * │   │ If you try to insert a document without org_id:             │   │
     * │   │   INSERT INTO documents (name) VALUES ('passport.pdf')      │   │
     * │   │   → DATABASE ERROR: "org_id cannot be null"                 │   │
     * │   │                                                             │   │
     * │   │ REQUIRED vs OPTIONAL FKs (important for this table!):       │   │
     * │   │   REQUIRED (.notNull()): org_id - every doc has an org      │   │
     * │   │   OPTIONAL (no .notNull()): client_id, entity_id, asset_id  │   │
     * │   │   See the OPTIONAL FK columns below for the difference.     │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ FOREIGN KEY + CASCADE EXPLAINED:                            │   │
     * │   │                                                             │   │
     * │   │ .references(() => orgs.id)                                  │   │
     * │   │   "This column's value must exist in orgs.id"               │   │
     * │   │   If org "acme-123" doesn't exist, you can't use it here.  │   │
     * │   │                                                             │   │
     * │   │ { onDelete: "cascade" }                                     │   │
     * │   │   If an org is deleted, ALL its documents are deleted too.   │   │
     * │   │   Like deleting a folder deletes all files inside.           │   │
     * │   │                                                             │   │
     * │   │ VISUAL:                                                     │   │
     * │   │   orgs table              documents table                   │   │
     * │   │   ┌────────────┐          ┌──────────────────────┐          │   │
     * │   │   │ id (PK)    │◄─────────│ org_id (FK, NOT NULL)│          │   │
     * │   │   │ "acme-123" │          │ "acme-123"           │          │   │
     * │   │   └────────────┘          │ name: "passport.pdf" │          │   │
     * │   │                           └──────────────────────┘          │   │
     * │   │                                                             │   │
     * │   │ See clients.ts for full FK and onDelete explanation.         │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id").references(() => clients.id, {...})     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ OPTIONAL FOREIGN KEY (FK) - Document MAY belong to a client.       │
     * │                                                                     │
     * │ Kevin, this is the KEY DIFFERENCE from org_id above:               │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ REQUIRED FK vs OPTIONAL FK - SIDE BY SIDE:                      │ │
     * │ │                                                                 │ │
     * │ │ REQUIRED (org_id above):                                        │ │
     * │ │   uuid("org_id").notNull().references(...)                      │ │
     * │ │                  ▲▲▲▲▲▲▲▲▲                                      │ │
     * │ │   Has .notNull() → column CANNOT be empty                       │ │
     * │ │   Every document MUST have an org.                               │ │
     * │ │                                                                 │ │
     * │ │ OPTIONAL (client_id here):                                      │ │
     * │ │   uuid("client_id").references(...)                             │ │
     * │ │   No .notNull()  → column CAN be empty (null)                   │ │
     * │ │   A document MAY OR MAY NOT have a client.                       │ │
     * │ │                                                                 │ │
     * │ │ WHEN IS client_id NULL?                                         │ │
     * │ │   - Org-level policy documents (not tied to any client)          │ │
     * │ │   - Company-wide compliance manuals                              │ │
     * │ │   - Template documents                                           │ │
     * │ │                                                                 │ │
     * │ │ WHEN IS client_id FILLED?                                       │ │
     * │ │   - A client's passport → client_id = "john-456"                │ │
     * │ │   - A client's tax return → client_id = "john-456"              │ │
     * │ │   - A trust agreement → client_id = "john-456"                  │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * │                                                                     │
     * │ .references(() => clients.id, { onDelete: "set null" })             │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ "set null" vs "cascade" - WHY THE DIFFERENCE?               │   │
     * │   │                                                             │   │
     * │   │ org_id uses "cascade":                                      │   │
     * │   │   Delete the org → delete ALL its documents                 │   │
     * │   │   (The org is gone, documents have no home)                 │   │
     * │   │                                                             │   │
     * │   │ client_id uses "set null":                                  │   │
     * │   │   Delete the client → KEEP the document, set client_id=NULL │   │
     * │   │   (The document is still useful to the org even without     │   │
     * │   │    the client. Think: a tax filing that's already submitted │   │
     * │   │    still matters even if the client relationship ended.)    │   │
     * │   │                                                             │   │
     * │   │ VISUAL (before client deletion):                            │   │
     * │   │   documents row: { org_id: "acme", client_id: "john-456" } │   │
     * │   │                                                             │   │
     * │   │ VISUAL (after client "john-456" is deleted):                │   │
     * │   │   documents row: { org_id: "acme", client_id: NULL }        │   │
     * │   │   The document SURVIVES, it just loses the client link.     │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ VISUAL RELATIONSHIP:                                                │
     * │   clients table              documents table                        │
     * │   ┌────────────┐             ┌──────────────────────────┐           │
     * │   │ id (PK)    │◄ ─ ─ ─ ─ ─ │ client_id (FK, NULLABLE) │           │
     * │   │ "john-456" │   optional  │ "john-456" OR null       │           │
     * │   └────────────┘             └──────────────────────────┘           │
     * │       ▲                                                             │
     * │   The dashed line (─ ─) means the relationship is OPTIONAL.         │
     * │   Contrast with org_id's solid line (────) which is REQUIRED.       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ entityId: uuid("entity_id").references(() => entities.id, {...})    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ OPTIONAL FOREIGN KEY - Document MAY belong to a legal entity.      │
     * │                                                                     │
     * │ Same pattern as clientId above: no .notNull() → NULLABLE.           │
     * │                                                                     │
     * │ WHEN IS entity_id FILLED?                                           │
     * │   - Trust agreement → entity_id = the trust's id                    │
     * │   - LLC operating agreement → entity_id = the LLC's id              │
     * │   - Corporate bylaws → entity_id = the corporation's id             │
     * │                                                                     │
     * │ WHEN IS entity_id NULL?                                             │
     * │   - Client's personal passport (not entity-specific)                │
     * │   - Org-level compliance docs                                       │
     * │                                                                     │
     * │ { onDelete: "set null" }                                            │
     * │   If the entity is deleted, KEEP the document but set entity_id     │
     * │   to NULL. The document itself is still valuable.                    │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   entities table             documents table                        │
     * │   ┌────────────┐             ┌──────────────────────────┐           │
     * │   │ id (PK)    │◄ ─ ─ ─ ─ ─ │ entity_id (FK, NULLABLE) │           │
     * │   │ "trust-789"│   optional  │ "trust-789" OR null      │           │
     * │   └────────────┘             └──────────────────────────┘           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assetId: uuid("asset_id").references(() => assets.id, {...})        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ OPTIONAL FOREIGN KEY - Document MAY belong to a specific asset.    │
     * │                                                                     │
     * │ Same pattern as clientId and entityId: no .notNull() → NULLABLE.    │
     * │                                                                     │
     * │ WHEN IS asset_id FILLED?                                            │
     * │   - Property deed → asset_id = the real estate asset's id           │
     * │   - Stock certificate → asset_id = the equity asset's id            │
     * │   - Insurance policy → asset_id = the insured asset's id            │
     * │                                                                     │
     * │ WHEN IS asset_id NULL?                                              │
     * │   - Client's passport (not asset-specific)                          │
     * │   - Trust agreement (entity-level, not specific to one asset)       │
     * │   - Org-level documents                                             │
     * │                                                                     │
     * │ { onDelete: "set null" }                                            │
     * │   If the asset is deleted (e.g., property sold and removed),        │
     * │   KEEP the document but set asset_id to NULL.                       │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   assets table               documents table                        │
     * │   ┌──────────────┐           ┌──────────────────────────┐           │
     * │   │ id (PK)      │◄ ─ ─ ─ ─ │ asset_id (FK, NULLABLE)  │           │
     * │   │ "prop-345"   │  optional │ "prop-345" OR null       │           │
     * │   └──────────────┘           └──────────────────────────┘           │
     * │                                                                     │
     * │ SUMMARY OF ALL 4 FKs (Required vs Optional):                        │
     * │                                                                     │
     * │   org_id     ──────── REQUIRED (.notNull) ── onDelete: cascade     │
     * │   client_id  ─ ─ ─ ─  OPTIONAL (nullable) ── onDelete: set null   │
     * │   entity_id  ─ ─ ─ ─  OPTIONAL (nullable) ── onDelete: set null   │
     * │   asset_id   ─ ─ ─ ─  OPTIONAL (nullable) ── onDelete: set null   │
     * │                                                                     │
     * │   Solid line (──) = required, Dashed (─ ─) = optional               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),

    // ==================== DOCUMENT METADATA COLUMNS ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ name: text("name").notNull()                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The display name of the document.                             │
     * │ WHY:  Users need to see a human-readable name for each document.    │
     * │                                                                     │
     * │ text("name")                                                        │
     * │   Creates a text column named "name" in the database.               │
     * │   Can hold any string: "John_Passport_2024.pdf", "Trust Agreement", │
     * │   "Q4_2024_Tax_Return.pdf", etc.                                    │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every document MUST have a name. You can't upload a nameless doc. │
     * │   If you try: INSERT INTO documents (org_id) VALUES ('acme-123')    │
     * │   → DATABASE ERROR: "name cannot be null"                           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    name: text("name").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ description: text("description")                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: An optional human-readable description of the document.       │
     * │ WHY:  Users may want to add context: "Signed copy of the Smith      │
     * │       Family Trust, version 3, updated after 2024 amendment."       │
     * │                                                                     │
     * │ NO .notNull() → this is NULLABLE (optional).                        │
     * │   A description is nice-to-have, not required.                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    description: text("description"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ mimeType: text("mime_type")                                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The MIME type (file format identifier) of the document.       │
     * │ WHY:  Tells the browser/app what kind of file this is so it can     │
     * │       display or download it correctly.                              │
     * │                                                                     │
     * │ MIME TYPE EXAMPLES:                                                  │
     * │   "application/pdf"     → PDF file                                  │
     * │   "image/jpeg"          → JPEG image                                │
     * │   "image/png"           → PNG image                                 │
     * │   "application/msword"  → Word document                             │
     * │   "text/plain"          → Plain text file                           │
     * │                                                                     │
     * │ NO .notNull() → optional. MIME type might not be known at upload.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    mimeType: text("mime_type"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ fileSize: text("file_size")                                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The size of the file.                                         │
     * │ WHY:  Useful for display ("2.3 MB") and for enforcing size limits.  │
     * │                                                                     │
     * │ WHY text INSTEAD OF integer?                                        │
     * │   Large files can exceed JavaScript's safe integer range.           │
     * │   JavaScript's Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991     │
     * │   That's ~9 petabytes, which seems huge, but using text is a        │
     * │   defensive choice that avoids precision issues entirely.            │
     * │   Stored as text: "1048576" (1 MB in bytes).                        │
     * │                                                                     │
     * │ NO .notNull() → optional. Size might not be known at creation.      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    fileSize: text("file_size"), // Stored as text for large files

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ storagePath: text("storage_path").notNull()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The path to the actual file in cloud storage.                 │
     * │ WHY:  The database stores METADATA about the document, but the      │
     * │       actual file (the PDF, image, etc.) lives in a cloud storage   │
     * │       service like Supabase Storage, AWS S3, or Google Cloud.       │
     * │       This column tells us WHERE the file is stored.                │
     * │                                                                     │
     * │ EXAMPLE VALUES:                                                     │
     * │   "documents/acme-123/john-456/passport_2024.pdf"                   │
     * │   "uploads/org_abc/trust_agreements/smith_trust_v3.pdf"             │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every document MUST have a storage path. Without it, we wouldn't  │
     * │   know where the actual file lives and could never retrieve it.     │
     * │   A document record without a file path is useless.                 │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    storagePath: text("storage_path").notNull(), // Path in storage bucket

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ folder: text("folder")                                             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: An optional folder name for organizing documents in the UI.  │
     * │ WHY:  The Vault page groups documents by folder (e.g., "Real       │
     * │       Estate", "Tax", "Legal"). This lets admins and clients       │
     * │       filter the document list by category. Without this column    │
     * │       we'd have to parse folder names from storagePath (fragile).  │
     * │                                                                    │
     * │ EXAMPLE VALUES:                                                    │
     * │   "Real Estate", "Tax", "Insurance", "Legal", "Compliance",       │
     * │   "Investments", or NULL (uncategorized).                          │
     * │                                                                    │
     * │ NULLABLE:                                                          │
     * │   No .notNull() — documents can exist without a folder. The UI    │
     * │   displays these as "Uncategorized" in the folder filter.          │
     * │                                                                    │
     * │ MIGRATION: Added in drizzle/migrations/0001_furry_giant_man.sql   │
     * │   ALTER TABLE "documents" ADD COLUMN "folder" text;               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    folder: text("folder"),

    // ==================== DOCUMENT LIFECYCLE COLUMNS ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: documentStatusEnum("status").notNull().default("pending")   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The current lifecycle status of this document.                │
     * │ WHY:  Documents go through a review process. An uploaded document   │
     * │       isn't trusted until someone verifies it. Some documents       │
     * │       expire and need renewal.                                       │
     * │                                                                     │
     * │ documentStatusEnum("status")                                        │
     * │   Uses the ENUM we imported from 00_enums.ts. Only these values     │
     * │   are allowed:                                                      │
     * │                                                                     │
     * │   "pending"  → Just uploaded, not yet reviewed by staff             │
     * │   "verified" → Reviewed and confirmed to be valid                   │
     * │   "expired"  → Past its expiration date (e.g., expired passport)    │
     * │   "rejected" → Reviewed and found to be invalid or wrong document   │
     * │                                                                     │
     * │   LIFECYCLE FLOW:                                                   │
     * │     pending ──→ verified ──→ expired                                │
     * │       │                                                             │
     * │       └──→ rejected                                                 │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every document must have a status. Can't be empty.                │
     * │                                                                     │
     * │ .default("pending")                                                 │
     * │   When a new document is inserted WITHOUT specifying a status,      │
     * │   it automatically gets "pending". This makes sense because a       │
     * │   newly uploaded document hasn't been reviewed yet.                  │
     * │                                                                     │
     * │ EXAMPLE QUERY - Find all documents needing review:                  │
     * │   SELECT * FROM documents                                           │
     * │   WHERE org_id = 'acme-123' AND status = 'pending'                  │
     * │   (This is why we have an index on org_id + status below!)          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    status: documentStatusEnum("status").notNull().default("pending"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ expiresAt: timestamp("expires_at", { withTimezone: true })          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date when this document expires and becomes invalid.      │
     * │ WHY:  Many legal/financial documents have expiration dates.          │
     * │       The system needs to alert users BEFORE documents expire       │
     * │       so they can renew them in time (compliance requirement).       │
     * │                                                                     │
     * │ EXAMPLES OF EXPIRING DOCUMENTS:                                     │
     * │   - Passport: expires every 10 years                                │
     * │   - Driver's license: expires every 4-8 years                       │
     * │   - Insurance policy: expires annually                              │
     * │   - Professional certifications: varies                             │
     * │   - Power of attorney: may have an end date                         │
     * │                                                                     │
     * │ { withTimezone: true }                                              │
     * │   Stores timezone info. Important when clients are in different     │
     * │   time zones - "expires at midnight" means different things in      │
     * │   New York vs. London.                                              │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE (optional).                                │
     * │   Not all documents expire. A deed or trust agreement typically     │
     * │   doesn't expire. Only documents with a defined expiration date     │
     * │   will have this filled in. NULL means "never expires".             │
     * │                                                                     │
     * │ EXAMPLE QUERY - Find documents expiring in the next 30 days:        │
     * │   SELECT * FROM documents                                           │
     * │   WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'    │
     * │   (This is why we have an index on expires_at below!)               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ verifiedAt: timestamp("verified_at", { withTimezone: true })        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date and time when this document was verified (approved). │
     * │ WHY:  For compliance and audit trails, the firm needs to know       │
     * │       WHEN a document was reviewed and approved. Regulators may ask │
     * │       "When did you verify this client's identity documents?"       │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE (optional).                                │
     * │   This is NULL when the document hasn't been verified yet           │
     * │   (status is still "pending" or "rejected"). It gets filled in     │
     * │   when someone reviews and approves the document.                   │
     * │                                                                     │
     * │ EXAMPLE:                                                            │
     * │   Document uploaded:  verifiedAt = NULL, status = "pending"         │
     * │   Staff verifies it:  verifiedAt = "2024-06-15T14:30:00Z",          │
     * │                       status = "verified"                           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ verifiedBy: uuid("verified_by")                                     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The UUID of the user who verified (approved) this document.   │
     * │ WHY:  For accountability - know WHO reviewed each document.          │
     * │       "Alice verified John's passport on June 15th."                │
     * │                                                                     │
     * │ NOTE: This is a UUID but does NOT have .references() in the table   │
     * │       definition. This means it's a "soft reference" - the database │
     * │       doesn't enforce that this UUID exists in any other table.      │
     * │       It's stored as a UUID for consistency, but there's no formal  │
     * │       FK constraint. This is sometimes done to keep things simple   │
     * │       or when the referenced user table structure is complex.        │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE (optional).                                │
     * │   NULL when the document hasn't been verified yet. Gets filled in   │
     * │   at the same time as verifiedAt.                                   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    verifiedBy: uuid("verified_by"), // User who verified

    // ==================== CATEGORIZATION COLUMNS ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ tags: jsonb("tags").$type<string[]>().default([])                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A JSONB array of string tags for flexible categorization.     │
     * │ WHY:  Tags let users organize and search documents freely without   │
     * │       needing a rigid category system. Users can add whatever tags  │
     * │       make sense for their workflow.                                 │
     * │                                                                     │
     * │ jsonb("tags")                                                       │
     * │   Creates a JSONB column named "tags". JSONB can store any JSON     │
     * │   data - arrays, objects, nested structures, etc.                    │
     * │   See clients.ts for full JSONB explanation.                         │
     * │                                                                     │
     * │ .$type<string[]>()                                                  │
     * │   Tells TypeScript this column holds a STRING ARRAY.                │
     * │   string[] means "an array where every element is a string."        │
     * │   This gives us type safety and autocomplete in our code.           │
     * │                                                                     │
     * │ .default([])                                                        │
     * │   If no tags are provided, use an empty array [].                   │
     * │   NOT null, but an empty array - there's a difference!              │
     * │   null means "no value", [] means "a value that is an empty list".  │
     * │                                                                     │
     * │ EXAMPLE VALUES:                                                     │
     * │   ["tax", "2024", "q4"]                → Tax doc for Q4 2024        │
     * │   ["identity", "passport", "verified"] → A verified passport        │
     * │   ["trust", "legal", "amendment"]       → A trust amendment          │
     * │   []                                    → No tags assigned yet       │
     * │                                                                     │
     * │ WHY JSONB ARRAY INSTEAD OF A SEPARATE "tags" TABLE?                 │
     * │   A separate tags table would be more "normalized" (proper DB        │
     * │   design) but adds complexity: you'd need a junction table,          │
     * │   extra JOINs for every query, etc. For simple string tags,          │
     * │   a JSONB array is simpler and fast enough. PostgreSQL can even     │
     * │   index inside JSONB arrays for fast tag-based searches.             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    tags: jsonb("tags").$type<string[]>().default([]),

    // ==================== ADDITIONAL METADATA ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ metadata: jsonb("metadata").$type<DocumentMetadata>().default({})   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A JSONB column for storing additional structured metadata     │
     * │       about the document.                                           │
     * │ WHY:  Different document types need different metadata fields.       │
     * │       A passport needs "issuingAuthority", a tax return needs       │
     * │       "documentYear", a deed needs "propertyAddress". Instead of    │
     * │       adding a column for every possible field (most would be NULL),│
     * │       we use a flexible JSONB column with a TypeScript interface.    │
     * │                                                                     │
     * │ jsonb("metadata")                                                   │
     * │   Creates a JSONB column named "metadata".                          │
     * │                                                                     │
     * │ .$type<DocumentMetadata>()                                          │
     * │   Tells TypeScript what shape this JSON should have.                │
     * │   DocumentMetadata is an interface defined below this table.         │
     * │   This gives us autocomplete: doc.metadata.documentType will work.  │
     * │   See clients.ts for full explanation of .$type<>().                 │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no metadata is provided, use an empty object {}.               │
     * │                                                                     │
     * │ EXAMPLE VALUES:                                                     │
     * │   {                                                                 │
     * │     documentType: "passport",                                       │
     * │     issuingAuthority: "US Department of State",                      │
     * │     uploadedBy: "alice-member-uuid",                                │
     * │     notes: "Expires June 2029"                                      │
     * │   }                                                                 │
     * │                                                                     │
     * │   {                                                                 │
     * │     documentType: "tax_return",                                     │
     * │     documentYear: 2024,                                             │
     * │     sourceSystem: "turbotax",                                       │
     * │     customFields: { "filingStatus": "married_jointly" }             │
     * │   }                                                                 │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    metadata: jsonb("metadata").$type<DocumentMetadata>().default({}),

    // ==================== STANDARD TIMESTAMP COLUMNS ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", {...}).notNull().defaultNow()    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: When this document record was created (i.e., uploaded).       │
     * │ WHY:  For audit trails and sorting ("show newest documents first"). │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Stores date + time + timezone. Example: "2024-06-15T14:30:00Z"   │
     * │                                                                     │
     * │ .notNull()    → Every row must have a creation time.                │
     * │ .defaultNow() → Auto-set to current time when the row is inserted. │
     * │                                                                     │
     * │ See clients.ts for full timestamp explanation.                       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", {...}).notNull().defaultNow()    │
     * │           .$onUpdate(() => new Date())                              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: When this document record was last modified.                   │
     * │ WHY:  For tracking changes: "This document's status was updated     │
     * │       2 hours ago."                                                 │
     * │                                                                     │
     * │ Same as createdAt, plus:                                            │
     * │                                                                     │
     * │ .$onUpdate(() => new Date())                                        │
     * │   AUTOMATICALLY updates this timestamp whenever the row changes.    │
     * │   So if someone verifies a document (changing its status), this     │
     * │   column auto-updates to the current time. This is handled by       │
     * │   Drizzle in application code, not by the database itself.          │
     * │                                                                     │
     * │ See clients.ts for full explanation.                                 │
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
   * This function returns an array of INDEXES for the documents table.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ WHY SO MANY INDEXES ON THIS TABLE?                                  │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ Kevin, documents are one of the most-queried tables in the system.  │
   * │ Users constantly search for documents by client, entity, asset,     │
   * │ status, and expiration date. Without indexes, each of those queries │
   * │ would scan EVERY row in the table (slow!).                          │
   * │                                                                     │
   * │ Remember: An index is like a book's index - it lets the database    │
   * │ jump directly to matching rows instead of reading every row.         │
   * │ See clients.ts for the full index explanation.                       │
   * │                                                                     │
   * │ IMPORTANT: Almost every index starts with orgId because this is a   │
   * │ multi-tenant app. EVERY query filters by org first (to ensure      │
   * │ Org A can't see Org B's documents). By including orgId in the       │
   * │ index, the database can quickly narrow down to just one org's docs. │
   * │                                                                     │
   * │ TRADEOFF REMINDER:                                                  │
   * │ - More indexes = faster READS (SELECT queries)                      │
   * │ - More indexes = slower WRITES (INSERT/UPDATE must update indexes)  │
   * │ - Documents are read far more often than written, so many indexes   │
   * │   is a good tradeoff here.                                          │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  (table) => [
    /**
     * index("documents_org_id_idx").on(table.orgId)
     *
     * Creates an index on the org_id column alone.
     *
     * WHY: The most basic query - "get all documents for this org."
     *      SELECT * FROM documents WHERE org_id = 'acme-123'
     *      This is used on every single page that shows documents,
     *      since multi-tenant isolation always filters by org first.
     *
     * NAMING: table_column_idx is a common naming convention.
     */
    index("documents_org_id_idx").on(table.orgId),

    /**
     * index("documents_org_client_idx").on(table.orgId, table.clientId)
     *
     * A COMPOSITE INDEX on org_id AND client_id (two columns together).
     *
     * WHY: "Find all documents for a specific client in this org."
     *      SELECT * FROM documents
     *      WHERE org_id = 'acme-123' AND client_id = 'john-456'
     *
     *      This is the most common document query - when viewing a client's
     *      profile, you want to see all their documents.
     */
    index("documents_org_client_idx").on(table.orgId, table.clientId),

    /**
     * index("documents_org_entity_idx").on(table.orgId, table.entityId)
     *
     * COMPOSITE INDEX on org_id AND entity_id.
     *
     * WHY: "Find all documents for a specific entity in this org."
     *      SELECT * FROM documents
     *      WHERE org_id = 'acme-123' AND entity_id = 'trust-789'
     *
     *      Used when viewing entity detail pages (e.g., all docs for
     *      the Smith Family Trust).
     */
    index("documents_org_entity_idx").on(table.orgId, table.entityId),

    /**
     * index("documents_org_asset_idx").on(table.orgId, table.assetId)
     *
     * COMPOSITE INDEX on org_id AND asset_id.
     *
     * WHY: "Find all documents for a specific asset in this org."
     *      SELECT * FROM documents
     *      WHERE org_id = 'acme-123' AND asset_id = 'prop-345'
     *
     *      Used when viewing asset detail pages (e.g., all docs for
     *      "123 Main Street" property).
     */
    index("documents_org_asset_idx").on(table.orgId, table.assetId),

    /**
     * index("documents_org_status_idx").on(table.orgId, table.status)
     *
     * COMPOSITE INDEX on org_id AND status.
     *
     * WHY: "Find all documents with a specific status in this org."
     *      SELECT * FROM documents
     *      WHERE org_id = 'acme-123' AND status = 'pending'
     *
     *      Used for the dashboard "Pending Review" queue - staff need to
     *      quickly see which documents are awaiting their review.
     *      Also used for "find all expired documents" compliance checks.
     */
    index("documents_org_status_idx").on(table.orgId, table.status),

    /**
     * index("documents_expires_at_idx").on(table.expiresAt)
     *
     * INDEX on expires_at alone (no org_id prefix!).
     *
     * WHY: "Find all documents expiring soon, across ALL orgs."
     *      SELECT * FROM documents
     *      WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
     *
     *      This supports a SYSTEM-WIDE cron job / scheduled task that
     *      runs nightly to find documents about to expire and send
     *      notification alerts. Since the cron job checks ALL orgs,
     *      we don't prefix with org_id here.
     *
     * NOTE: This is the only index without org_id because the expiration
     *       checker needs to scan across all organizations at once.
     */
    index("documents_expires_at_idx").on(table.expiresAt),

    /**
     * index("documents_org_created_at_idx").on(table.orgId, table.createdAt)
     *
     * COMPOSITE INDEX on org_id AND created_at.
     *
     * WHY: "Get recent documents for this org, sorted by upload date."
     *      SELECT * FROM documents
     *      WHERE org_id = 'acme-123'
     *      ORDER BY created_at DESC
     *
     *      Used for the "Recent Documents" feed on the dashboard, showing
     *      the latest uploads. Without this index, sorting by date would
     *      require scanning and sorting all rows (slow for large orgs).
     */
    index("documents_org_created_at_idx").on(table.orgId, table.createdAt),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ DocumentMetadata Interface                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Kevin, this TypeScript interface defines the SHAPE of the JSON stored   │
 * │ in the "metadata" JSONB column above.                                   │
 * │                                                                         │
 * │ WHY AN INTERFACE?                                                       │
 * │   JSONB can store ANY JSON - { "banana": true } would be valid.         │
 * │   But we want TypeScript to help us. By defining an interface, we get:  │
 * │     - Autocomplete: doc.metadata.documentType (TypeScript suggests it!) │
 * │     - Error checking: doc.metadata.banana → TypeScript ERROR            │
 * │     - Documentation: developers know what fields are available          │
 * │                                                                         │
 * │ The "?" after each property means it's OPTIONAL (can be undefined).     │
 * │ This is because not every document type needs every field.              │
 * │ A passport doesn't need "documentYear", a tax return doesn't need      │
 * │ "issuingAuthority".                                                     │
 * │                                                                         │
 * │ See clients.ts ClientProfile for the same pattern.                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface DocumentMetadata {
  /**
   * documentType?: string
   *
   * The category/kind of document.
   * Examples: "passport", "tax_return", "deed", "trust_agreement",
   *           "insurance_policy", "bank_statement", "will"
   *
   * Why not an enum? Document types vary wildly between firms.
   * A flexible string lets each org use their own naming conventions.
   */
  documentType?: string; // 'passport', 'tax_return', 'deed', etc.

  /**
   * documentYear?: number
   *
   * The year the document pertains to (not when it was uploaded).
   * Example: A 2023 tax return uploaded in 2024 → documentYear = 2023
   * Useful for filtering: "Show me all 2023 tax returns."
   */
  documentYear?: number;

  /**
   * issuingAuthority?: string
   *
   * The organization that issued the document.
   * Examples: "US Department of State" (passport),
   *           "State of Delaware" (LLC certificate),
   *           "IRS" (tax transcript)
   */
  issuingAuthority?: string;

  /**
   * uploadedBy?: string
   *
   * The UUID (as a string) of the user who uploaded this document.
   * Useful for audit: "Who uploaded this file?"
   * Stored in metadata rather than a dedicated column because it's
   * informational rather than something we query/filter on frequently.
   */
  uploadedBy?: string;

  /**
   * sourceSystem?: string
   *
   * If the document was imported from an external system, which one.
   * Examples: "salesforce", "docusign", "google_drive", "manual_upload"
   * Useful for tracking where documents came from during data migration.
   */
  sourceSystem?: string;

  /**
   * notes?: string
   *
   * Free-form notes about the document.
   * Example: "Client faxed this copy, original in safe deposit box #42"
   */
  notes?: string;

  /**
   * customFields?: Record<string, unknown>
   *
   * A catch-all for any additional data that doesn't fit the above fields.
   *
   * Record<string, unknown> means:
   *   - An object where keys are strings
   *   - Values can be anything (unknown = we don't know the type)
   *
   * Example: { "filingStatus": "married_jointly", "preparer": "H&R Block" }
   *
   * This gives maximum flexibility - each org can store whatever extra
   * data they need without requiring schema changes.
   */
  customFields?: Record<string, unknown>;
}

// ============================================================================
// RELATIONS DEFINITION
// ============================================================================

/**
 * Document Relations (POLYMORPHIC LINKING - Multi-Level Hierarchy)
 *
 * Kevin, documents are unique in our schema because they use POLYMORPHIC LINKING.
 * Instead of belonging to ONE parent, they can link to MULTIPLE levels:
 *
 *   ┌──────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐
 *   │ Org  │   │ Client   │   │ Entity   │   │ Asset   │
 *   │(req) │   │(optional)│   │(optional)│   │(optional)│
 *   └──┬───┘   └────┬─────┘   └────┬─────┘   └────┬────┘
 *      │            │              │              │
 *      └────────────┴──────────────┴──────────────┘
 *                          │
 *                    ┌─────┴─────┐
 *                    │ Document  │
 *                    └───────────┘
 *
 * WHY POLYMORPHIC?
 *   - A trust document relates to the entity AND all assets in it
 *   - A tax return relates to the client AND specific entities
 *   - A deed relates to the asset AND the entity holding it
 *   - An org-level policy document has no specific client/entity/asset
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL MINI-LESSON FOR THIS SECTION:                                   │
 *   │                                                                     │
 *   │ SELECT * FROM orgs WHERE id = doc.org_id                            │
 *   │   ▲      ▲   ▲     ▲     ▲                                         │
 *   │   │      │   │     │     └─ "the value must match doc's org_id"     │
 *   │   │      │   │     └─ "filter rows WHERE this condition is true"    │
 *   │   │      │   └─ "look in the orgs table"                            │
 *   │   │      └─ "give me ALL columns" (* = everything)                  │
 *   │   └─ "fetch data from the database"                                 │
 *   │                                                                     │
 *   │ In plain English: "Go to the orgs table. Find the row whose id     │
 *   │ matches this document's org_id. Give me all its columns."           │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each document:
 *     doc.org              → "Find the ONE org this doc belongs to"
 *                            SELECT * FROM orgs WHERE id = doc.org_id
 *     doc.client           → "Find the ONE client (if any) this doc is for"
 *                            SELECT * FROM clients WHERE id = doc.client_id
 *     doc.entity           → "Find the ONE entity (if any) this doc is for"
 *                            SELECT * FROM entities WHERE id = doc.entity_id
 *     doc.asset            → "Find the ONE asset (if any) this doc is for"
 *                            SELECT * FROM assets WHERE id = doc.asset_id
 *     doc.tasks            → "Find ALL tasks linked to this doc"
 *                            SELECT * FROM tasks WHERE document_id = doc.id
 *     doc.complianceEvidence → "Find ALL compliance evidence using this doc"
 *                              SELECT * FROM compliance_evidence WHERE document_id = doc.id
 *
 * QUERY EXAMPLE - Get a document with all its context:
 *   const doc = await db.query.documents.findFirst({
 *     where: eq(documents.id, docId),
 *     with: {
 *       org: true,           // ONE - always present
 *       client: true,        // ONE - may be null
 *       entity: true,        // ONE - may be null
 *       asset: true,         // ONE - may be null
 *       tasks: true,         // MANY - related workflow tasks
 *     },
 *   });
 *   // doc.org.name = "Acme Wealth"
 *   // doc.client?.displayName = "John Smith" (or null)
 *   // doc.entity?.name = "Smith Family Trust" (or null)
 *
 * QUERY EXAMPLE - Get all documents for a client across all levels:
 *   const docs = await db.query.documents.findMany({
 *     where: and(
 *       eq(documents.orgId, orgId),
 *       eq(documents.clientId, clientId),
 *     ),
 *     with: { entity: true, asset: true },
 *   });
 */
export const documentsRelations = relations(documents, ({ one, many }) => ({
  /**
   * ONE relationship: Document belongs to ONE Org (REQUIRED)
   *
   * Every document MUST have an org (tenant isolation).
   * SQL: SELECT * FROM orgs WHERE id = document.org_id
   */
  org: one(orgs, {
    fields: [documents.orgId],
    references: [orgs.id],
  }),

  /**
   * ONE relationship: Document MAY belong to ONE Client (OPTIONAL)
   *
   * client_id can be NULL - org-level documents don't have a client.
   * onDelete: "set null" = if client is deleted, document stays but loses the link.
   * SQL: SELECT * FROM clients WHERE id = document.client_id
   */
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),

  /**
   * ONE relationship: Document MAY belong to ONE Entity (OPTIONAL)
   *
   * entity_id can be NULL - not all documents are entity-specific.
   * SQL: SELECT * FROM entities WHERE id = document.entity_id
   */
  entity: one(entities, {
    fields: [documents.entityId],
    references: [entities.id],
  }),

  /**
   * ONE relationship: Document MAY belong to ONE Asset (OPTIONAL)
   *
   * asset_id can be NULL - not all documents are asset-specific.
   * SQL: SELECT * FROM assets WHERE id = document.asset_id
   */
  asset: one(assets, {
    fields: [documents.assetId],
    references: [assets.id],
  }),

  /**
   * MANY relationship: Document has MANY Tasks
   *
   * Workflow tasks related to this document (e.g., "Review this deed").
   * SQL: SELECT * FROM tasks WHERE document_id = document.id
   */
  tasks: many(tasks),

  /**
   * MANY relationship: Document has MANY ComplianceEvidence records
   *
   * A document can satisfy multiple compliance controls.
   * SQL: SELECT * FROM compliance_evidence WHERE document_id = document.id
   */
  complianceEvidence: many(complianceEvidence),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Document = typeof documents.$inferSelect
 *
 * Creates a TypeScript type representing a DOCUMENT ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 *
 * Kevin, this type tells TypeScript what a document "looks like" when you
 * fetch it from the database. TypeScript will then give you autocomplete
 * and catch errors.
 *
 * Example:
 *   const doc: Document = await db.query.documents.findFirst();
 *   doc.name        // TypeScript knows this is a string (required)
 *   doc.storagePath // TypeScript knows this is a string (required)
 *   doc.clientId    // TypeScript knows this is string | null (optional FK!)
 *   doc.entityId    // TypeScript knows this is string | null (optional FK!)
 *   doc.tags        // TypeScript knows this is string[] (array of strings)
 *   doc.metadata    // TypeScript knows this is DocumentMetadata
 *   doc.status      // TypeScript knows this is "pending"|"verified"|"expired"|"rejected"
 */
export type Document = typeof documents.$inferSelect;

/**
 * export type NewDocument = typeof documents.$inferInsert
 *
 * Creates a TypeScript type for INSERTING (creating) a new document.
 * Some fields are optional (have defaults or are nullable), so this type
 * reflects which fields you MUST provide vs. which you CAN skip.
 *
 * Example:
 *   const newDoc: NewDocument = {
 *     orgId: "acme-123",                    // REQUIRED - every doc needs an org
 *     name: "John_Passport_2024.pdf",       // REQUIRED - every doc needs a name
 *     storagePath: "docs/acme/passport.pdf", // REQUIRED - where the file is stored
 *     // Everything below is OPTIONAL:
 *     // clientId, entityId, assetId → optional FKs (polymorphic linking)
 *     // status → defaults to "pending"
 *     // tags → defaults to []
 *     // metadata → defaults to {}
 *     // description, mimeType, fileSize → nullable
 *     // expiresAt, verifiedAt, verifiedBy → nullable
 *     // createdAt, updatedAt → auto-generated
 *   };
 *   await db.insert(documents).values(newDoc);
 */
export type NewDocument = typeof documents.$inferInsert;
