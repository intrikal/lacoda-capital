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
 * WHERE: "drizzle-orm" is a package we installed via npm (it's in node_modules).
 *
 * Without relations, we could store data but couldn't easily query
 * "give me a client AND all their entities" in one go.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each import is a tool for creating different parts of a table.
 *
 * Let's break down each one:
 *
 * pgTable = Function to create a new database table
 *           Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *
 * uuid    = Column type for UUIDs (Universally Unique Identifier)
 *           A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *           It's a random 36-character string that's practically impossible to guess.
 *
 * text    = Column type for text/strings (like "John Smith" or "john@email.com")
 *           Can hold any length of text.
 *
 * timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *             We use { withTimezone: true } to track the timezone too.
 *
 * jsonb   = Column type for JSON data (JavaScript Object Notation, Binary format)
 *           Allows storing flexible, structured data like:
 *           { "address": { "city": "NYC" }, "tags": ["vip", "new"] }
 *           The "b" in jsonb means "binary" - it's stored efficiently.
 *
 * index   = Function to create database indexes (explained below in the table definition)
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
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition from the orgs.ts file.
 * WHY:  We need to reference orgs.id to create a Foreign Key relationship.
 *       This line says "I need to know about the orgs table so I can point to it."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/orgs.ts
 */
import { orgs } from "./orgs";

/**
 * The following imports bring in other tables that have relationships with clients.
 * We import them so we can define the relationships in clientsRelations below.
 */
import { orgMembers } from "./org_members";
import { entities } from "./entities";
import { documents } from "./documents";
import { documentRequests } from "./document_requests";
import { tasks } from "./tasks";
import { assignments } from "./assignments";

/**
 * ============================================================================
 * CLIENTS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, clients are the people or families your wealth management firm serves.
 * This table stores information about each client.
 */

/**
 * export const clients = pgTable(...)
 *
 * BREAKDOWN:
 *   export   = Makes this available for other files to import
 *   const    = Declares a constant (value that won't change)
 *   clients  = The name we're giving this table in our code
 *   pgTable  = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "clients"     = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes
 */
export const clients = pgTable(
  "clients", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Let's break this down piece by piece:                               │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In our code, we'll use clients.id   │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   UUID = Universally Unique Identifier                              │
     * │   Example value: "550e8400-e29b-41d4-a716-446655440000"             │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ PRIMARY KEY (PK) EXPLAINED:                                 │   │
     * │   │                                                             │   │
     * │   │ A Primary Key is THE unique identifier for each row.       │   │
     * │   │ Think of it like a Social Security Number - no two people  │   │
     * │   │ can have the same one.                                     │   │
     * │   │                                                             │   │
     * │   │ RULES:                                                      │   │
     * │   │ 1. UNIQUE - No two rows can have the same PK value         │   │
     * │   │ 2. NOT NULL - Every row MUST have a PK (can't be empty)    │   │
     * │   │ 3. IMMUTABLE - Should never change once set                │   │
     * │   │                                                             │   │
     * │   │ WHY WE NEED IT:                                             │   │
     * │   │ - To find a specific row: "Get the client with id X"        │   │
     * │   │ - For relationships: Other tables point to this PK         │   │
     * │   │ - For updates: "Update the client with id X"                │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID if you don't provide one.   │
     * │   So when you insert a new client, you don't have to create the ID. │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull().references(() => orgs.id, {...})    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) - the most important concept to learn!  │
     * │                                                                     │
     * │ orgId:                                                              │
     * │   TypeScript property name. We use clients.orgId in code.           │
     * │   Note: camelCase in TypeScript, but snake_case in database.        │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" in the database.                  │
     * │   It stores a UUID (same format as the id column).                  │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ NOT NULL EXPLAINED:                                         │   │
     * │   │                                                             │   │
     * │   │ This column CANNOT be empty. Every client MUST have an org. │   │
     * │   │                                                             │   │
     * │   │ If you try to insert a client without org_id:               │   │
     * │   │   INSERT INTO clients (display_name) VALUES ('John')        │   │
     * │   │   → DATABASE ERROR: "org_id cannot be null"                 │   │
     * │   │                                                             │   │
     * │   │ Without .notNull(), the column would be NULLABLE:           │   │
     * │   │   - The value CAN be empty (null)                           │   │
     * │   │   - The relationship is optional                            │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ FOREIGN KEY (FK) EXPLAINED:                                 │   │
     * │   │                                                             │   │
     * │   │ A Foreign Key is a column that POINTS TO another table's   │   │
     * │   │ Primary Key. It creates a RELATIONSHIP between tables.      │   │
     * │   │                                                             │   │
     * │   │ .references(() => orgs.id)                                  │   │
     * │   │   "This column's value must exist in orgs.id"               │   │
     * │   │                                                             │   │
     * │   │ WHAT THIS MEANS:                                            │   │
     * │   │ - org_id column holds values like "abc-123"                 │   │
     * │   │ - That "abc-123" MUST exist in the orgs table's id column  │   │
     * │   │ - If you try to use a non-existent org_id, DATABASE ERROR!  │   │
     * │   │                                                             │   │
     * │   │ VISUAL:                                                     │   │
     * │   │   orgs table              clients table                     │   │
     * │   │   ┌────────────┐          ┌────────────────────┐            │   │
     * │   │   │ id (PK)    │◄─────────│ org_id (FK)        │            │   │
     * │   │   │ "abc-123"  │          │ "abc-123"          │            │   │
     * │   │   │ "def-456"  │          │ id (PK)            │            │   │
     * │   │   └────────────┘          │ display_name       │            │   │
     * │   │        ▲                  └────────────────────┘            │   │
     * │   │        │                                                    │   │
     * │   │   This is the              This POINTS TO                   │   │
     * │   │   Primary Key              that Primary Key                 │   │
     * │   │   (the source)             (the reference)                  │   │
     * │   │                                                             │   │
     * │   │ { onDelete: "cascade" }                                     │   │
     * │   │   ┌─────────────────────────────────────────────────────┐   │   │
     * │   │   │ ON DELETE OPTIONS:                                  │   │   │
     * │   │   │                                                     │   │   │
     * │   │   │ What happens if the PARENT row is deleted?          │   │   │
     * │   │   │ (If we delete the org, what happens to its clients?)│   │   │
     * │   │   │                                                     │   │   │
     * │   │   │ "cascade" = DELETE the children too                 │   │   │
     * │   │   │   Delete org → All clients in that org are deleted  │   │   │
     * │   │   │   (Like deleting a folder deletes all files inside) │   │   │
     * │   │   │                                                     │   │   │
     * │   │   │ "set null" = Keep children, set FK to NULL          │   │   │
     * │   │   │   Delete org → Clients remain, but org_id = NULL    │   │   │
     * │   │   │   (Orphaned records)                                │   │   │
     * │   │   │                                                     │   │   │
     * │   │   │ "restrict" = PREVENT deletion if children exist     │   │   │
     * │   │   │   Try to delete org → ERROR "clients still exist"   │   │   │
     * │   │   │   (Must delete clients first)                       │   │   │
     * │   │   │                                                     │   │   │
     * │   │   │ We use "cascade" because if an org is deleted,      │   │   │
     * │   │   │ its clients should go too (they belong to that org).│   │   │
     * │   │   └─────────────────────────────────────────────────────┘   │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * displayName: text("display_name").notNull()
     *
     * text("display_name")
     *   Creates a text column named "display_name" in the database.
     *   Can hold any string: "John Smith", "Acme Corporation", etc.
     *
     * .notNull()
     *   Every client MUST have a display name. It cannot be empty.
     */
    displayName: text("display_name").notNull(),

    /**
     * email: text("email")
     *
     * text("email")
     *   Creates a text column named "email".
     *
     * NO .notNull() means this is NULLABLE:
     *   - The value CAN be empty (null)
     *   - Email is optional for a client
     */
    email: text("email"),

    /**
     * phone: text("phone")
     *
     * Same as email - optional text field for phone number.
     */
    phone: text("phone"),

    /**
     * externalId: text("external_id")
     *
     * Optional field to store an ID from an external system (like a CRM).
     * Useful for syncing data between systems.
     */
    externalId: text("external_id"),

    /**
     * profile: jsonb("profile").$type<ClientProfile>().default({})
     *
     * jsonb("profile")
     *   Creates a JSONB column. JSONB stores structured data like:
     *   { "address": { "city": "NYC" }, "tags": ["vip"] }
     *
     * .$type<ClientProfile>()
     *   Tells TypeScript what shape the JSON should have.
     *   ClientProfile is defined below - it's a TypeScript interface.
     *   This gives us autocomplete and type checking!
     *
     * .default({})
     *   If no value is provided, use an empty object {}.
     */
    profile: jsonb("profile").$type<ClientProfile>().default({}),

    /**
     * createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
     *
     * timestamp("created_at", { withTimezone: true })
     *   Creates a timestamp column that stores date AND time.
     *   { withTimezone: true } = Also stores timezone info (important for global apps)
     *   Example value: "2024-01-15T10:30:00+05:00"
     *
     * .notNull()
     *   Every row must have a created_at time.
     *
     * .defaultNow()
     *   If not provided, use the current time when the row is inserted.
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
     *
     * Same as createdAt, plus:
     *
     * .$onUpdate(() => new Date())
     *   AUTOMATICALLY update this timestamp whenever the row is modified.
     *   This is handled by Drizzle, not the database itself.
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
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ WHAT IS AN INDEX?                                                   │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ An index is like the index at the back of a book.                   │
   * │                                                                     │
   * │ Without an index:                                                   │
   * │   To find "zebra", you'd read every page until you find it.         │
   * │   → SLOW for large books                                            │
   * │                                                                     │
   * │ With an index:                                                      │
   * │   Look up "zebra" in the index → "page 347"                         │
   * │   Go directly to page 347.                                          │
   * │   → FAST, even for huge books                                       │
   * │                                                                     │
   * │ For databases:                                                      │
   * │ Without an index:                                                   │
   * │   "Find clients where org_id = X" → scan EVERY row                  │
   * │   With 1 million rows, this is SLOW                                 │
   * │                                                                     │
   * │ With an index on org_id:                                            │
   * │   Database has a "lookup table" for org_id values                   │
   * │   Finds matching rows instantly                                     │
   * │                                                                     │
   * │ TRADEOFF:                                                           │
   * │ - Indexes make READS faster (SELECT queries)                        │
   * │ - Indexes make WRITES slower (INSERT/UPDATE - must update index)    │
   * │ - Only add indexes for columns you frequently search/filter by      │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  (table) => [
    /**
     * index("clients_org_id_idx").on(table.orgId)
     *
     * Creates an index named "clients_org_id_idx" on the org_id column.
     *
     * WHY: Every query will filter by org (for multi-tenant isolation).
     *      "SELECT * FROM clients WHERE org_id = 'abc-123'"
     *      This index makes that query fast.
     *
     * NAMING: table_column_idx is a common convention.
     */
    index("clients_org_id_idx").on(table.orgId),

    /**
     * index("clients_org_created_at_idx").on(table.orgId, table.createdAt)
     *
     * A COMPOSITE INDEX on TWO columns: org_id AND created_at.
     *
     * WHY: For queries like "Get clients in org X, ordered by creation date"
     *      SELECT * FROM clients WHERE org_id = 'abc-123' ORDER BY created_at
     */
    index("clients_org_created_at_idx").on(table.orgId, table.createdAt),

    /**
     * More indexes for common query patterns.
     */
    index("clients_org_external_id_idx").on(table.orgId, table.externalId),
    index("clients_org_email_idx").on(table.orgId, table.email),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ClientProfile interface
 *
 * This defines the SHAPE of the JSON stored in the "profile" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 */
export interface ClientProfile {
  clientType?: "individual" | "institution" | "trust" | "fund";
  clientStatus?: "active" | "inactive" | "prospect";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  dateOfBirth?: string;
  onboardedAt?: string;
  relationshipManager?: string;
  referralSource?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// ============================================================================
// RELATIONS DEFINITION
// ============================================================================

/**
 * Client Relations (MID-LEVEL - Has Parent AND Children)
 *
 * Kevin, clients sit in the MIDDLE of the hierarchy.
 * They belong to ONE org (up), and have MANY entities, docs, tasks, etc. (down).
 *
 *                ┌──────┐
 *                │ Org  │
 *                └──┬───┘
 *                   │ one (UP)
 *                   ▼
 *              ┌──────────┐
 *              │ Clients  │ ◄── YOU ARE HERE
 *              └────┬─────┘
 *                   │ many (DOWN)
 *     ┌─────────┬───┴────┬──────────┬──────────┬──────────┐
 *     │         │        │          │          │          │
 *     ▼         ▼        ▼          ▼          ▼          ▼
 *  entities  orgMembers docs   docRequests  tasks   assignments
 *  (MANY)    (MANY)     (MANY)  (MANY)      (MANY)  (MANY)
 *
 * NAVIGATION:
 *   Going UP:   client.org         → one(orgs, ...)
 *   Going DOWN: client.entities    → many(entities)
 *               client.documents   → many(documents)
 *               ...etc
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
 *   │ ONE vs MANY:                                                        │
 *   │   ONE  = the WHERE returns exactly 1 row (unique match)             │
 *   │   MANY = the WHERE returns multiple rows (several matches)          │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each client:
 *     client.org              → "Find the ONE org this client belongs to" (UP)
 *                               SELECT * FROM orgs WHERE id = client.org_id
 *     client.entities         → "Find ALL legal entities this client owns" (DOWN)
 *                               SELECT * FROM entities WHERE client_id = client.id
 *     client.orgMembers       → "Find ALL user memberships linked to this client"
 *                               SELECT * FROM org_members WHERE client_id = client.id
 *     client.documents        → "Find ALL documents for this client"
 *                               SELECT * FROM documents WHERE client_id = client.id
 *     client.documentRequests → "Find ALL document requests for this client"
 *                               SELECT * FROM document_requests WHERE client_id = client.id
 *     client.tasks            → "Find ALL tasks related to this client"
 *                               SELECT * FROM tasks WHERE client_id = client.id
 *     client.assignments      → "Find ALL assistant assignments for this client"
 *                               SELECT * FROM assignments WHERE client_id = client.id
 *
 * QUERY EXAMPLE - Get a client with their full entity/asset tree:
 *   const client = await db.query.clients.findFirst({
 *     where: eq(clients.id, clientId),
 *     with: {
 *       org: true,                   // ONE - which org
 *       entities: {                  // MANY - all entities
 *         with: {
 *           assets: {                // MANY - all assets per entity
 *             with: {
 *               valuations: true,    // MANY - all valuations per asset
 *             },
 *           },
 *         },
 *       },
 *     },
 *   });
 *   // client.org.name = "Acme Wealth"
 *   // client.entities[0].name = "Smith Family Trust"
 *   // client.entities[0].assets[0].name = "123 Main St"
 *   // client.entities[0].assets[0].valuations[0].value = "500000"
 *
 * QUERY EXAMPLE - Get a client with their assigned assistants:
 *   const client = await db.query.clients.findFirst({
 *     where: eq(clients.id, clientId),
 *     with: {
 *       assignments: {
 *         with: { assistant: true },
 *       },
 *     },
 *   });
 *   // client.assignments[0].assistant → the org_member record
 */
export const clientsRelations = relations(clients, ({ one, many }) => ({
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ org: one(orgs, { fields: [...], references: [...] })                │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ ONE RELATIONSHIP EXPLAINED:                                         │
   * │                                                                     │
   * │ one() means "This table belongs to ONE of that table"               │
   * │                                                                     │
   * │ In plain English: "A client belongs to exactly ONE org"             │
   * │                                                                     │
   * │ one(orgs, { ... })                                                  │
   * │   First argument: The table we're relating TO (orgs)                │
   * │                                                                     │
   * │ fields: [clients.orgId]                                             │
   * │   "Which column on THIS table (clients) holds the reference?"       │
   * │   Answer: org_id - it's our Foreign Key                             │
   * │                                                                     │
   * │ references: [orgs.id]                                               │
   * │   "Which column on THAT table (orgs) are we pointing to?"           │
   * │   Answer: id - it's the Primary Key of orgs                         │
   * │                                                                     │
   * │ VISUAL:                                                             │
   * │   orgs.id (PK)  ◄───────  clients.orgId (FK)                        │
   * │   ▲ references            ▲ fields                                  │
   * │                                                                     │
   * │ USAGE IN CODE:                                                      │
   * │   const client = await db.query.clients.findFirst({                 │
   * │     with: { org: true }  // ← Include the related org               │
   * │   });                                                               │
   * │   console.log(client.org.name); // "Acme Wealth Management"         │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  org: one(orgs, {
    fields: [clients.orgId],     // Foreign Key on THIS table (clients)
    references: [orgs.id],       // Primary Key on THAT table (orgs)
  }),

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ entities: many(entities)                                            │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ MANY RELATIONSHIP EXPLAINED:                                        │
   * │                                                                     │
   * │ many() means "This table has MANY of that table"                    │
   * │                                                                     │
   * │ In plain English: "A client can have MANY entities"                 │
   * │ (One client might have: personal account, LLC, trust, etc.)         │
   * │                                                                     │
   * │ many(entities)                                                      │
   * │   We just pass the table name - that's it!                          │
   * │   Drizzle figures out the connection from entities.ts where we      │
   * │   defined: one(clients, { fields: [entities.clientId], ... })       │
   * │                                                                     │
   * │ VISUAL:                                                             │
   * │   clients.id (PK)  ───────►  entities.clientId (FK)                 │
   * │   "One client"      has      "Many entities"                        │
   * │                                                                     │
   * │ USAGE IN CODE:                                                      │
   * │   const client = await db.query.clients.findFirst({                 │
   * │     with: { entities: true }  // ← Include all related entities     │
   * │   });                                                               │
   * │   console.log(client.entities);                                     │
   * │   // [{ name: "Smith LLC" }, { name: "Smith Trust" }]               │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  entities: many(entities),

  /**
   * More MANY relationships - a client can have many of each:
   */
  orgMembers: many(orgMembers),      // Users linked to this client (for client portal)
  documents: many(documents),         // Documents belonging to this client
  documentRequests: many(documentRequests),  // Requests for missing documents
  tasks: many(tasks),                 // Tasks related to this client
  assignments: many(assignments),     // Assistants assigned to this client
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Client = typeof clients.$inferSelect
 *
 * Creates a TypeScript type representing a CLIENT ROW from the database.
 * Used when you SELECT data FROM the database.
 *
 * Example:
 *   const client: Client = await db.query.clients.findFirst();
 *   client.displayName  // TypeScript knows this is a string
 *   client.email        // TypeScript knows this is string | null
 */
export type Client = typeof clients.$inferSelect;

/**
 * export type NewClient = typeof clients.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new client.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * Example:
 *   const newClient: NewClient = {
 *     orgId: "abc-123",           // Required
 *     displayName: "John Smith",  // Required
 *     // email, phone, etc. are optional
 *   };
 *   await db.insert(clients).values(newClient);
 */
export type NewClient = typeof clients.$inferInsert;
