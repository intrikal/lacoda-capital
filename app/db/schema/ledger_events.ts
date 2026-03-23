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
 *       For example, "a ledger event belongs to one org" and
 *       "a ledger event was performed by one user".
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See orgs.ts for full explanation of the relations function.
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
 *               Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *               See orgs.ts for full explanation.
 *
 *   uuid      = Column type for UUIDs (Universally Unique Identifier)
 *               A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *               It's a random 36-character string that's practically impossible to guess.
 *               See orgs.ts for full explanation of why we use UUIDs.
 *
 *   text      = Column type for text/strings (like "192.168.1.1" or "Mozilla/5.0...")
 *               Can hold any length of text.
 *               See orgs.ts for full explanation.
 *
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *               We use { withTimezone: true } to track the timezone too.
 *               See orgs.ts for full explanation of timestamps.
 *
 *   jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format)
 *               Allows storing flexible, structured data like:
 *               { "before": { "status": "active" }, "after": { "status": "sold" } }
 *               The "b" in jsonb means "binary" - it's stored efficiently.
 *               See orgs.ts for full explanation of JSONB.
 *
 *   index     = Function to create database indexes (makes queries faster)
 *               See orgs.ts for full explanation of indexes.
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
 * import { ledgerActionEnum, ledgerTargetTypeEnum } from "./00_enums"
 *
 * WHAT: Imports TWO PostgreSQL enum types from our centralized enums file.
 * WHY:  These enums restrict columns to specific allowed values.
 *       Instead of a free-text column that could contain ANYTHING,
 *       an enum column can ONLY hold values from a predefined list.
 *
 * WHERE: "./00_enums" = same directory, file app/db/schema/00_enums.ts
 *        The "00_" prefix means this file loads first (alphabetical order matters).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ENUMS EXPLAINED:                                                    │
 * │                                                                     │
 * │ ledgerActionEnum:                                                   │
 * │   A list of WHAT HAPPENED. Allowed values include:                  │
 * │   "created", "updated", "deleted", "archived",                      │
 * │   "document_uploaded", "document_verified", "document_expired",     │
 * │   "asset_valued", "asset_transferred", "asset_sold",                │
 * │   "login", "logout", "permission_changed",                          │
 * │   "report_generated", "report_shared",                              │
 * │   "compliance_reviewed", "compliance_approved"                      │
 * │                                                                     │
 * │   If you try to insert action = "banana":                           │
 * │     → DATABASE ERROR: "invalid input value for enum ledger_action"  │
 * │   The database ENFORCES only valid values.                          │
 * │                                                                     │
 * │ ledgerTargetTypeEnum:                                               │
 * │   A list of WHAT TYPE OF THING was acted upon. Allowed values:      │
 * │   "org", "user", "client", "entity", "asset",                      │
 * │   "document", "task", "report"                                      │
 * │                                                                     │
 * │   This tells us which TABLE to look in for the target record.       │
 * │   (More on this in the "polymorphic reference" explanation below.)  │
 * └─────────────────────────────────────────────────────────────────────┘
 */
