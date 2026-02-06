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
 *       For example, "an entity belongs to a client" and "an entity has many assets".
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See orgs.ts for a full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
 *
 * BREAKDOWN (see orgs.ts and clients.ts for detailed explanations):
 *   pgTable   = Function to CREATE a new database table
 *   uuid      = Column type for UUIDs (random unique identifiers like "550e8400-e29b-41d4-...")
 *   text      = Column type for text/strings (like "Smith Family Trust")
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *   jsonb     = Column type for JSON data (flexible structured data)
 *   index     = Function to create database indexes (makes queries faster)
 *
 * WHERE: "drizzle-orm/pg-core" is the PostgreSQL-specific part of Drizzle.
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
 * import { entityTypeEnum } from "./00_enums"
 *
 * WHAT: Imports a predefined ENUM (enumeration) type from our enums file.
 * WHY:  Enums restrict a column to specific allowed values.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN ENUM?                                                    │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ An enum is a list of allowed values for a column.                   │
 * │                                                                     │
 * │ entityTypeEnum allows ONLY these values:                            │
 * │   "personal", "llc", "trust", "corporation", "partnership",         │
 * │   "foundation"                                                      │
 * │                                                                     │
 * │ If you try to insert "invalid_type", the database will reject it:   │
 * │   INSERT INTO entities (entity_type) VALUES ('invalid_type')        │
 * │   → DATABASE ERROR: "invalid input value for enum entity_type"      │
 * │                                                                     │
 * │ WHY USE ENUMS instead of plain text?                                │
 * │   1. DATA INTEGRITY: Can't accidentally misspell "persoanl"         │
 * │   2. AUTOCOMPLETE: TypeScript knows the allowed values              │
 * │   3. DOCUMENTATION: The allowed values are defined in one place     │
 * │   4. PERFORMANCE: Enums are stored more efficiently than text       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WHERE: "./" means "same directory", so this imports from app/db/schema/00_enums.ts
 */
import { entityTypeEnum } from "./00_enums";

/**
 * import { clients } from "./clients"
 *
 * WHAT: Imports the clients table definition from the clients.ts file.
 * WHY:  We need to reference clients.id to create a Foreign Key relationship.
 *       This says "I need to know about the clients table so I can point to it."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/clients.ts
 *
 * See clients.ts for the full explanation of the clients table.
 */
import { clients } from "./clients";

/**
 * The following imports bring in other tables that have relationships with entities.
 * We import them so we can define the relationships in entitiesRelations below.
 *
 * Each of these tables has a Foreign Key (entity_id) that points to entities.id.
 * This creates a "one entity has many X" relationship for each table.
 */
import { assets } from "./assets";           // An entity can hold many assets
import { documents } from "./documents";     // An entity can have many documents
import { documentRequests } from "./document_requests";  // An entity can have many document requests
import { tasks } from "./tasks";             // An entity can have many tasks

/**
 * ============================================================================
 * ENTITIES TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, entities represent LEGAL STRUCTURES that hold assets.
 * In wealth management, clients often have multiple entities:
 *
 * REAL-WORLD EXAMPLES:
 *   - PERSONAL: John Smith's personal brokerage account
 *   - LLC: "Smith Investments LLC" for real estate holdings
 *   - TRUST: "Smith Family Trust" for estate planning
 *   - CORPORATION: "Smith Holdings Inc." for business ownership
 *
 * WHY NOT PUT ASSETS DIRECTLY ON CLIENTS?
 *   In the real world, assets aren't owned by "John Smith" directly.
 *   They're owned by legal entities that John controls:
 *
 *   ┌─────────────────┐
 *   │   John Smith    │ (CLIENT - the person)
 *   │   (the person)  │
 *   └────────┬────────┘
 *            │ owns/controls
 *   ┌────────┴────────────────────────────────┐
 *   │                                         │
 *   ▼                                         ▼
 *   ┌──────────────────┐     ┌──────────────────────┐
 *   │ Smith Family LLC │     │ Smith Family Trust   │
 *   │    (ENTITY)      │     │     (ENTITY)         │
 *   └────────┬─────────┘     └──────────┬───────────┘
 *            │ holds                    │ holds
 *            ▼                          ▼
 *   ┌──────────────────┐     ┌──────────────────────┐
 *   │ 123 Main St      │     │ Apple Stock          │
 *   │   (ASSET)        │     │   (ASSET)            │
 *   └──────────────────┘     └──────────────────────┘
 *
 * This structure enables:
 *   - Accurate reporting by entity (trust vs personal)
 *   - Tax reporting per entity (each has its own EIN)
 *   - Complex structures (holding company patterns)
 */

