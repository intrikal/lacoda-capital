/**
 * ============================================================================
 * IMPORTS EXPLAINED
 * ============================================================================
 *
 * Kevin, imports bring in code from other files so we can use it here.
 * Each import is explained below.
 */

/**
 * import { relations } from "drizzle-orm"
 *
 * WHAT: Imports the "relations" function from the Drizzle ORM library.
 * WHY:  We use this to define HOW tables connect to each other.
 *       For example, "an org has many clients".
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
 *
 * BREAKDOWN:
 *   pgTable   = Function to CREATE a new database table
 *   uuid      = Column type for UUIDs (random unique identifiers)
 *   text      = Column type for text/strings
 *   timestamp = Column type for dates and times
 *   jsonb     = Column type for JSON data (flexible structured data)
 *   index     = Function to create database indexes (makes queries faster)
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
} from "drizzle-orm/pg-core";

/**
 * These imports bring in OTHER TABLES that have relationships with orgs.
 * We need them to define the relationships in orgsRelations below.
 *
 * WHY import tables?
 *   When we say "an org has many clients", Drizzle needs to know
 *   what the "clients" table is. So we import it.
 */
import { orgMembers } from "./org_members";
import { clients } from "./clients";
import { documents } from "./documents";
import { integrations } from "./integrations";
import { reports } from "./reports";
import { tasks } from "./tasks";

/**
 * ============================================================================
 * ORGS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the ORGANIZATIONS table - the top-level tenant in our system.
 *
 * WHAT IS A TENANT?
 *   In multi-tenant applications, each "tenant" is a separate customer/organization.
 *   All their data is isolated from other tenants.
 *
 *   Example:
 *   - Tenant 1: "Acme Wealth Management" - has their own clients, documents, etc.
 *   - Tenant 2: "Best Financial Advisors" - completely separate data
 *
 *   Every other table in our system has an "org_id" column that links back here.
 *   This ensures Tenant 1 can never see Tenant 2's data.
 */

/**
 * export const orgs = pgTable(...)
 *
 * BREAKDOWN:
 *   export = Makes this available for other files to import
 *            Other files can do: import { orgs } from "./orgs"
 *
 *   const  = Declares a constant (a value that won't change)
 *            We're creating a table definition, not a variable that changes.
 *
 *   orgs   = The name we give this table in our TypeScript code
 *            We'll use it like: db.query.orgs.findMany()
 *
 *   pgTable = The function that creates a PostgreSQL table definition
 *             It takes 3 arguments (explained below)
 */
