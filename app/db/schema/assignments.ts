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
 *       In this file, we define that an assignment points to ONE assistant
 *       and ONE client (it's a junction table sitting between them).
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See orgs.ts for full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, timestamp, text, index, unique } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
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
 * timestamp = Column type for dates and times (like "2024-01-15 10:30:00").
 *             We use { withTimezone: true } to track the timezone too.
 *             See orgs.ts for full explanation.
 *
 * text      = Column type for text/strings (like "Primary contact for tax matters").
 *             Can hold any length of text.
 *             See orgs.ts for full explanation.
 *
 * index     = Function to create database indexes (makes queries faster).
 *             Like the index at the back of a book - lets the database find
 *             rows without scanning every single one.
 *             See orgs.ts for full explanation.
 *
 * unique    = Function to create a UNIQUE CONSTRAINT across one or more columns.
 *             This is NEW in this file - let's explain it:
 *
 *             ┌─────────────────────────────────────────────────────────────┐
 *             │ WHAT IS unique()?                                           │
 *             │                                                             │
 *             │ unique() creates a rule: "no two rows can have the same    │
 *             │ combination of values in these columns."                    │
 *             │                                                             │
 *             │ We saw .unique() on a SINGLE column in orgs.ts (slug).     │
 *             │ Here, we use unique() on MULTIPLE columns together.        │
 *             │ This is called a COMPOSITE UNIQUE CONSTRAINT.              │
 *             │                                                             │
 *             │ SINGLE vs COMPOSITE:                                       │
 *             │   .unique() on slug → No two orgs can share the same slug  │
 *             │   unique().on(A, B) → No two rows can share the same       │
 *             │                       COMBINATION of A and B               │
 *             │                                                             │
 *             │ Example for assignments:                                    │
 *             │   unique().on(assistant_member_id, client_id) means:        │
 *             │   - Alice + John Smith → OK (first assignment)              │
 *             │   - Alice + Jane Doe   → OK (different client)              │
 *             │   - Bob   + John Smith → OK (different assistant)           │
 *             │   - Alice + John Smith → ERROR! (duplicate pair)            │
 *             │                                                             │
 *             │ This prevents accidentally assigning the same assistant     │
 *             │ to the same client twice.                                   │
 *             └─────────────────────────────────────────────────────────────┘
 *
 * WHERE: "drizzle-orm/pg-core" is the PostgreSQL-specific part of Drizzle.
 *        The "/pg-core" means "PostgreSQL core functions".
 */
import {
  pgTable,
  uuid,
  timestamp,
  text,
  index,
  unique,
} from "drizzle-orm/pg-core";

/**
 * import { orgMembers } from "./org_members"
 *
 * WHAT: Imports the org_members table definition from the org_members.ts file.
 * WHY:  We need to reference orgMembers.id to create a Foreign Key relationship.
 *       An assignment links an org_member (in the "assistant" role) to a client.
 *       This import says "I need to know about the org_members table so I can
 *       point to it with a Foreign Key."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/org_members.ts
 */
import { orgMembers } from "./org_members";

/**
 * import { clients } from "./clients"
 *
 * WHAT: Imports the clients table definition from the clients.ts file.
 * WHY:  We need to reference clients.id to create a Foreign Key relationship.
 *       An assignment links an assistant to a client - this is the client side.
 *       This import says "I need to know about the clients table so I can
 *       point to it with a Foreign Key."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/clients.ts
 */
import { clients } from "./clients";