/**
 * export const entities = pgTable(...)
 *
 * BREAKDOWN (see orgs.ts for detailed explanation):
 *   export   = Makes this available for other files to import
 *   const    = Declares a constant (value that won't change)
 *   entities = The name we're giving this table in our TypeScript code
 *   pgTable  = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "entities"    = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes
 */
export const entities = pgTable(
  "entities", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ PRIMARY KEY (PK) - Unique identifier for this entity.               │
     * │                                                                     │
     * │ See orgs.ts for a complete explanation of:                          │
     * │   - What a UUID is and why we use them                              │
     * │   - What a Primary Key is and its rules                             │
     * │   - What .defaultRandom() does                                      │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   id:               TypeScript property name (entities.id)          │
     * │   uuid("id")        Creates UUID column named "id" in database      │
     * │   .primaryKey()     Makes this THE unique identifier for each row   │
     * │   .defaultRandom()  Auto-generates a UUID if you don't provide one  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id").notNull().references(...)               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY (FK) - Points to the client who owns this entity.       │
     * │                                                                     │
     * │ See clients.ts for a complete explanation of Foreign Keys.          │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   clientId:            TypeScript name (camelCase)                  │
     * │   uuid("client_id")    Database column name (snake_case)            │
     * │   .notNull()           Every entity MUST have a client              │
     * │   .references(...)     Creates the Foreign Key relationship         │
     * │                                                                     │
     * │ This Foreign Key creates a CHAIN of relationships:                  │
     * │                                                                     │
     * │   orgs.id (PK)  ◄──  clients.org_id (FK)                            │
     * │                      clients.id (PK)  ◄──  entities.client_id (FK)  │
     * │                                           entities.id (PK)  ◄── ... │
     * │                                                                     │
     * │ This chain means:                                                   │
     * │   - An org has many clients (via clients.org_id)                    │
     * │   - A client has many entities (via entities.client_id)             │
     * │   - To find what org an entity belongs to, follow the chain:        │
     * │     entity → client → org                                           │
     * │                                                                     │
     * │ .references(() => clients.id, { onDelete: "cascade" })              │
     * │                                                                     │
     * │   () => clients.id = "This column points to clients.id"             │
     * │                                                                     │
     * │   { onDelete: "cascade" } = ON DELETE BEHAVIOR:                     │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ What happens when the PARENT (client) is deleted?           │   │
     * │   │                                                             │   │
     * │   │ "cascade" = DELETE the children (entities) too              │   │
     * │   │   If you delete client "John Smith", ALL his entities       │   │
     * │   │   (Smith LLC, Smith Trust, etc.) are automatically deleted. │   │
     * │   │                                                             │   │
     * │   │ This makes sense because:                                   │   │
     * │   │   - Entities belong to a client                             │   │
     * │   │   - Without the client, the entities have no owner          │   │
     * │   │   - Orphaned entities would cause data integrity issues     │   │
     * │   │                                                             │   │
     * │   │ See clients.ts for other onDelete options:                  │   │
     * │   │   "set null", "restrict", "no action"                       │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /**
     * name: text("name").notNull()
     *
     * text("name")
     *   Creates a TEXT column named "name" in the database.
     *   Can hold any string: "Smith Family Trust", "Acme Holdings LLC", etc.
     *
     * .notNull()
     *   Every entity MUST have a name. It cannot be empty.
     *   If you try to insert an entity without a name:
     *     → DATABASE ERROR: "name cannot be null"
     */
    name: text("name").notNull(),

    /**
     * entityType: entityTypeEnum("entity_type").notNull()
     *
     * entityTypeEnum("entity_type")
     *   Uses our ENUM type (defined in 00_enums.ts) for the column.
     *   This restricts the value to ONLY these options:
     *     "personal", "llc", "trust", "corporation", "partnership", "foundation"
     *
     *   The database will REJECT any other value:
     *     INSERT INTO entities (entity_type) VALUES ('invalid')
     *     → ERROR: "invalid input value for enum entity_type"
     *
     * .notNull()
     *   Every entity MUST have a type. It cannot be empty.
     */
    entityType: entityTypeEnum("entity_type").notNull(),

    /**
     * jurisdiction: text("jurisdiction")
     *
     * text("jurisdiction")
     *   Creates a TEXT column named "jurisdiction".
     *   Stores WHERE the entity is legally registered.
     *   Examples: "Delaware", "Wyoming", "Nevada", "California"
     *
     * NO .notNull() means this is NULLABLE:
     *   - The value CAN be empty (null)
     *   - Jurisdiction is optional (personal accounts don't have one)
     */
    jurisdiction: text("jurisdiction"),

    /**
     * formationDate: timestamp("formation_date", { withTimezone: true })
     *
     * timestamp("formation_date", { withTimezone: true })
     *   Creates a TIMESTAMP column that stores date AND time.
     *   { withTimezone: true } = Also stores timezone info
     *   Example value: "2020-03-15T00:00:00-05:00"
     *
     *   This records WHEN the entity was legally created/formed.
     *   Example: "Smith Family LLC was formed on March 15, 2020"
     *
     * NO .notNull() means this is NULLABLE:
     *   - The value CAN be empty (null)
     *   - Not all entities have a formation date (personal accounts)
     *
     * See orgs.ts for a full explanation of timestamps.
     */
    formationDate: timestamp("formation_date", { withTimezone: true }),

    /**
     * taxId: text("tax_id")
     *
     * text("tax_id")
     *   Creates a TEXT column for tax identification numbers.
     *   Examples:
     *     - EIN (Employer Identification Number) for LLCs/corporations: "12-3456789"
     *     - SSN for personal accounts (though you'd typically not store this)
     *
     * NO .notNull() means this is NULLABLE:
     *   - The value CAN be empty (null)
     *   - Not all entities have a tax ID (or it may not be collected yet)
     *
     * SECURITY NOTE: This sensitive data should be encrypted at rest.
     * Supabase (our database provider) handles this automatically.
     */
    taxId: text("tax_id"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ metadata: jsonb("metadata").$type<EntityMetadata>().default({})     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ JSONB column for flexible, entity-type-specific data.               │
     * │                                                                     │
     * │ See orgs.ts for a full explanation of JSONB columns.                │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │                                                                     │
     * │ jsonb("metadata")                                                   │
     * │   Creates a JSONB column. JSONB stores structured data like:        │
     * │   {                                                                 │
     * │     "trustType": "revocable",                                       │
     * │     "trustees": ["John Smith", "Jane Smith"],                       │
     * │     "beneficiaries": ["Smith Kids Trust"]                           │
     * │   }                                                                 │
     * │                                                                     │
     * │ .$type<EntityMetadata>()                                            │
     * │   Tells TypeScript what SHAPE the JSON should have.                 │
     * │   EntityMetadata is defined below - it's a TypeScript interface.    │
     * │   This gives us autocomplete and type checking!                     │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no metadata is provided, use an empty object {}.               │
     * │   New entities start with no metadata, added later as needed.       │
     * │                                                                     │
     * │ WHY USE JSONB FOR ENTITY METADATA?                                  │
     * │   Different entity types need different fields:                     │
     * │                                                                     │
     * │   LLC might have:                                                   │
     * │     { "registeredAgent": "CT Corporation", "annualReportDue": "..." }│
     * │                                                                     │
     * │   Trust might have:                                                 │
     * │     { "trustType": "irrevocable", "trustees": [...], ... }          │
     * │                                                                     │
     * │   Instead of having columns that are NULL for most entity types,    │
     * │   we use flexible JSONB to store type-specific data.                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    metadata: jsonb("metadata").$type<EntityMetadata>().default({}),

    /**
     * createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
     *
     * Records WHEN this entity record was created in our database.
     * (Different from formationDate which is when the legal entity was formed)
     *
     * See orgs.ts for a full explanation of:
     *   - timestamp with timezone
     *   - .notNull()
     *   - .defaultNow()
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
     *
     * Records WHEN this entity record was last modified.
     *
     * .$onUpdate(() => new Date())
     *   Automatically updates this timestamp whenever the row is modified.
     *   Drizzle handles this - not the database.
     *
     * See orgs.ts for a full explanation of .$onUpdate().
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
   * This is a function that receives the table and returns an array of INDEXES.
   *
   * See orgs.ts and clients.ts for a full explanation of what indexes are
   * and why we need them.
   *
   * QUICK SUMMARY:
   *   An index is like the index at the back of a book.
   *   Without an index: To find something, scan every row (SLOW).
   *   With an index: Look up the value in a "lookup table" (FAST).
   *
   * TRADEOFF:
   *   - Indexes make READS faster (SELECT queries)
   *   - Indexes make WRITES slower (INSERT/UPDATE must update index)
   *   - Only add indexes for columns you frequently search/filter by
   */
  (table) => [
    /**
     * index("entities_client_id_idx").on(table.clientId)
     *
     * Creates an index named "entities_client_id_idx" on the client_id column.
     *
     * WHY: We frequently query "get all entities for a client":
     *   SELECT * FROM entities WHERE client_id = 'abc-123'
     *
     * Without this index: Database scans every entity to find matches (SLOW).
     * With this index: Database uses the lookup table to find matches (FAST).
     *
     * NAMING CONVENTION: tablename_columnname_idx
     */
    index("entities_client_id_idx").on(table.clientId),

    /**
     * index("entities_client_type_idx").on(table.clientId, table.entityType)
     *
     * A COMPOSITE INDEX on TWO columns: client_id AND entity_type.
     *
     * WHY: For queries like "Get all LLCs for a client":
     *   SELECT * FROM entities WHERE client_id = 'abc-123' AND entity_type = 'llc'
     *
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ COMPOSITE INDEX EXPLAINED:                                          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A composite index covers MULTIPLE columns.                          │
     * │                                                                     │
     * │ Think of it like a phone book:                                      │
     * │   - Sorted by LAST NAME first, then FIRST NAME                      │
     * │   - Finding "Smith, John" is fast (both columns used)               │
     * │   - Finding all "Smith" is fast (first column used)                 │
     * │   - Finding all "John" is SLOW (can't use the index)                │
     * │                                                                     │
     * │ COLUMN ORDER MATTERS:                                               │
     * │   index on (client_id, entity_type):                                │
     * │   ✓ WHERE client_id = 'x'                      (uses index)         │
     * │   ✓ WHERE client_id = 'x' AND entity_type = 'y' (uses index)        │
     * │   ✗ WHERE entity_type = 'y'                    (can't use index)    │
     * │                                                                     │
     * │ The first column in the index must be in the query's WHERE clause.  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("entities_client_type_idx").on(table.clientId, table.entityType),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * EntityMetadata interface
 *
 * This defines the SHAPE of the JSON stored in the "metadata" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 * Different entity types will have different fields populated.
 */
export interface EntityMetadata {
  // ==================== LLC / CORPORATION SPECIFIC ====================
  /**
   * registeredAgent: The company/person designated to receive legal documents.
   * Example: "CT Corporation System", "LegalZoom Registered Agent"
   */
  registeredAgent?: string;

  /**
   * annualReportDue: When the annual report filing is due.
   * Example: "2024-12-31" (stored as string for flexibility)
   */
  annualReportDue?: string;

  /**
   * operatingAgreementDate: When the LLC operating agreement was signed.
   * Example: "2020-03-15"
   */
  operatingAgreementDate?: string;

  // ==================== TRUST SPECIFIC ====================
  /**
   * trustType: The type of trust structure.
   * - "revocable": Can be changed/cancelled by the grantor
   * - "irrevocable": Cannot be changed once created
   * - "charitable": Set up for charitable purposes
   * - "other": Any other trust type
   */
  trustType?: "revocable" | "irrevocable" | "charitable" | "other";

  /**
   * trustor: The person who created the trust (also called "grantor" or "settlor").
   * Example: "John Smith"
   */
  trustor?: string;

  /**
   * trustees: People/entities responsible for managing the trust.
   * Example: ["John Smith", "First National Bank Trust Department"]
   */
  trustees?: string[];

  /**
   * beneficiaries: People/entities who benefit from the trust.
   * Example: ["Jane Smith", "Smith Children's Education Fund"]
   */
  beneficiaries?: string[];

  /**
   * trustTerms: Summary of the trust's key terms and conditions.
   * Example: "Distributions for health, education, maintenance, and support"
   */
  trustTerms?: string;

  // ==================== GENERAL ====================
  /**
   * primaryContact: Main contact person for this entity.
   * Example: "Jane Smith, CFO"
   */
  primaryContact?: string;

  /**
   * notes: Free-form notes about this entity.
   * Example: "Annual meeting held in March. Requires 2/3 vote for major decisions."
   */
  notes?: string;

  // ==================== CUSTOM FIELDS ====================
  /**
   * customFields: Flexible key-value pairs for any additional data.
   * Record<string, unknown> means: any string key, any value type.
   * Example: { "customField1": "value1", "specialNotes": 123 }
   */
  customFields?: Record<string, unknown>;
}

// ============================================================================
// RELATIONS DEFINITION
// ============================================================================

/**
 * Entity Relations (MID-LEVEL - Between Client and Asset)
 *
 * Kevin, entities sit in the MIDDLE of the ownership hierarchy:
 *
 *   Org (1) ──► Client (1) ──► Entity (1) ──► Asset (1) ──► Valuation
 *              (many)          (many)         (many)         (many)
 *                               ▲
 *                          (YOU ARE HERE)
 *
 * Entities go UP to a client (one) and DOWN to assets, docs, tasks (many).
 *
 *                ┌──────────┐
 *                │ Client   │
 *                └────┬─────┘
 *                     │ one (UP)
 *                     ▼
 *                ┌──────────┐
 *                │ Entities │ ◄── YOU ARE HERE
 *                └────┬─────┘
 *                     │ many (DOWN)
 *       ┌─────────┬───┴────┬──────────┬──────────┐
 *       │         │        │          │          │
 *       ▼         ▼        ▼          ▼          ▼
 *    assets     docs   docRequests  tasks    (no more)
 *    (MANY)    (MANY)   (MANY)     (MANY)
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER:                                                      │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │                                                                     │
 *   │ SELECT = "fetch data from the database"                             │
 *   │ *      = "all columns" (give me everything about the row)           │
 *   │ FROM   = "look in this table"                                       │
 *   │ WHERE  = "only rows matching this condition"                        │
 *   │                                                                     │
 *   │ ONE = returns 1 row (going UP to parent via FK on THIS table)       │
 *   │ MANY = returns multiple rows (going DOWN - FK is on CHILD table)    │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each entity:
 *     entity.client          → "Find the ONE client who owns this entity" (UP)
 *                              SELECT * FROM clients WHERE id = entity.client_id
 *     entity.assets          → "Find ALL assets held by this entity" (DOWN)
 *                              SELECT * FROM assets WHERE entity_id = entity.id
 *     entity.documents       → "Find ALL documents for this entity"
 *                              SELECT * FROM documents WHERE entity_id = entity.id
 *     entity.documentRequests → "Find ALL missing-document requests for this entity"
 *                               SELECT * FROM document_requests WHERE entity_id = entity.id
 *     entity.tasks           → "Find ALL tasks related to this entity"
 *                              SELECT * FROM tasks WHERE entity_id = entity.id
 *
 * QUERY EXAMPLE - Get an entity with its assets and their values:
 *   const entity = await db.query.entities.findFirst({
 *     where: eq(entities.id, entityId),
 *     with: {
 *       client: true,             // ONE - who owns this entity
 *       assets: {                 // MANY - all assets in this entity
 *         with: {
 *           valuations: {         // MANY - valuation history per asset
 *             orderBy: desc(valuations.asOfDate),
 *             limit: 1,           // just the latest
 *           },
 *         },
 *       },
 *     },
 *   });
 *   // entity.name = "Smith Family Trust"
 *   // entity.client.displayName = "John Smith"
 *   // entity.assets[0].name = "123 Main St"
 *   // entity.assets[0].valuations[0].value = "500000"
 *
 * QUERY EXAMPLE - Get entity with all its documents:
 *   const entity = await db.query.entities.findFirst({
 *     where: eq(entities.id, entityId),
 *     with: {
 *       documents: true,
 *       documentRequests: {
 *         where: eq(documentRequests.status, "open"),
 *       },
 *     },
 *   });
 *   // entity.documents = [{ name: "Trust Agreement.pdf" }, ...]
 *   // entity.documentRequests = [{ title: "2023 Tax Return" }, ...]
 */
export const entitiesRelations = relations(entities, ({ one, many }) => ({
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ client: one(clients, { fields: [...], references: [...] })          │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ ONE RELATIONSHIP: Entity belongs to ONE Client (going UP)           │
   * │                                                                     │
   * │ In plain English: "An entity belongs to exactly ONE client"         │
   * │                                                                     │
   * │ one(clients, { ... })                                               │
   * │   First argument: The table we're relating TO (clients)             │
   * │                                                                     │
   * │ fields: [entities.clientId]                                         │
   * │   "Which column on THIS table (entities) holds the reference?"      │
   * │   Answer: client_id - it's our Foreign Key                          │
   * │                                                                     │
   * │ references: [clients.id]                                            │
   * │   "Which column on THAT table (clients) are we pointing to?"        │
   * │   Answer: id - it's the Primary Key of clients                      │
   * │                                                                     │
   * │ VISUAL:                                                             │
   * │   clients.id (PK)  ◄───────  entities.clientId (FK)                 │
   * │   ▲ references               ▲ fields                               │
   * │                                                                     │
   * │ SQL EQUIVALENT:                                                     │
   * │   SELECT * FROM clients WHERE id = entity.client_id                 │
   * │                                                                     │
   * │ USAGE IN CODE:                                                      │
   * │   const entity = await db.query.entities.findFirst({                │
   * │     with: { client: true }  // ← Include the related client         │
   * │   });                                                               │
   * │   console.log(entity.client.displayName); // "John Smith"           │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  client: one(clients, {
    fields: [entities.clientId],  // Foreign Key on THIS table (entities)
    references: [clients.id],     // Primary Key on PARENT table (clients)
  }),

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ assets: many(assets)                                                │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ MANY RELATIONSHIP: Entity has MANY Assets (going DOWN)              │
   * │                                                                     │
   * │ In plain English: "An entity can hold multiple assets"              │
   * │ (One LLC might hold: 3 properties, 2 investment accounts, etc.)     │
   * │                                                                     │
   * │ many(assets)                                                        │
   * │   We just pass the table name - that's it!                          │
   * │   Drizzle figures out the connection from assets.ts where we        │
   * │   defined: one(entities, { fields: [assets.entityId], ... })        │
   * │                                                                     │
   * │ VISUAL:                                                             │
   * │   entities.id (PK)  ───────►  assets.entityId (FK)                  │
   * │   "One entity"        has     "Many assets"                         │
   * │                                                                     │
   * │ SQL EQUIVALENT:                                                     │
   * │   SELECT * FROM assets WHERE entity_id = entity.id                  │
   * │                                                                     │
   * │ USAGE IN CODE:                                                      │
   * │   const entity = await db.query.entities.findFirst({                │
   * │     with: { assets: true }  // ← Include all related assets         │
   * │   });                                                               │
   * │   console.log(entity.assets);                                       │
   * │   // [{ name: "123 Main St" }, { name: "Vanguard Account" }]        │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  assets: many(assets),

  /**
   * documents: many(documents)
   *
   * "An entity has MANY documents"
   *
   * Examples of entity-level documents:
   *   - Operating agreement (for LLC)
   *   - Trust document (for Trust)
   *   - Articles of incorporation (for Corporation)
   *   - Annual report filings
   */
  documents: many(documents),

  /**
   * documentRequests: many(documentRequests)
   *
   * "An entity has MANY document requests"
   *
   * When a document is missing, we create a request.
   * Example: "Please upload the 2023 annual report for Smith LLC"
   */
  documentRequests: many(documentRequests),

  /**
   * tasks: many(tasks)
   *
   * "An entity has MANY tasks"
   *
   * Workflow tasks related to this entity.
   * Example: "File annual report for Smith LLC by December 31"
   */
  tasks: many(tasks),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Entity = typeof entities.$inferSelect
 *
 * Creates a TypeScript type representing an ENTITY ROW from the database.
 * Used when you SELECT data FROM the database.
 *
 * $inferSelect = "Infer the type for selecting data"
 *
 * USAGE:
 *   const entity: Entity = await db.query.entities.findFirst();
 *   entity.name        // TypeScript knows this is string
 *   entity.entityType  // TypeScript knows this is "personal" | "llc" | "trust" | ...
 *   entity.jurisdiction // TypeScript knows this is string | null
 */
export type Entity = typeof entities.$inferSelect;

/**
 * export type NewEntity = typeof entities.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new entity.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * $inferInsert = "Infer the type for inserting data"
 *
 * USAGE:
 *   const newEntity: NewEntity = {
 *     clientId: "abc-123",        // Required (FK to client)
 *     name: "Smith Family Trust", // Required
 *     entityType: "trust",        // Required (must be valid enum value)
 *     // jurisdiction, taxId, metadata, etc. are optional
 *   };
 *   await db.insert(entities).values(newEntity);
 */
export type NewEntity = typeof entities.$inferInsert;