export const orgs = pgTable(
  /**
   * FIRST ARGUMENT: "orgs"
   *
   * This is the actual name of the table IN THE DATABASE.
   * When Drizzle generates SQL, it will use this name:
   *   CREATE TABLE "orgs" (...)
   *   SELECT * FROM "orgs"
   *
   * NAMING CONVENTION: We use plural, snake_case names.
   *   - "orgs" not "org" (plural)
   *   - "org_members" not "orgMembers" (snake_case)
   */
  "orgs",

  /**
   * SECOND ARGUMENT: { columns }
   *
   * This object defines ALL the columns in the table.
   * Each key becomes a column name, each value defines the column type.
   */
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column.                                │
     * │                                                                     │
     * │ Let's break down each part:                                         │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In code, we use: orgs.id            │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT IS UUID?                                               │   │
     * │   │                                                             │   │
     * │   │ UUID = Universally Unique Identifier                        │   │
     * │   │                                                             │   │
     * │   │ It's a 36-character random string like:                     │   │
     * │   │   "550e8400-e29b-41d4-a716-446655440000"                     │   │
     * │   │                                                             │   │
     * │   │ WHY USE UUID instead of numbers (1, 2, 3...)?               │   │
     * │   │                                                             │   │
     * │   │ 1. SECURITY: UUIDs are impossible to guess                  │   │
     * │   │    - Numbers: Someone could try /org/1, /org/2, /org/3...   │   │
     * │   │    - UUIDs: Can't guess "550e8400-e29b-41d4-a716-..."       │   │
     * │   │                                                             │   │
     * │   │ 2. DISTRIBUTED: Can generate IDs before inserting           │   │
     * │   │    - Numbers: Must insert row to get the ID                 │   │
     * │   │    - UUIDs: Generate on frontend, then insert               │   │
     * │   │                                                             │   │
     * │   │ 3. GLOBALLY UNIQUE: Unique across ALL tables, ALL databases │   │
     * │   │    - Numbers: ID "1" exists in every table                  │   │
     * │   │    - UUIDs: Each ID is unique everywhere                    │   │
     * │   │                                                             │   │
     * │   │ The "id" in uuid("id") is the column name in the database.  │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT IS A PRIMARY KEY (PK)?                                 │   │
     * │   │                                                             │   │
     * │   │ The Primary Key is THE unique identifier for each row.      │   │
     * │   │                                                             │   │
     * │   │ Think of it like a Social Security Number:                  │   │
     * │   │   - Every person has exactly ONE SSN                        │   │
     * │   │   - No two people have the same SSN                         │   │
     * │   │   - You can find any person by their SSN                    │   │
     * │   │                                                             │   │
     * │   │ RULES FOR PRIMARY KEYS:                                     │   │
     * │   │                                                             │   │
     * │   │ 1. UNIQUE - No two rows can have the same value             │   │
     * │   │    If org "abc-123" exists, you CANNOT create another       │   │
     * │   │    org with id "abc-123". The database will reject it.      │   │
     * │   │                                                             │   │
     * │   │ 2. NOT NULL - Every row MUST have a Primary Key             │   │
     * │   │    You cannot create an org without an id.                  │   │
     * │   │    (But .defaultRandom() generates one automatically)       │   │
     * │   │                                                             │   │
     * │   │ 3. IMMUTABLE - Should never change once set                 │   │
     * │   │    Once an org has id "abc-123", don't change it.           │   │
     * │   │    Other tables reference this id; changing it breaks them. │   │
     * │   │                                                             │   │
     * │   │ WHY DO WE NEED A PRIMARY KEY?                               │   │
     * │   │                                                             │   │
     * │   │ 1. To FIND a specific row:                                  │   │
     * │   │    "Get the org with id abc-123"                            │   │
     * │   │    SELECT * FROM orgs WHERE id = 'abc-123'                  │   │
     * │   │                                                             │   │
     * │   │ 2. To UPDATE a specific row:                                │   │
     * │   │    "Change the name of org abc-123"                         │   │
     * │   │    UPDATE orgs SET name = 'New Name' WHERE id = 'abc-123'   │   │
     * │   │                                                             │   │
     * │   │ 3. For RELATIONSHIPS (Foreign Keys):                        │   │
     * │   │    Other tables point to this Primary Key.                  │   │
     * │   │    clients.org_id → orgs.id                                 │   │
     * │   │    "This client belongs to this org"                        │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHAT DOES .defaultRandom() DO?                              │   │
     * │   │                                                             │   │
     * │   │ If you don't provide an id when inserting, the database     │   │
     * │   │ will automatically generate a random UUID.                  │   │
     * │   │                                                             │   │
     * │   │ WITHOUT .defaultRandom():                                   │   │
     * │   │   await db.insert(orgs).values({                            │   │
     * │   │     id: "550e8400-...",  // YOU must provide id             │   │
     * │   │     name: "Acme"                                            │   │
     * │   │   });                                                       │   │
     * │   │                                                             │   │
     * │   │ WITH .defaultRandom():                                      │   │
     * │   │   await db.insert(orgs).values({                            │   │
     * │   │     name: "Acme"         // id is auto-generated!           │   │
     * │   │   });                                                       │   │
     * │   │   // Database creates id: "7f3b8c2a-..."                    │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * name: text("name").notNull()
     *
     * text("name")
     *   Creates a TEXT column named "name" in the database.
     *   TEXT can hold any string of any length: "Acme", "Best Wealth Management", etc.
     *
     * .notNull()
     *   ┌─────────────────────────────────────────────────────────────┐
     *   │ WHAT DOES .notNull() DO?                                    │
     *   │                                                             │
     *   │ This column CANNOT be empty (null). Every org MUST have a   │
     *   │ name.                                                       │
     *   │                                                             │
     *   │ If you try to insert an org without a name:                 │
     *   │   await db.insert(orgs).values({ slug: "acme" });           │
     *   │   → DATABASE ERROR: "name cannot be null"                   │
     *   │                                                             │
     *   │ WITHOUT .notNull() (nullable column):                       │
     *   │   - The value CAN be empty (null)                           │
     *   │   - The field is optional                                   │
     *   │                                                             │
     *   │ WITH .notNull() (required column):                          │
     *   │   - The value CANNOT be empty                               │
     *   │   - You MUST provide a value when inserting                 │
     *   └─────────────────────────────────────────────────────────────┘
     */
    name: text("name").notNull(),

    /**
     * slug: text("slug").notNull().unique()
     *
     * text("slug")
     *   A TEXT column named "slug".
     *
     *   WHAT IS A SLUG?
     *   A URL-friendly version of a name. Used in web addresses.
     *   - Name: "Acme Wealth Management"
     *   - Slug: "acme-wealth-management"
     *   - URL:  https://app.com/org/acme-wealth-management
     *
     * .notNull()
     *   Every org must have a slug. (Explained above)
     *
     * .unique()
     *   ┌─────────────────────────────────────────────────────────────┐
     *   │ WHAT DOES .unique() DO?                                     │
     *   │                                                             │
     *   │ No two orgs can have the same slug.                         │
     *   │                                                             │
     *   │ If "acme" exists and you try to create another "acme":      │
     *   │   await db.insert(orgs).values({                            │
     *   │     name: "Another Acme",                                   │
     *   │     slug: "acme"  // ← Already exists!                      │
     *   │   });                                                       │
     *   │   → DATABASE ERROR: "duplicate key violates unique"         │
     *   │                                                             │
     *   │ DIFFERENCE FROM PRIMARY KEY:                                │
     *   │ - Primary Key: THE unique identifier (only one per table)   │
     *   │ - Unique: ANY column can be unique (multiple allowed)       │
     *   │                                                             │
     *   │ WHY MAKE SLUG UNIQUE?                                       │
     *   │ - We use slug in URLs: /org/acme                            │
     *   │ - If two orgs had slug "acme", the URL would be ambiguous   │
     *   └─────────────────────────────────────────────────────────────┘
     */
    slug: text("slug").notNull().unique(),

    /**
     * settings: jsonb("settings").$type<OrgSettings>().default({})
     *
     * jsonb("settings")
     *   ┌─────────────────────────────────────────────────────────────┐
     *   │ WHAT IS JSONB?                                              │
     *   │                                                             │
     *   │ JSONB = JavaScript Object Notation, Binary format           │
     *   │                                                             │
     *   │ It stores structured data (objects, arrays) in the database.│
     *   │                                                             │
     *   │ Example value:                                              │
     *   │ {                                                           │
     *   │   "timezone": "America/New_York",                           │
     *   │   "currency": "USD",                                        │
     *   │   "features": { "clientPortal": true }                      │
     *   │ }                                                           │
     *   │                                                             │
     *   │ WHY USE JSONB instead of separate columns?                  │
     *   │                                                             │
     *   │ FLEXIBILITY: Settings vary per org. One org might have      │
     *   │ "theme", another might have "timezone". With JSONB, we      │
     *   │ don't need to add new columns for every possible setting.   │
     *   │                                                             │
     *   │ TRADEOFF: Less strict than separate columns. TypeScript     │
     *   │ types help, but the database won't validate the structure.  │
     *   └─────────────────────────────────────────────────────────────┘
     *
     * .$type<OrgSettings>()
     *   Tells TypeScript what SHAPE the JSON should have.
     *   OrgSettings is defined below - it's a TypeScript interface.
     *   This gives us autocomplete and type checking in our code.
     *
     * .default({})
     *   If no settings are provided, use an empty object {}.
     *   New orgs start with no settings, and they can be added later.
     */
    settings: jsonb("settings").$type<OrgSettings>().default({}),

    /**
     * createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
     *
     * timestamp("created_at", { withTimezone: true })
     *   ┌─────────────────────────────────────────────────────────────┐
     *   │ WHAT IS A TIMESTAMP?                                        │
     *   │                                                             │
     *   │ A timestamp stores a specific point in time:                │
     *   │   - Date: January 15, 2024                                  │
     *   │   - Time: 10:30:45 AM                                       │
     *   │   - Timezone: Eastern Time (UTC-5)                          │
     *   │                                                             │
     *   │ Example value: "2024-01-15T10:30:45-05:00"                   │
     *   │                                                             │
     *   │ { withTimezone: true }                                      │
     *   │   Store the timezone too. Important for global apps.        │
     *   │   - With timezone: "10:30 AM Eastern Time"                  │
     *   │   - Without timezone: "10:30 AM" (which timezone??)         │
     *   └─────────────────────────────────────────────────────────────┘
     *
     * .notNull()
     *   Every row must have a created_at timestamp.
     *
     * .defaultNow()
     *   ┌─────────────────────────────────────────────────────────────┐
     *   │ WHAT DOES .defaultNow() DO?                                 │
     *   │                                                             │
     *   │ If you don't provide a value, use the CURRENT TIME.         │
     *   │                                                             │
     *   │ When you insert a new org at 3:45 PM:                       │
     *   │   await db.insert(orgs).values({ name: "Acme", slug: "acme" });│
     *   │   // created_at is automatically set to 3:45 PM             │
     *   │                                                             │
     *   │ This is handled by the DATABASE, not JavaScript.            │
     *   │ The database uses its own clock (more reliable).            │
     *   └─────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
     *
     * Same as createdAt (timestamp, notNull, defaultNow), plus:
     *
     * .$onUpdate(() => new Date())
     *   ┌─────────────────────────────────────────────────────────────┐
     *   │ WHAT DOES .$onUpdate() DO?                                  │
     *   │                                                             │
     *   │ Automatically updates this timestamp whenever the row is    │
     *   │ modified.                                                   │
     *   │                                                             │
     *   │ EXAMPLE:                                                    │
     *   │   1. Create org at 3:00 PM                                  │
     *   │      → created_at: 3:00 PM, updated_at: 3:00 PM             │
     *   │                                                             │
     *   │   2. Update org name at 5:00 PM                             │
     *   │      → created_at: 3:00 PM (unchanged)                      │
     *   │      → updated_at: 5:00 PM (automatically updated!)         │
     *   │                                                             │
     *   │ WHY IS THIS USEFUL?                                         │
     *   │   - Track when data was last modified                       │
     *   │   - Sync with external systems ("give me changes since X")  │
     *   │   - Audit trail ("when was this org last touched?")         │
     *   │                                                             │
     *   │ NOTE: This is handled by DRIZZLE, not the database.         │
     *   │ Drizzle adds the new Date() when it generates the UPDATE.   │
     *   └─────────────────────────────────────────────────────────────┘
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

  /**
   * THIRD ARGUMENT: (table) => [indexes]
   *
   * This is a function that returns an array of INDEXES.
   * The function receives the table so we can reference columns.
   */
  (table) => [
    /**
     * index("orgs_slug_idx").on(table.slug)
     *
     * ┌─────────────────────────────────────────────────────────────┐
     * │ WHAT IS AN INDEX?                                           │
     * │                                                             │
     * │ An index is like the index at the back of a book.           │
     * │                                                             │
     * │ WITHOUT an index (like a book with no index):               │
     * │   To find "zebra", read every page until you find it.       │
     * │   With 500 pages, this is SLOW.                             │
     * │                                                             │
     * │ WITH an index (like a book with an index):                  │
     * │   Look up "zebra" in the index → "page 423"                 │
     * │   Go directly to page 423. FAST!                            │
     * │                                                             │
     * │ FOR DATABASES:                                              │
     * │   Without index: "Find org with slug 'acme'"                │
     * │   → Database scans EVERY row looking for 'acme'             │
     * │   → With 1 million rows, this is SLOW                       │
     * │                                                             │
     * │   With index on slug:                                       │
     * │   → Database has a "lookup table" for slugs                 │
     * │   → Finds 'acme' instantly                                  │
     * │                                                             │
     * │ TRADEOFF:                                                   │
     * │   ✓ Indexes make READS faster (SELECT queries)              │
     * │   ✗ Indexes make WRITES slower (INSERT/UPDATE must update   │
     * │     the index too)                                          │
     * │   → Only add indexes for columns you frequently search by   │
     * └─────────────────────────────────────────────────────────────┘
     *
     * index("orgs_slug_idx")
     *   Creates an index named "orgs_slug_idx".
     *   NAMING CONVENTION: tablename_columnname_idx
     *
     * .on(table.slug)
     *   This index is on the "slug" column.
     *   Queries like "SELECT * FROM orgs WHERE slug = 'acme'" are now fast.
     */
    index("orgs_slug_idx").on(table.slug),

    /**
     * index("orgs_created_at_idx").on(table.createdAt)
     *
     * Index on created_at for queries that order by creation date.
     * "SELECT * FROM orgs ORDER BY created_at DESC" (newest first)
     */
    index("orgs_created_at_idx").on(table.createdAt),
  ]
);

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * OrgSettings interface
 *
 * This defines the SHAPE of the JSON stored in the "settings" column.
 *
 * The "?" after each property means it's OPTIONAL.
 * An org might have timezone but not branding, or vice versa.
 */