/**
 * ============================================================================
 * ASSIGNMENTS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is a JUNCTION TABLE (also called a "join table" or "bridge table").
 * It manages which assistants are assigned to which clients.
 *
 * WHY DOES THIS TABLE EXIST?
 *
 * In our wealth management app, we have a MANY-TO-MANY relationship:
 *   - One assistant can serve MULTIPLE clients
 *     (Alice manages both John Smith and Jane Doe)
 *   - One client can have MULTIPLE assistants
 *     (John Smith has both Alice as primary and Bob as backup)
 *
 * Databases can't directly represent many-to-many relationships.
 * Instead, we use a JUNCTION TABLE that sits between the two tables
 * and creates individual ONE-TO-ONE links:
 *
 *   ┌──────────────┐                              ┌────────────┐
 *   │ OrgMembers   │                              │  Clients   │
 *   │ (Assistants) │                              │            │
 *   ├──────────────┤      ┌───────────────┐       ├────────────┤
 *   │ id (PK)      │◄─FK──│ Assignments   │──FK──►│ id (PK)    │
 *   │ ...          │      │ (Junction)    │       │ ...        │
 *   └──────────────┘      ├───────────────┤       └────────────┘
 *                         │ id (PK)       │
 *                         │ assistant_id  │ ← FK pointing LEFT to org_members.id
 *                         │ client_id     │ ← FK pointing RIGHT to clients.id
 *                         │ notes         │ ← Extra info about this assignment
 *                         └───────────────┘
 *
 * REAL-WORLD EXAMPLE:
 *   Acme Wealth Management has these assignments:
 *     - Alice (assistant) → John Smith (client) - "Primary contact for tax matters"
 *     - Alice (assistant) → Jane Doe (client)   - "Handles quarterly reviews"
 *     - Bob   (assistant) → John Smith (client) - "Backup for Alice"
 *
 * DESIGN DECISIONS:
 *   - References org_members (not users) because role context matters.
 *     An org_member knows WHICH org the person belongs to and WHAT role they have.
 *   - Only assistants/admins should be assigned, not client-role members.
 *   - Has a "notes" field for assignment context (e.g., "Primary contact for tax matters").
 *
 * WHY NOT JUST USE A JSONB ARRAY ON THE CLIENTS TABLE?
 *   We could store ["alice-id", "bob-id"] in a column on clients, but:
 *   - Can't easily query "give me all clients for assistant Alice" (would need to
 *     search inside every client's JSON array - very slow!)
 *   - Can't store metadata per assignment (like notes or timestamps)
 *   - Harder to enforce data integrity (what if an assistant ID is deleted?)
 *   - A separate table is the clean, standard, scalable approach
 */

/**
 * export const assignments = pgTable(...)
 *
 * BREAKDOWN:
 *   export       = Makes this available for other files to import.
 *                   Other files can do: import { assignments } from "./assignments"
 *   const        = Declares a constant (value that won't change).
 *   assignments  = The name we give this table in our TypeScript code.
 *                   We'll use it like: db.query.assignments.findMany()
 *   pgTable      = The function that creates a PostgreSQL table definition.
 *                   See orgs.ts for full explanation.
 *
 * pgTable takes 3 arguments:
 *   1. "assignments" = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes and constraints
 */