import { ledgerActionEnum, ledgerTargetTypeEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition from the orgs.ts file.
 * WHY:  We need to reference orgs.id to create a Foreign Key relationship.
 *       Every ledger event belongs to exactly ONE org (for tenant isolation).
 *       This line says "I need to know about the orgs table so I can point to it."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/orgs.ts
 *
 * See clients.ts for full explanation of importing parent tables for FKs.
 */
import { orgs } from "./orgs";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition from the users.ts file.
 * WHY:  We need to reference users.id to create a Foreign Key relationship.
 *       Every ledger event tracks WHO performed the action (the "actor").
 *       This is nullable because some events are triggered by the SYSTEM
 *       (e.g., a cron job marking expired documents), not by a human user.
 * WHERE: "./" means "same directory", so this imports from app/db/schema/users.ts
 */
import { users } from "./users";

/**
 * ============================================================================
 * LEDGER EVENTS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the AUDIT TRAIL table - one of the most CRITICAL tables
 * in the entire system for compliance, debugging, and trust.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN AUDIT TRAIL?                                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ An audit trail is a chronological record of WHO did WHAT, WHEN,        │
 * │ and to WHAT THING. Think of it like a security camera for your data.   │
 * │                                                                        │
 * │ REAL-WORLD EXAMPLES of ledger events:                                  │
 * │   - "Kevin uploaded a document for Smith Trust at 3:45 PM"             │
 * │   - "System marked doc #42 as expired at midnight"                     │
 * │   - "Alice changed Bob's role from 'assistant' to 'admin' at 9:00 AM" │
 * │   - "Kevin valued the Main St property at $500,000 on Jan 15"         │
 * │   - "Jane logged in from IP 192.168.1.100 at 2:30 PM"                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THE APPEND-ONLY PATTERN (CRITICAL CONCEPT)                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This table is APPEND-ONLY. That means:                                 │
 * │                                                                        │
 * │   ALLOWED:     INSERT new rows (recording new events)                  │
 * │   FORBIDDEN:   UPDATE existing rows (changing history)                 │
 * │   FORBIDDEN:   DELETE existing rows (erasing history)                  │
 * │                                                                        │
 * │ Think of it like writing in pen in a notebook:                         │
 * │   - You can write new entries on the next blank page                   │
 * │   - You CANNOT erase or white-out what you already wrote               │
 * │   - You CANNOT tear out pages                                          │
 * │                                                                        │
 * │ WHY IS THIS SO IMPORTANT?                                              │
 * │                                                                        │
 * │ 1. COMPLIANCE: Financial regulators (SEC, FINRA) REQUIRE immutable     │
 * │    audit trails. If an auditor asks "show me all changes to this       │
 * │    asset in 2024", we MUST be able to answer accurately.               │
 * │                                                                        │
 * │ 2. DEBUGGING: When something goes wrong, we can trace back through     │
 * │    the event history. "What was the value of this asset on Dec 31?"    │
 * │    is answerable by looking at the ledger.                             │
 * │                                                                        │
 * │ 3. TRUST: Clients trust that their data history can't be tampered      │
 * │    with. If someone changed a valuation, the ledger proves it.         │
 * │                                                                        │
 * │ 4. LEGAL: In disputes, the ledger provides evidence. "Who deleted      │
 * │    that document?" - the ledger has the answer.                        │
 * │                                                                        │
 * │ CONSEQUENCES FOR THE SCHEMA:                                           │
 * │   - There is NO updated_at column (nothing ever gets updated)          │
 * │   - There is NO .$onUpdate() (nothing ever gets updated)               │
 * │   - Only created_at exists (when the event was recorded)               │
 * │                                                                        │
 * │ STORAGE NOTE:                                                          │
 * │   This table will grow LARGE over time (every action = a new row).     │
 * │   For very large deployments, consider:                                │
 * │   - Partitioning by created_at (split table by month/year)             │
 * │   - Archiving old records to cold storage                              │
 * │   - But NEVER delete records from the active table                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * export const ledgerEvents = pgTable(...)
 *
 * BREAKDOWN:
 *   export       = Makes this available for other files to import
 *                  Other files can do: import { ledgerEvents } from "./ledger_events"
 *
 *   const        = Declares a constant (value that won't change)
 *
 *   ledgerEvents = The name we give this table in our TypeScript code
 *                  We'll use it like: db.query.ledgerEvents.findMany()
 *
 *   pgTable      = The function that creates a PostgreSQL table
 *                  (See orgs.ts for full explanation)
 *
 * pgTable takes 3 arguments:
 *   1. "ledger_events" = The actual table name in the database
 *   2. { columns }     = An object defining all the columns
 *   3. (table) => []   = A function that returns an array of indexes
 */
export const ledgerEvents = pgTable(
  "ledger_events", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column.                                │
     * │ (See orgs.ts for full explanation of Primary Keys and UUIDs)        │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In code: ledgerEvents.id            │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "550e8400-e29b-41d4-a716-446655440000"             │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each row.                    │
     * │   - UNIQUE: No two ledger events can have the same id               │
     * │   - NOT NULL: Every event MUST have an id                           │
     * │   - IMMUTABLE: Should never change once set                         │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when inserting a new event. │
     * │   You don't have to create the ID yourself.                         │
     * │                                                                     │
     * │ USAGE:                                                              │
     * │   "Find the specific event with id X"                               │
     * │   SELECT * FROM ledger_events WHERE id = 'abc-123'                  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull().references(() => orgs.id, {...})    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) - it links every event to an org.       │
     * │ (See clients.ts orgId column for full explanation of Foreign Keys)  │
     * │                                                                     │
     * │ WHY DOES AN AUDIT EVENT NEED AN ORG?                                │
     * │   This is for MULTI-TENANT ISOLATION. In our system, multiple       │
     * │   wealth management firms (orgs) share the same database.           │
     * │   By tagging every event with org_id, we ensure:                    │
     * │   - "Acme Wealth" can only see THEIR audit events                   │
     * │   - "Best Financial" can only see THEIR audit events                │
     * │   - No cross-contamination of audit data between firms              │
     * │                                                                     │
     * │ orgId:                                                              │
     * │   TypeScript property name. We use ledgerEvents.orgId in code.      │
     * │   Note: camelCase in TypeScript, but snake_case ("org_id") in DB.   │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" that stores a UUID.               │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every event MUST belong to an org. Cannot be empty.               │
     * │   If you try to insert an event without org_id:                     │
     * │     → DATABASE ERROR: "org_id cannot be null"                       │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   "This column's value must exist in orgs.id"                       │
     * │   You can't create an event for a non-existent org.                 │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     orgs table              ledger_events table                     │
     * │     ┌────────────┐          ┌────────────────────┐                  │
     * │     │ id (PK)    │◄─────────│ org_id (FK)        │                  │
     * │     │ "abc-123"  │          │ "abc-123"          │                  │
     * │     │ "def-456"  │          │ id (PK)            │                  │
     * │     └────────────┘          │ action             │                  │
     * │          ▲                  │ target_type        │                  │
     * │          │                  └────────────────────┘                  │
     * │     This is the              This POINTS TO                         │
     * │     Primary Key              that Primary Key                       │
     * │     (the source)             (the reference)                        │
     * │                                                                     │
     * │   { onDelete: "cascade" }                                           │
     * │   If an org is deleted, all its audit events are deleted too.        │
     * │   (See clients.ts for full explanation of onDelete options)          │
     * │                                                                     │
     * │   NOTE: In practice, orgs are rarely deleted. But if a firm          │
     * │   leaves the platform entirely, cascading cleans up their data.      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Org scope (for multi-tenant isolation of audit logs)
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ actorUserId: uuid("actor_user_id").references(() => users.id, ...) │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a NULLABLE FOREIGN KEY - it tracks WHO performed the       │
     * │ action, but it's OPTIONAL because some events are system-triggered.│
     * │                                                                     │
     * │ actorUserId:                                                        │
     * │   TypeScript property name. We use ledgerEvents.actorUserId.        │
     * │   "Actor" is a common term meaning "the person who did something".  │
     * │                                                                     │
     * │ uuid("actor_user_id")                                               │
     * │   Creates a column named "actor_user_id" that stores a UUID.        │
     * │                                                                     │
     * │ NO .notNull() - THIS IS INTENTIONALLY NULLABLE!                     │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHY IS THE ACTOR NULLABLE?                                  │   │
     * │   │                                                             │   │
     * │   │ Not every event is caused by a human user.                  │   │
     * │   │                                                             │   │
     * │   │ HUMAN-TRIGGERED events (actor_user_id = a real user):       │   │
     * │   │   - "Kevin uploaded a document"                             │   │
     * │   │   - "Alice changed Bob's role"                              │   │
     * │   │   - "Jane logged in"                                        │   │
     * │   │                                                             │   │
     * │   │ SYSTEM-TRIGGERED events (actor_user_id = NULL):             │   │
     * │   │   - "Cron job marked document #42 as expired at midnight"   │   │
     * │   │   - "Automated report generated for end-of-quarter"         │   │
     * │   │   - "System archived inactive assets after 2 years"         │   │
     * │   │                                                             │   │
     * │   │ When actor_user_id is NULL, we know it was the system,      │   │
     * │   │ not a person. This is important for compliance reporting.    │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   "This column's value must exist in users.id (or be NULL)"         │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     users table              ledger_events table                    │
     * │     ┌────────────┐           ┌──────────────────────┐               │
     * │     │ id (PK)    │◄──────────│ actor_user_id (FK)   │               │
     * │     │ "kevin-1"  │           │ "kevin-1" (Kevin)    │               │
     * │     │ "alice-2"  │           │ "alice-2" (Alice)    │               │
     * │     │            │           │ NULL (system event)  │               │
     * │     └────────────┘           └──────────────────────┘               │
     * │                                                                     │
     * │   { onDelete: "set null" }                                          │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ WHY "set null" INSTEAD OF "cascade"?                        │   │
     * │   │                                                             │   │
     * │   │ If we used "cascade": Delete user → DELETE their events     │   │
     * │   │   BAD! We'd lose audit history. "Who deleted those docs     │   │
     * │   │   in March?" → "We don't know, the events were deleted."    │   │
     * │   │                                                             │   │
     * │   │ With "set null": Delete user → Set actor to NULL            │   │
     * │   │   GOOD! The event SURVIVES. We still know WHAT happened     │   │
     * │   │   and WHEN, we just lose WHO (the user was deleted).        │   │
     * │   │                                                             │   │
     * │   │ This is ESSENTIAL for an append-only audit trail.            │   │
     * │   │ Audit records must NEVER be destroyed, even if the user     │   │
     * │   │ who performed the action is later removed from the system.  │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Who performed the action — REQUIRED for compliance ("WHO did WHAT")
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ targetType: ledgerTargetTypeEnum("target_type").notNull()           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the first half of the POLYMORPHIC TARGET pattern.           │
     * │ Together with targetId below, they answer "WHAT was acted upon?"    │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ POLYMORPHIC TARGET PATTERN EXPLAINED:                           │ │
     * │ │                                                                 │ │
     * │ │ "Polymorphic" means "many forms". This pattern lets ONE column  │ │
     * │ │ (target_id) point to rows in MANY DIFFERENT tables.             │ │
     * │ │                                                                 │ │
     * │ │ THE PROBLEM:                                                    │ │
     * │ │   An audit event can be about an asset, OR a document, OR a     │ │
     * │ │   client, OR a task, OR a user... 8 different things!           │ │
     * │ │                                                                 │ │
     * │ │ THE BAD SOLUTION (what we DON'T do):                            │ │
     * │ │   Have 8 separate FK columns:                                   │ │
     * │ │     asset_id    → references assets.id                          │ │
     * │ │     document_id → references documents.id                       │ │
     * │ │     client_id   → references clients.id                         │ │
     * │ │     task_id     → references tasks.id                           │ │
     * │ │     ...etc                                                      │ │
     * │ │                                                                 │ │
     * │ │   Problem: 7 out of 8 columns would always be NULL.             │ │
     * │ │   Problem: Adding a new target type = adding a new column.      │ │
     * │ │   Problem: Messy and wasteful.                                   │ │
     * │ │                                                                 │ │
     * │ │ THE GOOD SOLUTION (polymorphic - what we DO):                   │ │
     * │ │   Use TWO columns together:                                     │ │
     * │ │     target_type = "asset"     (WHICH table?)                    │ │
     * │ │     target_id   = "abc-123"   (WHICH row in that table?)        │ │
     * │ │                                                                 │ │
     * │ │ EXAMPLES:                                                       │ │
     * │ │   ┌──────────────┬───────────────┬─────────────────────────┐    │ │
     * │ │   │ target_type  │ target_id     │ Means                   │    │ │
     * │ │   ├──────────────┼───────────────┼─────────────────────────┤    │ │
     * │ │   │ "asset"      │ "abc-123"     │ The asset with id abc   │    │ │
     * │ │   │ "document"   │ "def-456"     │ The document with id def│    │ │
     * │ │   │ "client"     │ "ghi-789"     │ The client with id ghi  │    │ │
     * │ │   │ "user"       │ "jkl-012"     │ The user with id jkl    │    │ │
     * │ │   └──────────────┴───────────────┴─────────────────────────┘    │ │
     * │ │                                                                 │ │
     * │ │ WHY CAN'T WE USE A NORMAL FOREIGN KEY FOR THIS?                │ │
     * │ │                                                                 │ │
     * │ │   A Foreign Key says "this column points to ONE specific table".│ │
     * │ │   But target_id can point to assets, documents, clients, etc.   │ │
     * │ │                                                                 │ │
     * │ │   A database FK like:                                           │ │
     * │ │     target_id REFERENCES assets(id)                             │ │
     * │ │   would ONLY allow asset IDs. Document IDs would be rejected.   │ │
     * │ │                                                                 │ │
     * │ │   So we DON'T put a .references() on target_id.                 │ │
     * │ │   Instead, we use target_type to know which table to look in.   │ │
     * │ │                                                                 │ │
     * │ │ ANOTHER REASON - AUDIT RECORDS MUST SURVIVE DELETION:           │ │
     * │ │   If someone deletes an asset, we still want to keep the        │ │
     * │ │   ledger event saying "Kevin valued this asset at $500k".       │ │
     * │ │   A normal FK with "cascade" would delete the event too!        │ │
     * │ │   With the polymorphic pattern, the event survives because      │ │
     * │ │   there's no FK constraint tying it to the deleted asset.       │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * │                                                                     │
     * │ targetType:                                                         │
     * │   TypeScript property name. We use ledgerEvents.targetType.         │
     * │                                                                     │
     * │ ledgerTargetTypeEnum("target_type")                                 │
     * │   Creates a column named "target_type" using the enum we imported.  │
     * │   The value must be one of: "org", "user", "client", "entity",      │
     * │   "asset", "document", "task", "report"                             │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every event MUST specify what type of thing was acted upon.        │
     * │   An audit event without a target type is meaningless.               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // What was acted upon (polymorphic reference) - first half: WHICH TABLE?
    targetType: ledgerTargetTypeEnum("target_type").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ targetId: uuid("target_id").notNull()                               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the second half of the POLYMORPHIC TARGET pattern.          │
     * │ (See targetType above for the full explanation of the pattern.)     │
     * │                                                                     │
     * │ targetId:                                                           │
     * │   TypeScript property name. We use ledgerEvents.targetId.           │
     * │                                                                     │
     * │ uuid("target_id")                                                   │
     * │   Creates a column named "target_id" that stores a UUID.            │
     * │   This is the id of the ROW that was acted upon.                    │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every event MUST specify which specific thing was acted upon.      │
     * │                                                                     │
     * │ NO .references() HERE!                                              │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ This is intentional! See targetType above.                  │   │
     * │   │                                                             │   │
     * │   │ We can't add .references() because target_id might point    │   │
     * │   │ to assets.id, OR documents.id, OR clients.id, etc.          │   │
     * │   │ A single FK can only point to ONE table.                    │   │
     * │   │                                                             │   │
     * │   │ To find the target, you combine target_type + target_id:    │   │
     * │   │                                                             │   │
     * │   │ IF target_type = 'asset' AND target_id = 'abc-123':         │   │
     * │   │   SELECT * FROM assets WHERE id = 'abc-123'                 │   │
     * │   │   ▲                           ▲                             │   │
     * │   │   target_type tells us         target_id tells us           │   │
     * │   │   WHICH TABLE                  WHICH ROW                    │   │
     * │   │                                                             │   │
     * │   │ IF target_type = 'document' AND target_id = 'def-456':      │   │
     * │   │   SELECT * FROM documents WHERE id = 'def-456'              │   │
     * │   │                                                             │   │
     * │   │ The application code (not the database) is responsible for  │   │
     * │   │ routing to the correct table based on target_type.          │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // What was acted upon (polymorphic reference) - second half: WHICH ROW?
    targetId: uuid("target_id").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ action: ledgerActionEnum("action").notNull()                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This column records WHAT HAPPENED - the verb of the audit event.    │
     * │                                                                     │
     * │ action:                                                             │
     * │   TypeScript property name. We use ledgerEvents.action.             │
     * │                                                                     │
     * │ ledgerActionEnum("action")                                          │
     * │   Creates a column named "action" using the ledger_action enum.     │
     * │   The value must be one of the predefined actions:                  │
     * │                                                                     │
     * │   CRUD operations:                                                  │
     * │     "created"    → A new record was created                         │
     * │     "updated"    → An existing record was modified                  │
     * │     "deleted"    → A record was removed                             │
     * │     "archived"   → A record was archived (soft-delete)              │
     * │                                                                     │
     * │   Document lifecycle:                                               │
     * │     "document_uploaded"   → A document file was uploaded            │
     * │     "document_verified"   → A document was reviewed and approved    │
     * │     "document_expired"    → A document passed its expiration date   │
     * │     "document_downloaded" → Someone downloaded a document           │
     * │                                                                     │
     * │   Asset lifecycle:                                                  │
     * │     "asset_valued"      → A new valuation was recorded              │
     * │     "asset_transferred" → An asset was moved between entities       │
     * │     "asset_sold"        → An asset was sold/disposed of             │
     * │                                                                     │
     * │   Access events:                                                    │
     * │     "login"              → A user logged in                         │
     * │     "logout"             → A user logged out                        │
     * │     "permission_changed" → A user's role/access was changed         │
     * │                                                                     │
     * │   Report events:                                                    │
     * │     "report_generated" → A report was created                       │
     * │     "report_shared"    → A report was shared with someone           │
     * │                                                                     │
     * │   Compliance events:                                                │
     * │     "compliance_reviewed" → A compliance review was done            │
     * │     "compliance_approved" → A compliance item was approved           │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every event MUST have an action. "Something happened" without     │
     * │   saying WHAT happened is useless for auditing.                     │
     * │                                                                     │
     * │ EXAMPLE QUERIES using this column:                                  │
     * │   "Show me all document uploads in this org":                       │
     * │   SELECT * FROM ledger_events                                       │
     * │     WHERE org_id = 'abc-123'                                        │
     * │     AND action = 'document_uploaded'                                │
     * │                                                                     │
     * │   "Show me all login events for security review":                   │
     * │   SELECT * FROM ledger_events                                       │
     * │     WHERE org_id = 'abc-123'                                        │
     * │     AND action = 'login'                                            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // What happened
    action: ledgerActionEnum("action").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ payload: jsonb("payload").$type<LedgerPayload>().default({})       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This column stores ADDITIONAL CONTEXT about the event as JSON.      │
     * │ Think of it as the "details" section of an audit log entry.         │
     * │                                                                     │
     * │ payload:                                                            │
     * │   TypeScript property name. We use ledgerEvents.payload.            │
     * │                                                                     │
     * │ jsonb("payload")                                                    │
     * │   Creates a JSONB column named "payload".                           │
     * │   (See orgs.ts settings column for full explanation of JSONB)       │
     * │                                                                     │
     * │   WHY JSONB FOR THIS?                                               │
     * │   Different event types need different context:                     │
     * │   - A "document_uploaded" event might store the filename            │
     * │   - An "asset_valued" event might store the old and new value       │
     * │   - A "permission_changed" event might store the old and new role   │
     * │   JSONB lets each event store whatever context it needs.            │
     * │                                                                     │
     * │   EXAMPLE VALUES:                                                   │
     * │                                                                     │
     * │   For an "updated" event:                                           │
     * │   {                                                                 │
     * │     "before": { "status": "active", "name": "Old Name" },          │
     * │     "after":  { "status": "sold",   "name": "New Name" }           │
     * │   }                                                                 │
     * │   → We can see exactly what changed! This is incredibly valuable    │
     * │     for debugging and compliance.                                   │
     * │                                                                     │
     * │   For a "document_uploaded" event:                                  │
     * │   {                                                                 │
     * │     "documentName": "2024-tax-return.pdf",                          │
     * │     "documentPath": "/org/abc/docs/2024-tax-return.pdf"             │
     * │   }                                                                 │
     * │                                                                     │
     * │   For an "asset_valued" event:                                      │
     * │   {                                                                 │
     * │     "previousValue": 450000,                                        │
     * │     "newValue": 500000,                                             │
     * │     "asOfDate": "2024-12-31"                                        │
     * │   }                                                                 │
     * │                                                                     │
     * │ .$type<LedgerPayload>()                                             │
     * │   Tells TypeScript what SHAPE the JSON should have.                 │
     * │   LedgerPayload is defined below - it's a TypeScript interface.     │
     * │   This gives us autocomplete and type checking in our code!         │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no payload is provided, use an empty object {}.                │
     * │   Some simple events (like "login") might not need extra context.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Additional context
    payload: jsonb("payload").$type<LedgerPayload>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ ipAddress: text("ip_address")                                       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This column stores the IP address of the user who triggered         │
     * │ the event. Important for SECURITY AUDITING.                         │
     * │                                                                     │
     * │ ipAddress:                                                          │
     * │   TypeScript property name. We use ledgerEvents.ipAddress.          │
     * │                                                                     │
     * │ text("ip_address")                                                  │
     * │   Creates a TEXT column named "ip_address".                         │
     * │   Example values: "192.168.1.100", "2001:db8::1" (IPv6)            │
     * │                                                                     │
     * │   WHAT IS AN IP ADDRESS?                                            │
     * │   Every device on the internet has an IP (Internet Protocol)        │
     * │   address - like a return address on a letter. It tells us          │
     * │   roughly WHERE the request came from.                              │
     * │                                                                     │
     * │ NO .notNull() - THIS IS NULLABLE:                                   │
     * │   - System-triggered events (cron jobs, background tasks) don't     │
     * │     have an IP address because no HTTP request was made              │
     * │   - In some contexts (server-side processing), IP may not be        │
     * │     available                                                       │
     * │                                                                     │
     * │ WHY TRACK IP ADDRESSES?                                             │
     * │   - SECURITY: "Someone logged in from Russia? That's suspicious!"   │
     * │   - COMPLIANCE: Regulators may require knowing WHERE actions        │
     * │     were performed from                                             │
     * │   - INVESTIGATION: If there's a breach, IPs help trace the source   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // IP address and user agent for security auditing
    ipAddress: text("ip_address"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ userAgent: text("user_agent")                                       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This column stores the User-Agent string from the HTTP request.     │
     * │ It tells us WHAT DEVICE/BROWSER was used to perform the action.     │
     * │                                                                     │
     * │ userAgent:                                                          │
     * │   TypeScript property name. We use ledgerEvents.userAgent.          │
     * │                                                                     │
     * │ text("user_agent")                                                  │
     * │   Creates a TEXT column named "user_agent".                         │
     * │   Example value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)  │
     * │     AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0        │
     * │     Safari/537.36"                                                  │
     * │                                                                     │
     * │   WHAT IS A USER-AGENT?                                             │
     * │   When your browser makes a request, it sends a string that says    │
     * │   "I'm Chrome on a Mac" or "I'm Safari on an iPhone". This string  │
     * │   is the User-Agent. It helps identify the device and browser.      │
     * │                                                                     │
     * │ NO .notNull() - THIS IS NULLABLE:                                   │
     * │   - System-triggered events don't go through a browser              │
     * │   - API calls might not have a user agent                           │
     * │                                                                     │
     * │ WHY TRACK USER AGENTS?                                              │
     * │   - SECURITY: "Kevin usually uses Chrome on Mac. This login is      │
     * │     from an unknown device - could be compromised."                  │
     * │   - FORENSICS: Helps reconstruct what happened during incidents     │
     * │   - COMPLIANCE: Some regulations require tracking access methods     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    userAgent: text("user_agent"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │            .notNull().defaultNow()                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this event happened. This is the ONLY timestamp column here.   │
     * │ (See orgs.ts for full explanation of timestamp, withTimezone,       │
     * │  .notNull(), and .defaultNow())                                     │
     * │                                                                     │
     * │ createdAt:                                                          │
     * │   TypeScript property name. We use ledgerEvents.createdAt.          │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Stores the exact date, time, and timezone when the event was      │
     * │   recorded.                                                         │
     * │   Example value: "2024-01-15T10:30:45-05:00"                        │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every event MUST have a timestamp. An event without a time        │
     * │   is useless for an audit trail.                                    │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   If not provided, use the current time when inserting.             │
     * │   The database clock sets this automatically.                       │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ WHY IS THERE NO updated_at COLUMN?                              │ │
     * │ │                                                                 │ │
     * │ │ Every other table in our schema has BOTH:                       │ │
     * │ │   - created_at  (when the row was first created)                │ │
     * │ │   - updated_at  (when the row was last modified)                │ │
     * │ │                                                                 │ │
     * │ │ But ledger_events ONLY has created_at. WHY?                     │ │
     * │ │                                                                 │ │
     * │ │ Because this table is APPEND-ONLY (IMMUTABLE).                  │ │
     * │ │ Records are NEVER updated. Once written, they are permanent.    │ │
     * │ │                                                                 │ │
     * │ │ If we had an updated_at column, it would:                       │ │
     * │ │   1. Always equal created_at (since nothing ever changes)       │ │
     * │ │   2. Be a waste of storage space                                │ │
     * │ │   3. Imply that updates ARE possible (misleading)               │ │
     * │ │                                                                 │ │
     * │ │ The ABSENCE of updated_at is a DESIGN SIGNAL to other           │ │
     * │ │ developers: "Hey, this table is immutable. Don't try to         │ │
     * │ │ update rows here."                                              │ │
     * │ │                                                                 │ │
     * │ │ COMPARE:                                                        │ │
     * │ │   clients table:  created_at + updated_at  (rows CAN change)    │ │
     * │ │   ledger table:   created_at ONLY          (rows are FROZEN)    │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // When this happened - IMMUTABLE, no updated_at
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },

  // ==================== INDEXES ====================
  /**
   * (table) => [...]
   *
   * This function returns an array of INDEXES for faster queries.
   * (See orgs.ts for full explanation of what indexes are and why we need them)
   *
   * QUICK REFRESHER:
   *   - Index = like the index at the back of a book
   *   - Makes finding specific rows MUCH faster
   *   - Tradeoff: Slightly slower writes (INSERT)
   *   - Only add indexes for columns you frequently search/filter by
   *
   * NOTE: For this table, writes are INSERT-ONLY (no UPDATE/DELETE).
   * So the write-speed tradeoff of indexes is minimal - we only pay the
   * cost on INSERT, and the READ speed gains are huge because this table
   * grows very large over time.
   */
  (table) => [
    /**
     * index("ledger_events_org_id_idx").on(table.orgId)
     *
     * Creates an index named "ledger_events_org_id_idx" on the org_id column.
     *
     * WHY: Every audit query starts with "show me events for THIS org".
     *      Multi-tenant isolation means we ALWAYS filter by org_id first.
     *
     *      "Show me all events for Acme Wealth":
     *      SELECT * FROM ledger_events WHERE org_id = 'abc-123'
     *
     *      Without index: Database scans EVERY event across ALL orgs. Slow!
     *      With index: Database jumps directly to Acme's events. Fast!
     *
     * NAMING CONVENTION: tablename_columnname_idx
     */
    // Org-scoped audit queries
    index("ledger_events_org_id_idx").on(table.orgId),

    /**
     * index("ledger_events_actor_user_id_idx").on(table.actorUserId)
     *
     * Creates an index on the actor_user_id column.
     *
     * WHY: For USER ACTIVITY AUDITS. When a compliance officer asks
     *      "show me everything Kevin did last month", we need fast lookups
     *      by actor (user).
     *
     *      "Find all actions performed by Kevin":
     *      SELECT * FROM ledger_events WHERE actor_user_id = 'kevin-123'
     *
     *      This is critical for:
     *      - Investigating suspicious activity by a specific user
     *      - Generating user activity reports
     *      - Compliance reviews of who did what
     */
    // Find events by actor (user activity audit)
    index("ledger_events_actor_user_id_idx").on(table.actorUserId),

    /**
     * index("ledger_events_target_idx").on(table.targetType, table.targetId)
     *
     * A COMPOSITE INDEX on TWO columns: target_type AND target_id.
     * (See clients.ts for explanation of composite indexes)
     *
     * WHY: For finding all events related to a SPECIFIC THING.
     *      "Show me everything that happened to asset abc-123":
     *      SELECT * FROM ledger_events
     *        WHERE target_type = 'asset' AND target_id = 'abc-123'
     *
     *      This is the query that resolves the polymorphic target pattern.
     *      Both columns are needed together because target_id alone is
     *      ambiguous - the same UUID could theoretically exist in the
     *      assets table AND the documents table.
     *
     *      REAL-WORLD USE: When you view an asset's detail page, there
     *      might be a "History" tab showing all events for that asset.
     *      This index makes that query fast.
     */
    // Find events for a specific target
    index("ledger_events_target_idx").on(table.targetType, table.targetId),

    /**
     * index("ledger_events_org_created_at_idx").on(table.orgId, table.createdAt)
     *
     * A COMPOSITE INDEX on org_id AND created_at.
     *
     * WHY: This is the MOST COMMON audit query pattern - "show me recent
     *      events for this org, sorted by time".
     *
     *      "Show me the 50 most recent events for Acme Wealth":
     *      SELECT * FROM ledger_events
     *        WHERE org_id = 'abc-123'
     *        ORDER BY created_at DESC
     *        LIMIT 50
     *
     *      "Show me events between Jan 1 and Jan 31 for Acme":
     *      SELECT * FROM ledger_events
     *        WHERE org_id = 'abc-123'
     *        AND created_at BETWEEN '2024-01-01' AND '2024-01-31'
     *
     *      The composite index covers both the WHERE (org_id) and the
     *      ORDER BY (created_at) in a single index lookup.
     */
    // Time-range queries (most common audit query pattern)
    index("ledger_events_org_created_at_idx").on(table.orgId, table.createdAt),

    /**
     * index("ledger_events_org_action_idx").on(table.orgId, table.action)
     *
     * A COMPOSITE INDEX on org_id AND action.
     *
     * WHY: For filtering events by ACTION TYPE within an org.
     *
     *      "Show me all login events for Acme (security review)":
     *      SELECT * FROM ledger_events
     *        WHERE org_id = 'abc-123' AND action = 'login'
     *
     *      "Show me all document uploads for compliance report":
     *      SELECT * FROM ledger_events
     *        WHERE org_id = 'abc-123' AND action = 'document_uploaded'
     *
     *      "How many permission changes happened this quarter?":
     *      SELECT COUNT(*) FROM ledger_events
     *        WHERE org_id = 'abc-123' AND action = 'permission_changed'
     *        AND created_at >= '2024-10-01'
     *
     *      COUNT(*) means "count the number of matching rows" instead
     *      of returning the rows themselves.
     */
    // Filter by action type
    index("ledger_events_org_action_idx").on(table.orgId, table.action),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * LedgerPayload interface
 *
 * Kevin, this defines the SHAPE of the JSON stored in the "payload" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 * Different event types will use different subsets of these fields.
 * No single event is expected to use ALL of them.
 *
 * Think of this interface as a "menu" of possible fields that any
 * event MIGHT include in its payload. Each event picks the ones it needs.
 */
export interface LedgerPayload {
  /**
   * before?: Record<string, unknown>
   * after?: Record<string, unknown>
   *
   * STATE CHANGE TRACKING - the "before" and "after" snapshots.
   *
   * When a record is UPDATED, we capture what it looked like BEFORE
   * and AFTER the change. This is the most powerful audit feature.
   *
   * Record<string, unknown> means "an object with string keys and any values".
   * It's flexible because different tables have different columns.
   *
   * EXAMPLE - Asset name was changed:
   *   {
   *     before: { name: "123 Main St", status: "active" },
   *     after:  { name: "123 Main Street", status: "active" }
   *   }
   *   → We can see that only the name changed (missing "reet").
   *
   * EXAMPLE - Client email was updated:
   *   {
   *     before: { email: "john@old.com" },
   *     after:  { email: "john@new.com" }
   *   }
   *
   * WHY THIS MATTERS:
   *   Without before/after, you only know "something changed".
   *   With before/after, you know EXACTLY what changed.
   *   Compliance officers love this.
   */
  // State changes
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;

  /**
   * reason?: string
   *
   * A human-readable reason for the action.
   * EXAMPLE: "Client requested name correction"
   * EXAMPLE: "Compliance review - annual audit"
   *
   * notes?: string
   *
   * Additional free-text notes about the event.
   * EXAMPLE: "Verified against government ID"
   * EXAMPLE: "Approved by compliance officer Jane"
   *
   * These are optional text fields for adding human context
   * that the structured data can't capture.
   */
  // Action-specific context
  reason?: string;
  notes?: string;

  /**
   * documentName?: string
   * documentPath?: string
   *
   * Used when the event involves a DOCUMENT.
   * (action = "document_uploaded", "document_verified", etc.)
   *
   * EXAMPLE:
   *   {
   *     documentName: "2024-tax-return.pdf",
   *     documentPath: "/org/acme/clients/john/docs/2024-tax-return.pdf"
   *   }
   *
   * WHY STORE THESE IN PAYLOAD (not just look up the document)?
   *   Because the document might be DELETED later, but we still want
   *   to know what the file was called in the audit trail.
   *   Remember: the ledger event survives even if the target is deleted.
   */
  // For document events
  documentName?: string;
  documentPath?: string;

  /**
   * previousValue?: number
   * newValue?: number
   * asOfDate?: string
   *
   * Used when the event involves an ASSET VALUATION.
   * (action = "asset_valued")
   *
   * EXAMPLE:
   *   {
   *     previousValue: 450000,
   *     newValue: 500000,
   *     asOfDate: "2024-12-31"
   *   }
   *   → "The asset was revalued from $450k to $500k as of Dec 31, 2024"
   *
   * asOfDate is important because valuations are often backdated.
   * "We got the appraisal today, but it's the value AS OF last quarter."
   */
  // For valuation events
  previousValue?: number;
  newValue?: number;
  asOfDate?: string;

  /**
   * previousRole?: string
   * newRole?: string
   *
   * Used when the event involves a PERMISSION CHANGE.
   * (action = "permission_changed")
   *
   * EXAMPLE:
   *   {
   *     previousRole: "assistant",
   *     newRole: "admin"
   *   }
   *   → "Kevin was promoted from assistant to admin"
   *
   * This is critical for security auditing. If someone gains
   * unauthorized admin access, the ledger shows exactly when
   * and how their role changed.
   */
  // For permission changes
  previousRole?: string;
  newRole?: string;

  /**
   * metadata?: Record<string, unknown>
   *
   * A catch-all field for any additional context that doesn't fit
   * into the other fields above.
   *
   * Record<string, unknown> means "any object" - completely flexible.
   *
   * EXAMPLE:
   *   {
   *     metadata: {
   *       batchId: "batch-2024-01",
   *       source: "csv_import",
   *       rowCount: 150
   *     }
   *   }
   *   → Extra context for a bulk import operation
   *
   * Use this sparingly. Prefer the specific fields above when possible,
   * because they have defined types (number, string) while metadata
   * is untyped (unknown).
   */
  // Additional context
  metadata?: Record<string, unknown>;
}

/**
 * Ledger Event Relations (APPEND-ONLY AUDIT TRAIL)
 *
 * Kevin, ledger events are SPECIAL - they're the audit trail that never changes.
 * They only have TWO relations, and intentionally DON'T link to target entities.
 *
 * WHY NO RELATION TO THE TARGET?
 *   The ledger uses "polymorphic references" (target_type + target_id):
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ ledger_events row:                                             │
 *   │   target_type = "asset"                                        │
 *   │   target_id   = "abc-123"                                      │
 *   │                                                                │
 *   │ This MEANS: "the target is the asset with id abc-123"          │
 *   │ But we DON'T create a Foreign Key for this because:            │
 *   │   1. The target might be DELETED later (ledger must survive)   │
 *   │   2. One column (target_id) can't point to 8 different tables  │
 *   │   3. We query by target_type + target_id anyway                │
 *   └────────────────────────────────────────────────────────────────┘
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
 *   │ AND    = "BOTH conditions must be true"                             │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each ledger_event:
 *     event.org   → "Find the ONE org this event happened in"
 *                   SELECT * FROM orgs WHERE id = event.org_id
 *     event.actor → "Find the ONE user who performed this action (if not system)"
 *                   SELECT * FROM users WHERE id = event.actor_user_id
 *
 *   To find the TARGET manually (not via Drizzle relations):
 *     "Find what was acted upon"
 *     IF target_type = 'asset':
 *       SELECT * FROM assets WHERE id = event.target_id
 *     IF target_type = 'document':
 *       SELECT * FROM documents WHERE id = event.target_id
 *     ...etc for each target_type
 *
 * QUERY EXAMPLE - Get recent audit events for an org:
 *   const events = await db.query.ledgerEvents.findMany({
 *     where: eq(ledgerEvents.orgId, orgId),
 *     with: {
 *       actor: true,   // WHO did it (the user, or null for system)
 *       org: true,     // Which org
 *     },
 *     orderBy: desc(ledgerEvents.createdAt),
 *     limit: 50,
 *   });
 *
 * QUERY EXAMPLE - Get all events for a specific asset:
 *   const assetEvents = await db.query.ledgerEvents.findMany({
 *     where: and(
 *       eq(ledgerEvents.targetType, "asset"),
 *       eq(ledgerEvents.targetId, assetId),
 *     ),
 *     with: { actor: true },
 *   });
 */
export const ledgerEventsRelations = relations(ledgerEvents, ({ one }) => ({
  /**
   * ONE relationship: Event happened in ONE Org (REQUIRED)
   *
   * Every audit event is scoped to an org for tenant isolation.
   * SQL: SELECT * FROM orgs WHERE id = event.org_id
   */
  org: one(orgs, {
    fields: [ledgerEvents.orgId],
    references: [orgs.id],
  }),

  /**
   * ONE relationship: Event was performed by ONE User (OPTIONAL)
   *
   * "Who did this?"
   * NULL for system-triggered events (e.g., cron job marking docs expired).
   * SQL: SELECT * FROM users WHERE id = event.actor_user_id
   */
  actor: one(users, {
    fields: [ledgerEvents.actorUserId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type LedgerEvent = typeof ledgerEvents.$inferSelect
 *
 * Creates a TypeScript type representing a LEDGER EVENT ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 * (See orgs.ts for full explanation of $inferSelect)
 *
 * USAGE:
 *   const event: LedgerEvent = await db.query.ledgerEvents.findFirst();
 *   event.action      // TypeScript knows this is a ledger_action enum value
 *   event.targetType  // TypeScript knows this is a ledger_target_type enum value
 *   event.targetId    // TypeScript knows this is a string (UUID)
 *   event.actorUserId // TypeScript knows this is string | null (nullable!)
 *   event.payload     // TypeScript knows this is LedgerPayload | null
 *   event.ipAddress   // TypeScript knows this is string | null
 *   event.createdAt   // TypeScript knows this is Date
 *
 * EXAMPLE - Display an audit event in the UI:
 *   function formatEvent(event: LedgerEvent): string {
 *     return `${event.action} on ${event.targetType} at ${event.createdAt}`;
 *   }
 *   // "document_uploaded on document at 2024-01-15T10:30:00"
 */
export type LedgerEvent = typeof ledgerEvents.$inferSelect;

/**
 * export type NewLedgerEvent = typeof ledgerEvents.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new ledger event.
 * Some fields are optional (have defaults), so this type reflects that.
 * (See orgs.ts for full explanation of $inferInsert)
 *
 * USAGE:
 *   const newEvent: NewLedgerEvent = {
 *     orgId: "abc-123",            // Required - which org
 *     targetType: "asset",         // Required - what type of thing
 *     targetId: "def-456",         // Required - which specific thing
 *     action: "asset_valued",      // Required - what happened
 *     actorUserId: "kevin-789",    // Optional - who did it (null = system)
 *     payload: {                   // Optional - extra context (defaults to {})
 *       previousValue: 450000,
 *       newValue: 500000,
 *       asOfDate: "2024-12-31",
 *     },
 *     ipAddress: "192.168.1.100",  // Optional - where from
 *     userAgent: "Mozilla/5.0...", // Optional - what device
 *     // id is auto-generated (defaultRandom)
 *     // createdAt is auto-set (defaultNow)
 *   };
 *   await db.insert(ledgerEvents).values(newEvent);
 *
 * REMEMBER: You can INSERT new events, but NEVER update or delete them.
 * This table is append-only!
 */
export type NewLedgerEvent = typeof ledgerEvents.$inferInsert;