export interface OrgSettings {
  timezone?: string;          // e.g., "America/New_York"
  dateFormat?: string;        // e.g., "MM/DD/YYYY"
  currency?: string;          // e.g., "USD"
  features?: {
    complianceModule?: boolean;
    clientPortal?: boolean;
    customReports?: boolean;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;    // e.g., "#0D9488"
    accentColor?: string;     // e.g., "#06b6d4"
    customDomain?: string;    // e.g., "portal.acmecapital.com"
    orgDisplayName?: string;  // Override org name in portal header
  };
  retention?: {
    archiveRetentionMonths?: number;       // Auto-delete archived items after N months
    deletedItemRetentionMonths?: number;   // Hard-delete soft-deleted items after N months
  };
}

/**
 * ============================================================================
 * RELATIONS DEFINITION
 * ============================================================================
 *
 * Kevin, relations define HOW tables connect to each other.
 * They don't create any columns - they just tell Drizzle how to JOIN tables.
 */

/**
 * Org Relations (TOP OF THE HIERARCHY - Parent of Everything)
 *
 * Kevin, orgs is the ROOT of our entire data model.
 * Every other table (except users) points up to an org eventually.
 * Orgs only have MANY relationships - they don't "belong to" anything.
 *
 *                          ┌──────────┐
 *                          │   Orgs   │ ◄── YOU ARE HERE (the root)
 *                          └────┬─────┘
 *                               │
 *       ┌───────────┬───────────┼───────────┬───────────┬───────────┐
 *       │           │           │           │           │           │
 *       ▼           ▼           ▼           ▼           ▼           ▼
 *   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
 *   │members │ │clients │ │  docs  │ │integr. │ │reports │ │ tasks  │
 *   │(MANY)  │ │(MANY)  │ │(MANY)  │ │(MANY)  │ │(MANY)  │ │(MANY)  │
 *   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
 *
 * NOTICE: All arrows go DOWN (many). None go UP (one).
 * That's because orgs is the top - it doesn't belong to anything.
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER:                                                      │
 *   │                                                                     │
 *   │ SELECT * FROM clients WHERE org_id = org.id                         │
 *   │   ▲      ▲   ▲        ▲      ▲                                     │
 *   │   │      │   │        │      └─ "match this org's id"               │
 *   │   │      │   │        └─ "only rows WHERE this is true"             │
 *   │   │      │   └─ "look in the clients table"                         │
 *   │   │      └─ "give me ALL columns" (* = everything)                  │
 *   │   └─ "fetch data from the database"                                 │
 *   │                                                                     │
 *   │ In plain English: "Go to the clients table. Find ALL rows whose    │
 *   │ org_id matches this org's id. Give me everything about them."       │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each org:
 *     org.members      → "Find ALL members who belong to this org"
 *                        SELECT * FROM org_members WHERE org_id = org.id
 *     org.clients      → "Find ALL clients who belong to this org"
 *                        SELECT * FROM clients WHERE org_id = org.id
 *     org.documents    → "Find ALL documents stored in this org"
 *                        SELECT * FROM documents WHERE org_id = org.id
 *     org.integrations → "Find ALL external service connections for this org"
 *                        SELECT * FROM integrations WHERE org_id = org.id
 *     org.reports      → "Find ALL reports generated for this org"
 *                        SELECT * FROM reports WHERE org_id = org.id
 *     org.tasks        → "Find ALL tasks in this org's workflow"
 *                        SELECT * FROM tasks WHERE org_id = org.id
 *
 * QUERY EXAMPLE - Get an org with all its clients:
 *   const org = await db.query.orgs.findFirst({
 *     where: eq(orgs.slug, "acme-wealth"),
 *     with: {
 *       clients: true,   // MANY - all clients in this org
 *       members: true,   // MANY - all team members
 *     },
 *   });
 *   // org.name = "Acme Wealth Management"
 *   // org.clients = [{ displayName: "John Smith" }, { displayName: "Jane Doe" }]
 *   // org.members = [{ role: "admin" }, { role: "assistant" }, ...]
 *
 * relations(orgs, ({ many }) => ({ ... }))
 *
 * BREAKDOWN:
 *   relations  = The function to define relationships
 *   orgs       = The table we're defining relations FOR
 *   ({ many }) = We're only using many() here (explained below)
 *                Some tables also use one() - see clients.ts
 */