export const assignments = pgTable(
  "assignments", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) for the assignments table.             │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In our code, we'll use              │
     * │   assignments.id                                                    │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   UUID = Universally Unique Identifier                              │
     * │   Example value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"             │
     * │   See orgs.ts for full explanation of UUIDs.                        │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each assignment row.         │
     * │   Rules: UNIQUE, NOT NULL, IMMUTABLE.                               │
     * │   See clients.ts for full explanation of Primary Keys.              │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when you insert a row       │
     * │   without providing an id. You don't have to create IDs manually.   │
     * │   See orgs.ts for full explanation of defaultRandom.                │
     * │                                                                     │
     * │ WHY DOES A JUNCTION TABLE NEED ITS OWN ID?                          │
     * │   Some junction tables don't have their own id and instead use a    │
     * │   composite PK (assistant_member_id + client_id together). But we   │
     * │   give assignments its own UUID so it's easy to reference, update,  │
     * │   or delete a SPECIFIC assignment by a single id value:             │
     * │     DELETE FROM assignments WHERE id = 'a1b2c3d4-...'               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assistantMemberId: uuid("assistant_member_id")                      │
     * │   .notNull()                                                        │
     * │   .references(() => orgMembers.id, { onDelete: "cascade" })         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY #1 - Points to the assistant (an org_member).           │
     * │                                                                     │
     * │ Kevin, a JUNCTION TABLE (like this one) has TWO Foreign Keys.       │
     * │ This is how we create a MANY-TO-MANY relationship:                  │
     * │   - FK #1 (this column) points LEFT to org_members                  │
     * │   - FK #2 (clientId below) points RIGHT to clients                  │
     * │   - Each ROW in assignments creates ONE link between them           │
     * │                                                                     │
     * │ assistantMemberId:                                                   │
     * │   TypeScript property name. We use assignments.assistantMemberId    │
     * │   in code. Note: camelCase in TypeScript, snake_case in database.   │
     * │                                                                     │
     * │ uuid("assistant_member_id")                                         │
     * │   Creates a column named "assistant_member_id" in the database.     │
     * │   It stores a UUID that matches an org_member's id.                 │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   This column CANNOT be empty. Every assignment MUST have an        │
     * │   assistant. An assignment without an assistant makes no sense -     │
     * │   the whole point is to link an assistant TO a client.              │
     * │   See clients.ts for full explanation of .notNull().                │
     * │                                                                     │
     * │ .references(() => orgMembers.id, { onDelete: "cascade" })           │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ FOREIGN KEY (FK) TO ORG_MEMBERS:                           │   │
     * │   │                                                             │   │
     * │   │ .references(() => orgMembers.id)                            │   │
     * │   │   "This column's value MUST exist in org_members.id"        │   │
     * │   │   If you try to assign a non-existent org_member,           │   │
     * │   │   the database will reject it with an error.                │   │
     * │   │                                                             │   │
     * │   │ VISUAL:                                                     │   │
     * │   │   org_members table          assignments table              │   │
     * │   │   ┌────────────────┐         ┌──────────────────────┐       │   │
     * │   │   │ id (PK)        │◄────────│ assistant_member_id  │       │   │
     * │   │   │ "alice-uuid"   │         │ "alice-uuid" (FK)    │       │   │
     * │   │   │ "bob-uuid"     │         │ "alice-uuid" (FK)    │       │   │
     * │   │   └────────────────┘         │ "bob-uuid"   (FK)    │       │   │
     * │   │         ▲                    └──────────────────────┘       │   │
     * │   │         │                                                   │   │
     * │   │    Primary Key               These POINT TO                 │   │
     * │   │    (the source)              that Primary Key               │   │
     * │   │                                                             │   │
     * │   │ { onDelete: "cascade" }                                     │   │
     * │   │   What happens if the org_member is deleted?                │   │
     * │   │   "cascade" = DELETE the assignment rows too.               │   │
     * │   │   If Alice leaves the org (her org_member row is deleted),  │   │
     * │   │   all of Alice's assignments are automatically deleted.     │   │
     * │   │   See clients.ts for full explanation of onDelete options.  │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ WHY TWO FOREIGN KEYS IN ONE TABLE?                                  │
     * │   - One FK points to each side of the many-to-many relationship     │
     * │   - Each row in assignments creates ONE link                        │
     * │   - Multiple rows = multiple links                                  │
     * │                                                                     │
     * │ Example data in the assignments table:                              │
     * │   ┌─────────┬──────────────────┬─────────────┬──────────────────┐   │
     * │   │ id (PK) │ assistant_id(FK) │ client_id   │ notes            │   │
     * │   ├─────────┼──────────────────┼─────────────┼──────────────────┤   │
     * │   │ row-1   │ Alice            │ John Smith  │ "Primary"        │   │
     * │   │ row-2   │ Alice            │ Jane Doe    │ "Quarterly"      │   │
     * │   │ row-3   │ Bob              │ John Smith  │ "Backup"         │   │
     * │   └─────────┴──────────────────┴─────────────┴──────────────────┘   │
     * │                                                                     │
     * │ Result: Alice has 2 clients, Bob has 1, John has 2 assistants       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assistantMemberId: uuid("assistant_member_id")
      .notNull()
      .references(() => orgMembers.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id")                                         │
     * │   .notNull()                                                        │
     * │   .references(() => clients.id, { onDelete: "cascade" })            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY #2 - Points to the client.                              │
     * │ This is the SECOND FK in the junction table.                        │
     * │                                                                     │
     * │ clientId:                                                           │
     * │   TypeScript property name. We use assignments.clientId in code.    │
     * │   Note: camelCase in TypeScript, snake_case ("client_id") in DB.    │
     * │                                                                     │
     * │ uuid("client_id")                                                   │
     * │   Creates a column named "client_id" in the database.               │
     * │   It stores a UUID that matches a client's id.                      │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every assignment MUST have a client. You can't assign an          │
     * │   assistant to "nobody" - the whole point is to link them to a      │
     * │   specific client.                                                  │
     * │   See clients.ts for full explanation of .notNull().                │
     * │                                                                     │
     * │ .references(() => clients.id, { onDelete: "cascade" })              │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ FOREIGN KEY (FK) TO CLIENTS:                               │   │
     * │   │                                                             │   │
     * │   │ .references(() => clients.id)                               │   │
     * │   │   "This column's value MUST exist in clients.id"            │   │
     * │   │   If you try to assign to a non-existent client,            │   │
     * │   │   the database will reject it with an error.                │   │
     * │   │                                                             │   │
     * │   │ VISUAL:                                                     │   │
     * │   │   assignments table              clients table              │   │
     * │   │   ┌──────────────────────┐       ┌────────────────┐         │   │
     * │   │   │ client_id (FK)       │──────►│ id (PK)        │         │   │
     * │   │   │ "john-uuid"          │       │ "john-uuid"    │         │   │
     * │   │   │ "jane-uuid"          │       │ "jane-uuid"    │         │   │
     * │   │   │ "john-uuid"          │       └────────────────┘         │   │
     * │   │   └──────────────────────┘              ▲                   │   │
     * │   │                                         │                   │   │
     * │   │   These POINT TO               Primary Key                  │   │
     * │   │   that Primary Key             (the source)                 │   │
     * │   │                                                             │   │
     * │   │ { onDelete: "cascade" }                                     │   │
     * │   │   What happens if the client is deleted?                    │   │
     * │   │   "cascade" = DELETE the assignment rows too.               │   │
     * │   │   If John Smith is removed as a client, all assignments     │   │
     * │   │   linking assistants to John are automatically deleted.     │   │
     * │   │   See clients.ts for full explanation of onDelete options.  │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ TOGETHER, FK #1 AND FK #2 CREATE THE MANY-TO-MANY:                  │
     * │                                                                     │
     * │   ┌──────────────┐    ┌───────────────┐    ┌────────────┐           │
     * │   │ OrgMembers   │    │ Assignments   │    │  Clients   │           │
     * │   │ (Assistants) │    │ (Junction)    │    │            │           │
     * │   ├──────────────┤    ├───────────────┤    ├────────────┤           │
     * │   │ id (PK)      │◄───│ assistant_id  │    │ id (PK)    │           │
     * │   │              │    │ client_id     │───►│            │           │
     * │   └──────────────┘    └───────────────┘    └────────────┘           │
     * │                                                                     │
     * │   "An assignment links ONE assistant to ONE client.                 │
     * │    Multiple assignments create the many-to-many web."               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ notes: text("notes")                                                │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A text column for storing context about this specific          │
     * │ assignment. This is ASSIGNMENT METADATA - extra info about the      │
     * │ link between assistant and client.                                   │
     * │                                                                     │
     * │ notes:                                                              │
     * │   TypeScript property name. We use assignments.notes in code.       │
     * │                                                                     │
     * │ text("notes")                                                       │
     * │   Creates a TEXT column named "notes" in the database.              │
     * │   Can hold any length of text.                                      │
     * │   See orgs.ts for full explanation of text columns.                 │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The value CAN be empty (null)                                   │
     * │   - Notes are optional for an assignment                            │
     * │   - Some assignments might just be "Alice → John" with no context   │
     * │   - Others might say "Primary contact for tax matters"              │
     * │                                                                     │
     * │ EXAMPLE VALUES:                                                     │
     * │   - "Primary contact for tax matters"                               │
     * │   - "Backup assistant - handles when Alice is on vacation"          │
     * │   - "Temporary assignment for Q4 review"                            │
     * │   - null (no notes needed)                                          │
     * │                                                                     │
     * │ WHY THIS IS USEFUL:                                                 │
     * │   This is one of the benefits of a junction table over a JSONB      │
     * │   array. We can store metadata about EACH individual assignment.    │
     * │   If we just stored ["alice-id", "bob-id"] on the client, we        │
     * │   couldn't attach notes to each link.                               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    notes: text("notes"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this assignment was created.                           │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Creates a timestamp column that stores date, time, AND timezone.  │
     * │   Example value: "2024-06-15T14:30:00-05:00"                        │
     * │   See orgs.ts for full explanation of timestamps and withTimezone.  │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every assignment must have a creation timestamp.                  │
     * │   See clients.ts for full explanation of .notNull().                │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   If not provided, the database uses the current time.              │
     * │   When you create a new assignment, the timestamp is automatic.     │
     * │   See orgs.ts for full explanation of .defaultNow().                │
     * │                                                                     │
     * │ WHY TRACK THIS?                                                     │
     * │   - Know when Alice was first assigned to John Smith                │
     * │   - Sort assignments by newest/oldest                               │
     * │   - Audit trail: "Who was assigned when?"                           │
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
     * │ Records WHEN this assignment was last modified.                     │
     * │                                                                     │
     * │ Same as createdAt (timestamp, notNull, defaultNow), plus:          │
     * │                                                                     │
     * │ .$onUpdate(() => new Date())                                        │
     * │   AUTOMATICALLY updates this timestamp whenever the row changes.   │
     * │   This is handled by Drizzle (in JavaScript), not the database.    │
     * │   See orgs.ts for full explanation of .$onUpdate().                 │
     * │                                                                     │
     * │ EXAMPLE:                                                            │
     * │   1. Create assignment at 2:00 PM                                   │
     * │      -> created_at: 2:00 PM, updated_at: 2:00 PM                   │
     * │                                                                     │
     * │   2. Update notes at 4:00 PM                                        │
     * │      -> created_at: 2:00 PM (unchanged)                             │
     * │      -> updated_at: 4:00 PM (automatically updated!)               │
     * │                                                                     │
     * │ WHY TRACK THIS?                                                     │
     * │   - Know when assignment notes were last changed                    │
     * │   - Sync with external systems ("give me changes since yesterday") │
     * │   - Audit trail: "Was this assignment recently modified?"           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },

  // ==================== INDEXES AND CONSTRAINTS ====================
  /**
   * (table) => [...]
   *
   * This is a function that receives the table and returns an array of
   * INDEXES and CONSTRAINTS. The function receives the table object so
   * we can reference specific columns.
   *
   * See orgs.ts for full explanation of what indexes are and why they matter.
   *
   * Kevin, this section contains BOTH:
   *   1. A UNIQUE CONSTRAINT - prevents duplicate data
   *   2. INDEXES - make queries faster
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ unique("assignments_assistant_client_unique")                        │
     * │   .on(table.assistantMemberId, table.clientId)                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ COMPOSITE UNIQUE CONSTRAINT EXPLAINED:                              │
     * │                                                                     │
     * │ This says: "No two rows can have the SAME combination of           │
     * │ assistant_member_id AND client_id."                                 │
     * │                                                                     │
     * │ WHY: Prevents duplicate assignments. Without this, you could        │
     * │ accidentally assign Alice to John Smith twice:                       │
     * │                                                                     │
     * │   WITHOUT this constraint:                                          │
     * │     INSERT (assistant=Alice, client=John)  → OK (row 1)             │
     * │     INSERT (assistant=Alice, client=John)  → OK (row 2) - OOPS!    │
     * │     Now Alice appears twice for John - confusing!                   │
     * │                                                                     │
     * │   WITH this constraint:                                             │
     * │     INSERT (assistant=Alice, client=John)  → OK (row 1)             │
     * │     INSERT (assistant=Alice, client=John)  → ERROR! "duplicate key  │
     * │       violates unique constraint"                                    │
     * │     INSERT (assistant=Alice, client=Jane)  → OK (different client)  │
     * │     INSERT (assistant=Bob,   client=John)  → OK (different assist.) │
     * │                                                                     │
     * │ NAMING: "assignments_assistant_client_unique"                        │
     * │   Convention: tablename_columns_unique                              │
     * │                                                                     │
     * │ HOW SQL ENFORCES THIS:                                              │
     * │   Under the hood, the database creates:                             │
     * │   ALTER TABLE assignments                                           │
     * │     ADD CONSTRAINT assignments_assistant_client_unique               │
     * │     UNIQUE (assistant_member_id, client_id);                         │
     * │                                                                     │
     * │ NOTE: A unique constraint ALSO acts as an index! The database       │
     * │ creates an internal index to efficiently check for duplicates.      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    unique("assignments_assistant_client_unique").on(
      table.assistantMemberId,
      table.clientId
    ),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("assignments_assistant_member_id_idx")                        │
     * │   .on(table.assistantMemberId)                                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the assistant_member_id column.                 │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Find ALL clients assigned to a specific assistant"               │
     * │                                                                     │
     * │   SQL:                                                              │
     * │     SELECT * FROM assignments                                       │
     * │       WHERE assistant_member_id = 'alice-uuid'                      │
     * │                                                                     │
     * │   In plain English:                                                 │
     * │     SELECT = "fetch data from the database"                         │
     * │     *      = "all columns" (give me everything)                     │
     * │     FROM   = "look in the assignments table"                        │
     * │     WHERE  = "only rows where assistant_member_id matches Alice"    │
     * │                                                                     │
     * │ WITHOUT this index: Database scans every row in assignments to      │
     * │   find Alice's assignments. With 100,000 assignments, this is SLOW. │
     * │                                                                     │
     * │ WITH this index: Database has a "lookup table" for                   │
     * │   assistant_member_id values. Finds Alice's assignments instantly.  │
     * │                                                                     │
     * │ REAL-WORLD USE:                                                     │
     * │   When Alice logs in and views her dashboard, we query              │
     * │   "give me all clients assigned to Alice." This index               │
     * │   makes that dashboard load fast.                                   │
     * │                                                                     │
     * │ NAMING: tablename_columnname_idx is a common convention.            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("assignments_assistant_member_id_idx").on(table.assistantMemberId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("assignments_client_id_idx")                                  │
     * │   .on(table.clientId)                                               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the client_id column.                           │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Find ALL assistants assigned to a specific client"               │
     * │                                                                     │
     * │   SQL:                                                              │
     * │     SELECT * FROM assignments                                       │
     * │       WHERE client_id = 'john-uuid'                                 │
     * │                                                                     │
     * │   In plain English:                                                 │
     * │     "Go to the assignments table. Find ALL rows where               │
     * │      client_id matches John Smith. Give me everything about them."  │
     * │                                                                     │
     * │ WITHOUT this index: Database scans every row looking for John's     │
     * │   assignments. SLOW for large tables.                               │
     * │                                                                     │
     * │ WITH this index: Database jumps directly to John's assignments.     │
     * │   FAST, even with millions of rows.                                 │
     * │                                                                     │
     * │ REAL-WORLD USE:                                                     │
     * │   When viewing a client's profile page, we query "who are all      │
     * │   the assistants assigned to this client?" This index makes         │
     * │   that profile page load fast.                                      │
     * │                                                                     │
     * │ TOGETHER WITH THE ASSISTANT INDEX ABOVE:                            │
     * │   We can efficiently query BOTH directions of the many-to-many:     │
     * │   - "Who are Alice's clients?"     → uses assistant_member_id index │
     * │   - "Who are John's assistants?"   → uses client_id index           │
     * │   This is the beauty of a junction table with proper indexing!      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("assignments_client_id_idx").on(table.clientId),
  ]
);

/**
 * ============================================================================
 * RELATIONS DEFINITION
 * ============================================================================
 */

/**
 * Assignment Relations (JUNCTION TABLE for Many-to-Many)
 *
 * Kevin, this is the KEY pattern for many-to-many relationships in Drizzle!
 *
 * MANY-TO-MANY PATTERN:
 *   OrgMembers (assistants) ◄────► Clients
 *              \                  /
 *               \                /
 *                ►  Assignments ◄
 *                 (junction table)
 *
 * HOW IT WORKS:
 *   1. Junction table (assignments) has TWO foreign keys
 *   2. Each FK points to one side of the relationship
 *   3. Junction table defines ONE relation to each parent
 *   4. Parent tables define MANY relation to junction
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER (see org_members.ts for full breakdown):              │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │                                                                     │
 *   │ SELECT = "fetch data"                                               │
 *   │ *      = "all columns" (give me everything about this row)          │
 *   │ FROM   = "look in this table"                                       │
 *   │ WHERE  = "only rows matching this condition"                        │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each assignment:
 *     assignment.assistant → "Find the ONE org member (assistant) for this assignment"
 *                            SELECT * FROM org_members WHERE id = assignment.assistant_member_id
 *     assignment.client    → "Find the ONE client for this assignment"
 *                            SELECT * FROM clients WHERE id = assignment.client_id
 *
 * QUERY EXAMPLE - Get all clients for an assistant:
 *   const result = await db.query.orgMembers.findFirst({
 *     where: eq(orgMembers.id, assistantId),
 *     with: {
 *       assignmentsAsAssistant: {  // many() defined in org_members.ts
 *         with: {
 *           client: true,          // one() defined here
 *         },
 *       },
 *     },
 *   });
 *   const clients = result.assignmentsAsAssistant.map(a => a.client);
 *
 * QUERY EXAMPLE - Get all assistants for a client:
 *   const result = await db.query.clients.findFirst({
 *     where: eq(clients.id, clientId),
 *     with: {
 *       assignments: {             // many() defined in clients.ts
 *         with: {
 *           assistant: true,       // one() defined here
 *         },
 *       },
 *     },
 *   });
 *   const assistants = result.assignments.map(a => a.assistant);
 */