export const orgsRelations = relations(orgs, ({ many }) => ({
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ members: many(orgMembers)                                           │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ WHAT DOES many() MEAN?                                              │
   * │                                                                     │
   * │ many() means "This table has MANY of that table"                    │
   * │                                                                     │
   * │ In plain English: "An org has MANY members"                         │
   * │ One org might have 5 users, another might have 50.                  │
   * │                                                                     │
   * │ VISUAL:                                                             │
   * │                                                                     │
   * │   orgs (ONE)                    org_members (MANY)                  │
   * │   ┌─────────────┐               ┌─────────────────┐                 │
   * │   │ id (PK)     │──────────────►│ org_id (FK)     │                 │
   * │   │ "abc-123"   │               │ "abc-123"       │ Member 1        │
   * │   │             │               │ "abc-123"       │ Member 2        │
   * │   │             │               │ "abc-123"       │ Member 3        │
   * │   └─────────────┘               └─────────────────┘                 │
   * │                                                                     │
   * │ The org_id Foreign Key is defined in org_members.ts.                │
   * │ Drizzle uses that to figure out the connection.                     │
   * │                                                                     │
   * │ HOW TO USE IN CODE:                                                 │
   * │   const org = await db.query.orgs.findFirst({                       │
   * │     with: { members: true }  // ← Include all members               │
   * │   });                                                               │
   * │   console.log(org.members); // [{ userId: ... }, { userId: ... }]   │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  members: many(orgMembers),

  /**
   * clients: many(clients)
   *
   * "An org has MANY clients"
   * One wealth management firm serves many clients.
   */
  clients: many(clients),

  /**
   * documents: many(documents)
   *
   * "An org has MANY documents"
   * All documents in the vault belong to an org.
   */
  documents: many(documents),

  /**
   * integrations: many(integrations)
   *
   * "An org has MANY integrations"
   * One org might connect to Plaid, QuickBooks, Salesforce, etc.
   */
  integrations: many(integrations),

  /**
   * reports: many(reports)
   *
   * "An org has MANY reports"
   * Portfolio summaries, tax reports, client statements, etc.
   */
  reports: many(reports),

  /**
   * tasks: many(tasks)
   *
   * "An org has MANY tasks"
   * Workflow tasks for the organization's team.
   */
  tasks: many(tasks),
}));

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */

/**
 * export type Org = typeof orgs.$inferSelect
 *
 * Creates a TypeScript type for an ORG ROW from the database.
 * Used when you SELECT (read) data.
 *
 * $inferSelect = "Infer the type for selecting data"
 *
 * USAGE:
 *   const org: Org = await db.query.orgs.findFirst();
 *   org.name       // TypeScript knows this is string
 *   org.settings   // TypeScript knows this is OrgSettings | null
 */
export type Org = typeof orgs.$inferSelect;

/**
 * export type NewOrg = typeof orgs.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new org.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * $inferInsert = "Infer the type for inserting data"
 *
 * USAGE:
 *   const newOrg: NewOrg = {
 *     name: "Acme Wealth",  // Required
 *     slug: "acme-wealth",  // Required
 *     // id, settings, createdAt, updatedAt are optional (have defaults)
 *   };
 *   await db.insert(orgs).values(newOrg);
 */
export type NewOrg = typeof orgs.$inferInsert;