export const assignmentsRelations = relations(assignments, ({ one }) => ({
  /**
   * ONE relationship: Assignment points to ONE OrgMember (the assistant)
   *
   * one(orgMembers, { ... }) means:
   *   - "This assignment links to exactly ONE org_member"
   *   - fields: [assignments.assistantMemberId] → FK on assignments table
   *   - references: [orgMembers.id]             → PK on org_members table
   *
   * SQL: JOIN org_members ON assignments.assistant_member_id = org_members.id
   */
  assistant: one(orgMembers, {
    fields: [assignments.assistantMemberId],  // FK column on this table
    references: [orgMembers.id],              // PK column on org_members
  }),

  /**
   * ONE relationship: Assignment points to ONE Client
   *
   * one(clients, { ... }) means:
   *   - "This assignment links to exactly ONE client"
   *   - fields: [assignments.clientId] → FK on assignments table
   *   - references: [clients.id]       → PK on clients table
   *
   * SQL: JOIN clients ON assignments.client_id = clients.id
   */
  client: one(clients, {
    fields: [assignments.clientId],  // FK column on this table
    references: [clients.id],        // PK column on clients
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Assignment = typeof assignments.$inferSelect
 *
 * Creates a TypeScript type representing an ASSIGNMENT ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 *
 * $inferSelect = "Infer the type for selecting data"
 * See orgs.ts for full explanation of $inferSelect.
 *
 * The resulting type looks roughly like:
 *   {
 *     id: string;                   // UUID
 *     assistantMemberId: string;    // UUID (FK to org_members)
 *     clientId: string;             // UUID (FK to clients)
 *     notes: string | null;         // nullable text
 *     createdAt: Date;              // timestamp
 *     updatedAt: Date;              // timestamp
 *   }
 *
 * USAGE EXAMPLE:
 *   const assignment: Assignment = await db.query.assignments.findFirst({
 *     where: eq(assignments.id, assignmentId),
 *   });
 *   assignment.assistantMemberId  // TypeScript knows this is a string
 *   assignment.notes              // TypeScript knows this is string | null
 *   assignment.createdAt          // TypeScript knows this is a Date
 */
export type Assignment = typeof assignments.$inferSelect;

/**
 * export type NewAssignment = typeof assignments.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new assignment.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * $inferInsert = "Infer the type for inserting data"
 * See orgs.ts for full explanation of $inferInsert.
 *
 * Required vs Optional fields:
 *   REQUIRED (must provide):
 *     - assistantMemberId: string   // Which assistant?
 *     - clientId: string            // Which client?
 *
 *   OPTIONAL (have defaults or are nullable):
 *     - id: string                  // Auto-generated UUID if omitted
 *     - notes: string | null        // Nullable, defaults to null
 *     - createdAt: Date             // Defaults to now
 *     - updatedAt: Date             // Defaults to now
 *
 * USAGE EXAMPLE:
 *   const newAssignment: NewAssignment = {
 *     assistantMemberId: "alice-uuid-123",           // Required
 *     clientId: "john-smith-uuid-456",               // Required
 *     notes: "Primary contact for tax matters",      // Optional
 *     // id, createdAt, updatedAt are auto-generated
 *   };
 *   await db.insert(assignments).values(newAssignment);
 */
export type NewAssignment = typeof assignments.$inferInsert;
