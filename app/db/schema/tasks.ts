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
 *       Tasks are the MOST connected table in the schema -- they link to
 *       orgs, users (THREE times!), clients, entities, assets, and documents.
 *       Without relations, we couldn't query "give me this task AND who
 *       it's assigned to AND which client it's for" in one go.
 * WHERE: "drizzle-orm" is a package installed via npm (in node_modules).
 *
 * See clients.ts for full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each import is a building block for creating the tasks table.
 *
 * Quick summary of each (see clients.ts for full explanations):
 *
 * pgTable   = Function to create a new database table
 *             Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *
 * uuid      = Column type for UUIDs (Universally Unique Identifier)
 *             Example: "550e8400-e29b-41d4-a716-446655440000"
 *             Tasks use UUIDs for their own ID and for ALL foreign keys.
 *             This table has MORE uuid columns than any other table because
 *             of its many relationships (org, 3 users, client, entity, asset, document).
 *
 * text      = Column type for text/strings (like "Review Q4 statement")
 *             Used here for task title and description.
 *
 * timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *             Tasks use timestamps for: due date, completed at, created at, updated at.
 *
 * jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format)
 *             Stores flexible metadata like task type, recurrence rules, checklists.
 *             See clients.ts for full explanation of JSONB.
 *
 * index     = Function to create database indexes for fast lookups.
 *             Tasks have SIX indexes because they're queried in many different ways.
 *             See clients.ts for full explanation of indexes.
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
 * import { taskStatusEnum, taskPriorityEnum } from "./00_enums"
 *
 * WHAT: Imports two PostgreSQL ENUM types defined in the enums file.
 * WHY:  These restrict the "status" and "priority" columns to specific allowed values.
 * WHERE: "./00_enums" = the 00_enums.ts file in the same directory (app/db/schema/).
 *        The "00_" prefix ensures this file loads first (alphabetical order matters
 *        for database migrations).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ENUM EXPLAINED:                                                     │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ An ENUM (short for "enumeration") is a column type that only       │
 * │ allows a FIXED SET of values. Think of it like a dropdown menu --  │
 * │ you can only pick from the options listed.                          │
 * │                                                                     │
 * │ taskStatusEnum allows:  "pending", "in_progress", "completed",     │
 * │                         "cancelled"                                 │
 * │                                                                     │
 * │ taskPriorityEnum allows: "low", "medium", "high", "urgent"         │
 * │                                                                     │
 * │ If you try to insert status = "done" → DATABASE ERROR!              │
 * │ "done" is not in the allowed list. You must use "completed".        │
 * │                                                                     │
 * │ WHY USE ENUMS instead of plain text?                                │
 * │ 1. VALIDATION: Database enforces allowed values (can't misspell)   │
 * │ 2. PERFORMANCE: Stored as integers internally, faster to compare   │
 * │ 3. DOCUMENTATION: The schema itself tells you what values exist    │
 * └─────────────────────────────────────────────────────────────────────┘
 */
import { taskStatusEnum, taskPriorityEnum } from "./00_enums";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition.
 * WHY:  Tasks belong to an org (multi-tenant isolation). We reference orgs.id
 *       to create a Foreign Key so every task is scoped to one organization.
 * WHERE: "./orgs" = the orgs.ts file in the same directory.
 *
 * See clients.ts for full explanation of the orgs import.
 */
import { orgs } from "./orgs";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition.
 * WHY:  Tasks reference users THREE separate times! This is unique in our schema.
 *       Most tables reference users once (like "created_by"), but tasks need:
 *         1. assigned_to  → WHO should do this task?
 *         2. created_by   → WHO created this task?
 *         3. completed_by → WHO marked this task done?
 *       All three columns point to users.id, but each means something different.
 * WHERE: "./users" = the users.ts file in the same directory.
 */
import { users } from "./users";

/**
 * import { clients } from "./clients"
 *
 * WHAT: Imports the clients table definition.
 * WHY:  A task can OPTIONALLY be linked to a client. For example:
 *       "Annual review for John Smith" → client_id points to John Smith's row.
 *       This is part of the POLYMORPHIC LINKING pattern (explained below).
 * WHERE: "./clients" = the clients.ts file in the same directory.
 */
import { clients } from "./clients";

/**
 * import { entities } from "./entities"
 *
 * WHAT: Imports the entities table definition.
 * WHY:  A task can OPTIONALLY be linked to an entity. For example:
 *       "File annual report for Smith Family Trust" → entity_id points to that trust.
 * WHERE: "./entities" = the entities.ts file in the same directory.
 */
import { entities } from "./entities";

/**
 * import { assets } from "./assets"
 *
 * WHAT: Imports the assets table definition.
 * WHY:  A task can OPTIONALLY be linked to an asset. For example:
 *       "Upload deed for 123 Main St" → asset_id points to that property.
 * WHERE: "./assets" = the assets.ts file in the same directory.
 */
import { assets } from "./assets";

/**
 * import { documents } from "./documents"
 *
 * WHAT: Imports the documents table definition.
 * WHY:  A task can OPTIONALLY be linked to a document. For example:
 *       "Verify expiring passport scan" → document_id points to that document.
 * WHERE: "./documents" = the documents.ts file in the same directory.
 */
import { documents } from "./documents";

/**
 * ============================================================================
 * TASKS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the WORKFLOW MANAGEMENT system for the wealth management app.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS A TASK?                                                     │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ A task is a to-do item that someone needs to complete.              │
 * │ Think of it like Trello, Asana, or Jira -- but built into the app. │
 * │                                                                     │
 * │ In a wealth management firm, tasks might be:                        │
 * │   - "Review Q4 statement for John Smith"                            │
 * │   - "Upload deed for 123 Main St in Smith Family Trust"             │
 * │   - "Verify expiring passport scan for Jane Doe"                    │
 * │   - "Schedule annual review meeting for all VIP clients"            │
 * │   - "Rebalance portfolio for Doe Family Foundation"                 │
 * │                                                                     │
 * │ KEY DESIGN FEATURES:                                                │
 * │                                                                     │
 * │ 1. MULTI-TENANT (org_id):                                          │
 * │    Every task belongs to exactly one org. Users in Org A can never  │
 * │    see tasks from Org B.                                            │
 * │                                                                     │
 * │ 2. TRIPLE USER REFERENCES:                                          │
 * │    Unlike most tables, tasks reference the users table THREE times: │
 * │    - assigned_to:  The person who SHOULD do the task                │
 * │    - created_by:   The person who CREATED the task                  │
 * │    - completed_by: The person who FINISHED the task                 │
 * │    This lets you answer: "Alice created a task, assigned it to      │
 * │    Bob, but Charlie actually completed it."                         │
 * │                                                                     │
 * │ 3. POLYMORPHIC CONTEXT LINKING:                                     │
 * │    A task can be linked to ANY combination of:                      │
 * │    - A client   (e.g., "for John Smith")                            │
 * │    - An entity  (e.g., "for Smith Family Trust")                    │
 * │    - An asset   (e.g., "for 123 Main St property")                  │
 * │    - A document (e.g., "review this passport scan")                 │
 * │    ALL of these are OPTIONAL (nullable). A task might link to:      │
 * │    - Just a client (general client task)                            │
 * │    - A client + entity + asset (specific asset task)                │
 * │    - Only a document (document review task)                         │
 * │    - Nothing at all (general org task like "Update CRM")            │
 * │                                                                     │
 * │ 4. WORKFLOW STATE:                                                  │
 * │    Status tracks the task lifecycle:                                 │
 * │    pending → in_progress → completed (or cancelled)                 │
 * │    Priority flags urgency: low → medium → high → urgent             │
 * └─────────────────────────────────────────────────────────────────────┘
 */

/**
 * export const tasks = pgTable(...)
 *
 * BREAKDOWN:
 *   export   = Makes this table available for other files to import
 *   const    = Declares a constant (value that won't change)
 *   tasks    = The name we use in TypeScript code
 *   pgTable  = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "tasks"        = The actual table name in the PostgreSQL database
 *   2. { columns }    = An object defining all the columns
 *   3. (table) => []  = A function returning an array of indexes
 *
 * See clients.ts for full explanation of pgTable.
 */
export const tasks = pgTable(
  "tasks", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table.
  // Tasks have MORE columns than most tables because of all the
  // relationships (3 user FKs + 4 polymorphic context FKs + org FK = 8 FKs total!)
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The unique identifier for each task.                                │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"            │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   This is THE unique identifier for each task row.                  │
     * │   No two tasks can have the same id. See clients.ts for full        │
     * │   explanation of Primary Keys.                                      │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when a new task is created. │
     * │   You don't need to provide an id when inserting a task.            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull()                                     │
     * │        .references(() => orgs.id, { onDelete: "cascade" })          │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Links this task to the organization it belongs to.            │
     * │ WHY:  Multi-tenant isolation. Every task MUST belong to exactly     │
     * │       one org. Users in "Acme Wealth" can never see tasks from      │
     * │       "Beta Advisors".                                              │
     * │                                                                     │
     * │ uuid("org_id")                                                      │
     * │   Creates a column named "org_id" that holds a UUID pointing        │
     * │   to a row in the orgs table.                                       │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every task MUST belong to an org. You cannot create a task        │
     * │   without specifying which org it's for.                            │
     * │   See clients.ts for full explanation of .notNull().                 │
     * │                                                                     │
     * │ .references(() => orgs.id, { onDelete: "cascade" })                 │
     * │   FOREIGN KEY: org_id must match an existing id in the orgs table.  │
     * │   onDelete: "cascade" = If the org is deleted, ALL its tasks are    │
     * │   deleted too. This makes sense because tasks without an org are    │
     * │   meaningless.                                                      │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     orgs table              tasks table                             │
     * │     ┌────────────┐          ┌────────────────────┐                  │
     * │     │ id (PK)    │◄─────────│ org_id (FK)        │                  │
     * │     │ "abc-123"  │          │ "abc-123"          │                  │
     * │     └────────────┘          │ title              │                  │
     * │                             │ status             │                  │
     * │                             └────────────────────┘                  │
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
     * │ title: text("title").notNull()                                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The name/title of the task -- the short summary that appears  │
     * │       in task lists, dashboards, and notifications.                  │
     * │ WHY:  Every task needs a human-readable description of what needs   │
     * │       to be done. This is the first thing users see.                │
     * │                                                                     │
     * │ text("title")                                                       │
     * │   Creates a text column named "title" in the database.              │
     * │   Can hold any string, like:                                        │
     * │     "Review Q4 statement for John Smith"                            │
     * │     "Upload deed for 123 Main St"                                   │
     * │     "Schedule annual review meeting"                                │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every task MUST have a title. A task without a name would be      │
     * │   useless -- how would you know what to do?                         │
     * │   If you try: INSERT INTO tasks (org_id) VALUES ('abc-123')         │
     * │   → DATABASE ERROR: "title cannot be null"                          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Task details
    title: text("title").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ description: text("description")                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: An optional longer description with more details about the    │
     * │       task. Think of the title as the subject line of an email and  │
     * │       the description as the email body.                            │
     * │ WHY:  Sometimes a title isn't enough. The description can include   │
     * │       detailed instructions, context, or notes.                     │
     * │                                                                     │
     * │ text("description")                                                 │
     * │   Creates a text column named "description".                        │
     * │   Example: "Please review the Q4 statement and check for any       │
     * │   discrepancies in the real estate valuations. Compare against      │
     * │   the appraisal from last March."                                   │
     * │                                                                     │
     * │ NO .notNull() → This column is NULLABLE (optional).                 │
     * │   Many tasks are self-explanatory from the title alone.             │
     * │   "Upload deed for 123 Main St" doesn't need more explanation.     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    description: text("description"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: taskStatusEnum("status").notNull().default("pending")       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The current workflow state of the task.                        │
     * │ WHY:  Tracks the task through its lifecycle from creation to        │
     * │       completion. This powers dashboards, filters, and reporting.   │
     * │                                                                     │
     * │ taskStatusEnum("status")                                            │
     * │   Creates a column named "status" using the task_status ENUM type.  │
     * │   ENUM means only these values are allowed:                         │
     * │                                                                     │
     * │   ┌───────────────┬───────────────────────────────────────────┐     │
     * │   │ Value         │ Meaning                                   │     │
     * │   ├───────────────┼───────────────────────────────────────────┤     │
     * │   │ "pending"     │ Task created but not started yet          │     │
     * │   │ "in_progress" │ Someone is actively working on it         │     │
     * │   │ "completed"   │ Task is done (completedAt/By get filled) │     │
     * │   │ "cancelled"   │ Task was abandoned or no longer needed    │     │
     * │   └───────────────┴───────────────────────────────────────────┘     │
     * │                                                                     │
     * │   LIFECYCLE:                                                        │
     * │     pending → in_progress → completed                               │
     * │         │                       ▲                                   │
     * │         └── cancelled           │ (or cancelled at any point)       │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every task MUST have a status. There's no such thing as a task    │
     * │   with an unknown state.                                            │
     * │                                                                     │
     * │ .default("pending")                                                 │
     * │   When a new task is created, it starts as "pending" unless you     │
     * │   specify otherwise. This makes sense -- new tasks haven't been     │
     * │   started yet!                                                      │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all pending tasks":                                      │
     * │   SELECT * FROM tasks WHERE status = 'pending'                      │
     * │                                                                     │
     * │   "Show me all overdue tasks still in progress":                    │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE status = 'in_progress' AND due_date < NOW()               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Workflow state
    status: taskStatusEnum("status").notNull().default("pending"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ priority: taskPriorityEnum("priority").notNull().default("medium")  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: How urgent/important this task is.                            │
     * │ WHY:  Lets users sort and filter tasks by importance. An "urgent"   │
     * │       task (like a compliance deadline) should appear above a       │
     * │       "low" priority task (like updating notes).                    │
     * │                                                                     │
     * │ taskPriorityEnum("priority")                                        │
     * │   Creates a column named "priority" using the task_priority ENUM.   │
     * │   Only these values are allowed:                                    │
     * │                                                                     │
     * │   ┌──────────┬────────────────────────────────────────────────┐     │
     * │   │ Value    │ Meaning                                        │     │
     * │   ├──────────┼────────────────────────────────────────────────┤     │
     * │   │ "low"    │ Nice-to-do, no deadline pressure               │     │
     * │   │ "medium" │ Standard work item, normal priority (default)  │     │
     * │   │ "high"   │ Important, should be done soon                 │     │
     * │   │ "urgent" │ Critical, needs immediate attention            │     │
     * │   └──────────┴────────────────────────────────────────────────┘     │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every task MUST have a priority. This ensures consistent sorting. │
     * │                                                                     │
     * │ .default("medium")                                                  │
     * │   New tasks default to "medium" priority. Most tasks are standard   │
     * │   work items -- only escalate to "high" or "urgent" when needed.    │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all urgent tasks for my org":                            │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE org_id = 'abc-123' AND priority = 'urgent'                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    priority: taskPriorityEnum("priority").notNull().default("medium"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ dueDate: timestamp("due_date", { withTimezone: true })              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The deadline for this task -- when it should be completed by. │
     * │ WHY:  Enables deadline tracking, overdue alerts, and calendar       │
     * │       views. A task without a due date is just a wish!              │
     * │                                                                     │
     * │ timestamp("due_date", { withTimezone: true })                       │
     * │   Creates a timestamp column named "due_date".                      │
     * │   { withTimezone: true } means it stores timezone info too.         │
     * │   Example: "2024-06-15T17:00:00-05:00" (June 15 at 5pm Central)    │
     * │                                                                     │
     * │ NO .notNull() → This column is NULLABLE (optional).                 │
     * │   Not every task has a hard deadline. Some tasks are "whenever you  │
     * │   get to it" items. When due_date is NULL, the task has no          │
     * │   deadline.                                                         │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Find overdue tasks" (due before now, but not completed):         │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE due_date < NOW()                                          │
     * │       AND status != 'completed'                                     │
     * │       AND status != 'cancelled'                                     │
     * │                                                                     │
     * │   NOTE: NOW() is a SQL function that returns the current time.      │
     * │   So "due_date < NOW()" means "the deadline has already passed."    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    dueDate: timestamp("due_date", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assignedTo: uuid("assigned_to")                                     │
     * │            .references(() => users.id, { onDelete: "set null" })    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The user who is RESPONSIBLE for completing this task.          │
     * │ WHY:  Every task needs an owner -- the person whose "My Tasks"      │
     * │       dashboard shows this item. This is FK #1 of 3 to the users   │
     * │       table.                                                        │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ WHY THREE FOREIGN KEYS TO THE SAME TABLE (users)?              │ │
     * │ ├─────────────────────────────────────────────────────────────────┤ │
     * │ │                                                                 │ │
     * │ │ Kevin, this is a pattern you'll see in real-world apps. Tasks  │ │
     * │ │ involve MULTIPLE people, each with a DIFFERENT role:            │ │
     * │ │                                                                 │ │
     * │ │   assigned_to  (FK #1) → WHO should do it?                     │ │
     * │ │   created_by   (FK #2) → WHO requested it?                     │ │
     * │ │   completed_by (FK #3) → WHO actually finished it?             │ │
     * │ │                                                                 │ │
     * │ │ REAL-WORLD EXAMPLE:                                             │ │
     * │ │   Alice (admin) creates a task "Review Q4 docs"                 │ │
     * │ │   She assigns it to Bob (assistant)                             │ │
     * │ │   Bob is out sick, so Charlie completes it instead              │ │
     * │ │                                                                 │ │
     * │ │   Result:                                                       │ │
     * │ │     created_by   = Alice's user id                              │ │
     * │ │     assigned_to  = Bob's user id                                │ │
     * │ │     completed_by = Charlie's user id                            │ │
     * │ │                                                                 │ │
     * │ │ All three columns point to users.id, but they answer DIFFERENT  │ │
     * │ │ questions about the task. That's why we need three FKs, not     │ │
     * │ │ just one!                                                       │ │
     * │ │                                                                 │ │
     * │ │ VISUAL:                                                         │ │
     * │ │                                                                 │ │
     * │ │   users table                  tasks table                      │ │
     * │ │   ┌────────────┐               ┌──────────────────┐             │ │
     * │ │   │ id (PK)    │◄──────────────│ assigned_to (FK) │  FK #1     │ │
     * │ │   │            │◄──────────────│ created_by  (FK) │  FK #2     │ │
     * │ │   │            │◄──────────────│ completed_by(FK) │  FK #3     │ │
     * │ │   │ "alice-id" │               │ title            │             │ │
     * │ │   │ "bob-id"   │               │ status           │             │ │
     * │ │   │ "charlie"  │               └──────────────────┘             │ │
     * │ │   └────────────┘                                                │ │
     * │ │        ▲                                                        │ │
     * │ │   One table, THREE arrows pointing to it                        │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * │                                                                     │
     * │ uuid("assigned_to")                                                 │
     * │   Creates a column named "assigned_to" that holds a UUID.           │
     * │                                                                     │
     * │ NO .notNull() → This column is NULLABLE (optional).                 │
     * │   A task might be unassigned -- like a general to-do that hasn't    │
     * │   been given to anyone yet. Think of it as a task sitting in an     │
     * │   "Unassigned" queue waiting to be picked up.                       │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   FOREIGN KEY: assigned_to must match an existing users.id.         │
     * │   onDelete: "set null" = If the user is deleted, set this column    │
     * │   to NULL instead of deleting the task. The task still exists, it   │
     * │   just becomes "unassigned."                                        │
     * │                                                                     │
     * │   WHY "set null" instead of "cascade"?                              │
     * │   If a user leaves the company and their account is deleted, we     │
     * │   don't want to lose all their tasks! We want to keep the tasks     │
     * │   so a manager can reassign them to someone else.                   │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me Bob's assigned tasks":                                   │
     * │   SELECT * FROM tasks WHERE assigned_to = 'bob-user-id'             │
     * │                                                                     │
     * │   "Show me unassigned tasks":                                       │
     * │   SELECT * FROM tasks WHERE assigned_to IS NULL                     │
     * │                                                                     │
     * │   NOTE: For NULL values, SQL uses "IS NULL" instead of "= NULL".    │
     * │   This is a common gotcha -- "WHERE assigned_to = NULL" won't work! │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Assignment
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdBy: uuid("created_by")                                       │
     * │           .references(() => users.id, { onDelete: "set null" })     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The user who CREATED this task. FK #2 of 3 to the users      │
     * │       table.                                                        │
     * │ WHY:  Audit trail. We need to know WHO requested the work.          │
     * │       If Bob has a question about a task, he needs to know who      │
     * │       created it so he can ask for clarification.                   │
     * │                                                                     │
     * │ uuid("created_by")                                                  │
     * │   Column named "created_by" holding a UUID pointing to users.id.    │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE (optional).                                │
     * │   Could be NULL if the task was system-generated (e.g., an          │
     * │   automatic recurring task) or if the creating user was deleted.    │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   Same as assigned_to -- if the creator is deleted, we keep the     │
     * │   task but clear the created_by field to NULL. The task history     │
     * │   is still valuable even without the creator reference.             │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all tasks Alice created":                                │
     * │   SELECT * FROM tasks WHERE created_by = 'alice-user-id'            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ clientId: uuid("client_id")                                         │
     * │          .references(() => clients.id, { onDelete: "set null" })    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Optionally links this task to a specific CLIENT.              │
     * │ WHY:  Provides context -- "this task is about John Smith."          │
     * │       This is the first of FOUR polymorphic context links.          │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ POLYMORPHIC CONTEXT LINKING EXPLAINED:                          │ │
     * │ ├─────────────────────────────────────────────────────────────────┤ │
     * │ │                                                                 │ │
     * │ │ Kevin, "polymorphic" means "many forms." In our schema, it     │ │
     * │ │ means a task can be linked to DIFFERENT TYPES of things:        │ │
     * │ │                                                                 │ │
     * │ │   client_id   → links to clients table   (OPTIONAL)             │ │
     * │ │   entity_id   → links to entities table  (OPTIONAL)             │ │
     * │ │   asset_id    → links to assets table    (OPTIONAL)             │ │
     * │ │   document_id → links to documents table (OPTIONAL)             │ │
     * │ │                                                                 │ │
     * │ │ ALL FOUR are nullable. A task can link to ANY combination:       │ │
     * │ │                                                                 │ │
     * │ │ EXAMPLE 1 - Client-only task:                                   │ │
     * │ │   title: "Annual review for John Smith"                         │ │
     * │ │   client_id: "john-smith-id"                                    │ │
     * │ │   entity_id: NULL                                               │ │
     * │ │   asset_id:  NULL                                               │ │
     * │ │   document_id: NULL                                             │ │
     * │ │                                                                 │ │
     * │ │ EXAMPLE 2 - Client + Entity + Asset task:                       │ │
     * │ │   title: "Upload deed for 123 Main St"                          │ │
     * │ │   client_id: "john-smith-id"     (for John Smith)               │ │
     * │ │   entity_id: "smith-trust-id"    (in Smith Family Trust)        │ │
     * │ │   asset_id:  "main-st-id"        (the property itself)          │ │
     * │ │   document_id: NULL                                             │ │
     * │ │                                                                 │ │
     * │ │ EXAMPLE 3 - Document-only task:                                 │ │
     * │ │   title: "Verify uploaded passport"                             │ │
     * │ │   client_id: NULL                                               │ │
     * │ │   entity_id: NULL                                               │ │
     * │ │   asset_id:  NULL                                               │ │
     * │ │   document_id: "passport-doc-id"                                │ │
     * │ │                                                                 │ │
     * │ │ EXAMPLE 4 - No context (general org task):                      │ │
     * │ │   title: "Update the CRM integration"                           │ │
     * │ │   client_id: NULL                                               │ │
     * │ │   entity_id: NULL                                               │ │
     * │ │   asset_id:  NULL                                               │ │
     * │ │   document_id: NULL                                             │ │
     * │ │                                                                 │ │
     * │ │ WHY NOT just a single "context_id" + "context_type" column?     │ │
     * │ │   That would lose type safety. With separate FKs, the database  │ │
     * │ │   ENFORCES that client_id actually points to a real client.     │ │
     * │ │   A single context_id couldn't have a FK constraint because     │ │
     * │ │   it could point to any of four different tables.               │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * │                                                                     │
     * │ uuid("client_id")                                                   │
     * │   Column named "client_id" holding a UUID pointing to clients.id.   │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE. The task may not be about a client.       │
     * │                                                                     │
     * │ .references(() => clients.id, { onDelete: "set null" })             │
     * │   If the client is deleted, keep the task but clear client_id.      │
     * │   The task work might still be relevant even without the client.    │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     clients table            tasks table                            │
     * │     ┌────────────┐           ┌────────────────────┐                 │
     * │     │ id (PK)    │◄─ ─ ─ ─ ─│ client_id (FK)     │                 │
     * │     │ "john-id"  │  optional │ "john-id" or NULL  │                 │
     * │     └────────────┘           └────────────────────┘                 │
     * │                                                                     │
     * │   The dashed arrow (─ ─ ─) means OPTIONAL relationship.            │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all tasks for client John Smith":                        │
     * │   SELECT * FROM tasks WHERE client_id = 'john-smith-id'             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Optional context links
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ entityId: uuid("entity_id")                                         │
     * │          .references(() => entities.id, { onDelete: "set null" })   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Optionally links this task to a specific ENTITY (like a      │
     * │       trust, LLC, corporation, etc.). Polymorphic context FK #2.    │
     * │ WHY:  Adds specificity. Instead of just "task for John Smith,"     │
     * │       you can say "task for John Smith's Family Trust."             │
     * │                                                                     │
     * │ uuid("entity_id")                                                   │
     * │   Column named "entity_id" holding a UUID.                          │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE. Most tasks don't need entity context.     │
     * │                                                                     │
     * │ .references(() => entities.id, { onDelete: "set null" })            │
     * │   If the entity is deleted, keep the task but clear entity_id.      │
     * │   Same pattern as client_id above.                                  │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     entities table           tasks table                            │
     * │     ┌────────────┐           ┌────────────────────┐                 │
     * │     │ id (PK)    │◄─ ─ ─ ─ ─│ entity_id (FK)     │                 │
     * │     │ "trust-id" │  optional │ "trust-id" or NULL │                 │
     * │     └────────────┘           └────────────────────┘                 │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all tasks for Smith Family Trust":                       │
     * │   SELECT * FROM tasks WHERE entity_id = 'smith-trust-id'            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assetId: uuid("asset_id")                                           │
     * │         .references(() => assets.id, { onDelete: "set null" })      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Optionally links this task to a specific ASSET (like a       │
     * │       property, investment account, etc.). Polymorphic FK #3.       │
     * │ WHY:  Adds even more specificity. "Upload deed for the property    │
     * │       at 123 Main St" -- the asset_id pinpoints exactly which      │
     * │       asset the task is about.                                      │
     * │                                                                     │
     * │ uuid("asset_id")                                                    │
     * │   Column named "asset_id" holding a UUID.                           │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE. Only asset-specific tasks need this.      │
     * │                                                                     │
     * │ .references(() => assets.id, { onDelete: "set null" })              │
     * │   If the asset is deleted, keep the task but clear asset_id.        │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     assets table             tasks table                            │
     * │     ┌────────────┐           ┌────────────────────┐                 │
     * │     │ id (PK)    │◄─ ─ ─ ─ ─│ asset_id (FK)      │                 │
     * │     │ "prop-id"  │  optional │ "prop-id" or NULL  │                 │
     * │     └────────────┘           └────────────────────┘                 │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all tasks for the 123 Main St property":                 │
     * │   SELECT * FROM tasks WHERE asset_id = 'main-st-asset-id'           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ documentId: uuid("document_id")                                     │
     * │            .references(() => documents.id, { onDelete: "set null" })│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Optionally links this task to a specific DOCUMENT (like a    │
     * │       passport scan, deed, tax return, etc.). Polymorphic FK #4.    │
     * │ WHY:  Document-related tasks are very common in wealth management:  │
     * │       "Verify this uploaded passport", "Review this tax return",    │
     * │       "Replace this expired insurance certificate."                 │
     * │                                                                     │
     * │ uuid("document_id")                                                 │
     * │   Column named "document_id" holding a UUID.                        │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE. Only document-specific tasks need this.   │
     * │                                                                     │
     * │ .references(() => documents.id, { onDelete: "set null" })           │
     * │   If the document is deleted, keep the task but clear document_id.  │
     * │   The task "verify passport" still matters as a historical record   │
     * │   even if the specific document was removed.                        │
     * │                                                                     │
     * │   VISUAL:                                                           │
     * │     documents table          tasks table                            │
     * │     ┌────────────┐           ┌────────────────────┐                 │
     * │     │ id (PK)    │◄─ ─ ─ ─ ─│ document_id (FK)   │                 │
     * │     │ "doc-id"   │  optional │ "doc-id" or NULL   │                 │
     * │     └────────────┘           └────────────────────┘                 │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show me all tasks linked to a specific document":                │
     * │   SELECT * FROM tasks WHERE document_id = 'passport-doc-id'         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ completedAt: timestamp("completed_at", { withTimezone: true })      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date and time when this task was marked as completed.      │
     * │ WHY:  Completion tracking and performance reporting. You can         │
     * │       measure things like:                                          │
     * │       - "How long did this task take?" (completedAt - createdAt)    │
     * │       - "Was it done before the deadline?" (completedAt <= dueDate) │
     * │       - "How many tasks did the team complete this week?"           │
     * │                                                                     │
     * │ timestamp("completed_at", { withTimezone: true })                   │
     * │   Creates a timestamp column with timezone info.                    │
     * │   Example: "2024-06-10T14:30:00-05:00"                             │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE. This starts as NULL when the task is      │
     * │   created (it hasn't been completed yet!). It only gets a value     │
     * │   when someone marks the task as done.                              │
     * │                                                                     │
     * │ NO .defaultNow() → Unlike createdAt, this has NO default.           │
     * │   It stays NULL until explicitly set when completing the task.      │
     * │                                                                     │
     * │ RELATIONSHIP WITH STATUS:                                           │
     * │   When status changes to "completed":                               │
     * │     - completedAt gets set to the current time                      │
     * │     - completedBy gets set to the user who completed it             │
     * │   These three fields work TOGETHER as a completion record.          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Completion tracking
    completedAt: timestamp("completed_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ completedBy: uuid("completed_by")                                   │
     * │             .references(() => users.id, { onDelete: "set null" })   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The user who MARKED this task as completed. FK #3 of 3 to    │
     * │       the users table.                                              │
     * │ WHY:  Audit trail for completion. This may DIFFER from assigned_to! │
     * │                                                                     │
     * │ WHY MIGHT completed_by DIFFER FROM assigned_to?                     │
     * │   - A manager completes a task on behalf of a sick team member      │
     * │   - An admin bulk-completes overdue tasks during cleanup            │
     * │   - The assigned person re-assigned the task, but the new person   │
     * │     forgot to update the assigned_to field before completing it     │
     * │   - A system process auto-completes a task (completed_by = null)   │
     * │                                                                     │
     * │ uuid("completed_by")                                                │
     * │   Column named "completed_by" holding a UUID pointing to users.id.  │
     * │                                                                     │
     * │ NO .notNull() → NULLABLE. Starts as NULL (task not done yet).       │
     * │   Only gets filled when the task is completed.                      │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "set null" })               │
     * │   If the completing user is deleted, keep the task's completion     │
     * │   record but clear the completed_by reference. We still know WHEN  │
     * │   it was completed (completedAt), just not by whom.                 │
     * │                                                                     │
     * │ QUERY EXAMPLE:                                                      │
     * │   "Show tasks that Bob completed (even if he wasn't the assignee)": │
     * │   SELECT * FROM tasks WHERE completed_by = 'bob-user-id'            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    completedBy: uuid("completed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ metadata: jsonb("metadata").$type<TaskMetadata>().default({})       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: Flexible JSON storage for additional task information that    │
     * │       doesn't warrant its own column.                               │
     * │ WHY:  Tasks have many OPTIONAL pieces of data that vary by task    │
     * │       type. Instead of adding 10+ nullable columns (most of which  │
     * │       would be empty), we store them in a single JSONB column.     │
     * │                                                                     │
     * │ jsonb("metadata")                                                   │
     * │   Creates a JSONB column named "metadata". JSONB stores structured  │
     * │   data efficiently. See clients.ts for full explanation of JSONB.   │
     * │                                                                     │
     * │ .$type<TaskMetadata>()                                              │
     * │   Tells TypeScript what shape the JSON should have.                 │
     * │   TaskMetadata is an interface defined below this table. It gives   │
     * │   us autocomplete and type-checking! For example, if you try to    │
     * │   set metadata.recurrence.frequency to "biweekly", TypeScript      │
     * │   will flag an error because that's not an allowed value.           │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no metadata is provided, use an empty object {}.               │
     * │   This means metadata is never NULL -- it's always at least {}.     │
     * │                                                                     │
     * │ EXAMPLE DATA stored in this column:                                 │
     * │   {                                                                 │
     * │     "taskType": "review",                                           │
     * │     "recurrence": {                                                 │
     * │       "frequency": "quarterly",                                     │
     * │       "nextDue": "2024-10-01"                                       │
     * │     },                                                              │
     * │     "checklist": [                                                   │
     * │       { "item": "Review balances", "completed": true },             │
     * │       { "item": "Check allocations", "completed": false }           │
     * │     ],                                                              │
     * │     "tags": ["compliance", "quarterly"]                              │
     * │   }                                                                 │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Additional metadata
    metadata: jsonb("metadata").$type<TaskMetadata>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │           .notNull().defaultNow()                                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date and time when this task was created.                  │
     * │ WHY:  Audit trail and sorting. "When was this task made?"           │
     * │       Used to sort tasks by "recently created" and to measure       │
     * │       how long tasks sit before completion.                         │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Creates a timestamp column with timezone info.                    │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every task MUST have a creation timestamp.                        │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   Automatically set to the current time when the row is inserted.   │
     * │   You don't need to provide this -- the database fills it in.       │
     * │                                                                     │
     * │ See clients.ts for full explanation of createdAt pattern.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Standard timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })          │
     * │           .notNull().defaultNow().$onUpdate(() => new Date())       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: The date and time when this task was last modified.            │
     * │ WHY:  Tracks when status changes, reassignments, or edits happen.   │
     * │       "When was this task last touched?"                            │
     * │                                                                     │
     * │ Same pattern as createdAt, plus:                                    │
     * │                                                                     │
     * │ .$onUpdate(() => new Date())                                        │
     * │   AUTOMATICALLY updates this timestamp whenever the row is modified.│
     * │   This is handled by Drizzle (in the app layer), not by the        │
     * │   database itself. Every time you UPDATE any column on this row,    │
     * │   updated_at gets refreshed to the current time.                    │
     * │                                                                     │
     * │ See clients.ts for full explanation of updatedAt pattern.           │
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
   * This function returns an array of INDEXES for the tasks table.
   * Tasks have SIX indexes because they're queried in many different ways.
   *
   * See clients.ts for full explanation of what indexes are and why we need them.
   *
   * Quick recap: An index is like the index at the back of a book.
   * Without it, the database scans EVERY row (slow).
   * With it, the database jumps directly to matching rows (fast).
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("tasks_org_id_idx").on(table.orgId)                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ INDEX #1: Org-scoped queries                                        │
     * │                                                                     │
     * │ WHY: EVERY query in the app filters by org_id first (multi-tenant   │
     * │      isolation). This is the most fundamental index.                │
     * │                                                                     │
     * │ QUERY PATTERN it speeds up:                                         │
     * │   "Get all tasks in org X"                                          │
     * │   SELECT * FROM tasks WHERE org_id = 'abc-123'                      │
     * │                                                                     │
     * │ NAMING: tasks_org_id_idx = tasks table + org_id column + idx suffix │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Org-scoped queries
    index("tasks_org_id_idx").on(table.orgId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("tasks_assigned_to_idx").on(table.assignedTo)                 │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ INDEX #2: "My Tasks" queries                                        │
     * │                                                                     │
     * │ WHY: The most common user action is "Show me MY tasks."             │
     * │      Every user's dashboard filters by their assigned_to id.        │
     * │      Without this index, the database would scan every task to      │
     * │      find the ones assigned to a specific user.                     │
     * │                                                                     │
     * │ QUERY PATTERN it speeds up:                                         │
     * │   "Get all tasks assigned to user Bob"                              │
     * │   SELECT * FROM tasks WHERE assigned_to = 'bob-user-id'             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // My tasks (user's assigned tasks)
    index("tasks_assigned_to_idx").on(table.assignedTo),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("tasks_org_status_idx").on(table.orgId, table.status)         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ INDEX #3: Filter tasks by status within an org                      │
     * │                                                                     │
     * │ WHY: Dashboards commonly show tasks grouped or filtered by status.  │
     * │      "Show me all pending tasks in my org" or "Show me completed    │
     * │      tasks this month" are very frequent queries.                   │
     * │                                                                     │
     * │ COMPOSITE INDEX: This is on TWO columns (org_id + status).          │
     * │   The database can use both columns together for fast lookups.      │
     * │                                                                     │
     * │ QUERY PATTERN it speeds up:                                         │
     * │   "Get all pending tasks in org X"                                  │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE org_id = 'abc-123' AND status = 'pending'                 │
     * │                                                                     │
     * │   "Count tasks by status for org X" (for a dashboard pie chart)     │
     * │   SELECT status, COUNT(*) FROM tasks                                │
     * │     WHERE org_id = 'abc-123' GROUP BY status                        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Filter by status
    index("tasks_org_status_idx").on(table.orgId, table.status),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("tasks_due_date_idx").on(table.dueDate)                       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ INDEX #4: Find overdue or upcoming tasks                            │
     * │                                                                     │
     * │ WHY: Deadline management is critical. The app needs to quickly      │
     * │      find tasks that are overdue or due soon to send alerts and     │
     * │      populate "Due Today" / "Overdue" views.                        │
     * │                                                                     │
     * │ QUERY PATTERNS it speeds up:                                        │
     * │   "Find all overdue tasks":                                         │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE due_date < NOW() AND status NOT IN ('completed','cancelled')│
     * │                                                                     │
     * │   "Find tasks due in the next 7 days":                              │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'      │
     * │                                                                     │
     * │   NOTE: BETWEEN is a SQL keyword that checks if a value falls       │
     * │   within a range. INTERVAL '7 days' adds 7 days to the current time.│
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Find overdue tasks
    index("tasks_due_date_idx").on(table.dueDate),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("tasks_org_client_idx").on(table.orgId, table.clientId)       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ INDEX #5: Tasks for a specific client within an org                 │
     * │                                                                     │
     * │ WHY: When viewing a client's profile page, you need to quickly      │
     * │      load all tasks related to that client. This composite index    │
     * │      combines org_id (for tenant isolation) with client_id.         │
     * │                                                                     │
     * │ QUERY PATTERN it speeds up:                                         │
     * │   "Get all tasks for client John Smith in org X"                    │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE org_id = 'abc-123' AND client_id = 'john-smith-id'        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Tasks for a client
    index("tasks_org_client_idx").on(table.orgId, table.clientId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("tasks_org_created_at_idx").on(table.orgId, table.createdAt)  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ INDEX #6: Recently created tasks within an org                      │
     * │                                                                     │
     * │ WHY: Task lists are often sorted by creation date ("newest first"). │
     * │      This composite index lets the database efficiently sort tasks  │
     * │      by createdAt while still filtering by org_id.                  │
     * │                                                                     │
     * │ QUERY PATTERN it speeds up:                                         │
     * │   "Get the 20 most recently created tasks in org X"                 │
     * │   SELECT * FROM tasks                                               │
     * │     WHERE org_id = 'abc-123'                                        │
     * │     ORDER BY created_at DESC                                        │
     * │     LIMIT 20                                                        │
     * │                                                                     │
     * │   NOTE: ORDER BY created_at DESC sorts by creation date in          │
     * │   DESCending order (newest first). LIMIT 20 returns only the        │
     * │   first 20 results (pagination).                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    // Recently created tasks
    index("tasks_org_created_at_idx").on(table.orgId, table.createdAt),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ TaskMetadata Interface                                              │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ This defines the SHAPE of the JSON stored in the "metadata" column. │
 * │ TypeScript uses this for autocomplete and error checking.           │
 * │                                                                     │
 * │ Kevin, this is a TypeScript INTERFACE -- it's like a blueprint      │
 * │ that says "if you put JSON into the metadata column, it should      │
 * │ look like THIS." The database stores it as raw JSON, but TypeScript │
 * │ checks your code to make sure you're using the right field names    │
 * │ and types.                                                          │
 * │                                                                     │
 * │ The "?" after each property means it's OPTIONAL (can be undefined). │
 * │ Since this is metadata, ALL fields are optional -- you only include  │
 * │ what's relevant to the specific task.                               │
 * │                                                                     │
 * │ See clients.ts ClientProfile for a similar pattern.                 │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export interface TaskMetadata {
  /**
   * taskType?: string
   *
   * WHAT: Categorizes the kind of work this task involves.
   * WHY:  Lets you filter or group tasks by type in the UI.
   *       Unlike status (which tracks WHERE in the workflow), taskType
   *       tracks WHAT KIND of work it is.
   *
   * Example values: "review", "upload", "verify", "meeting", "compliance"
   *
   * WHY NOT an enum column?
   *   Task types can vary widely between orgs and may change often.
   *   Putting them in metadata (free-form) gives flexibility without
   *   needing database migrations to add new types.
   */
  taskType?: string; // 'review', 'upload', 'verify', 'meeting', etc.

  /**
   * recurrence?: { frequency, nextDue }
   *
   * WHAT: Defines a REPEATING schedule for the task.
   * WHY:  Many wealth management tasks repeat on a schedule:
   *       - Quarterly portfolio reviews
   *       - Annual compliance checks
   *       - Monthly statement reviews
   *
   * When a recurring task is completed, the app can read this field
   * and automatically create the NEXT task with the nextDue date.
   *
   * frequency: How often the task repeats.
   *   "daily"     = every day
   *   "weekly"    = every week
   *   "monthly"   = every month
   *   "quarterly" = every 3 months
   *   "annually"  = every year
   *
   * nextDue?: The ISO date string for when the NEXT occurrence should
   *           be created. Example: "2024-10-01"
   *           The app uses this to know when to spawn the next task.
   */
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
    nextDue?: string;
  };

  /**
   * checklist?: Array<{ item, completed }>
   *
   * WHAT: A list of sub-tasks or steps within this task.
   * WHY:  Some tasks have multiple steps that need to be tracked
   *       individually. Think of it like a to-do list WITHIN a to-do.
   *
   * EXAMPLE:
   *   checklist: [
   *     { item: "Review balance sheet",   completed: true  },
   *     { item: "Check asset allocations", completed: false },
   *     { item: "Verify tax documents",    completed: false },
   *   ]
   *
   * The UI can show checkboxes for each item and track progress
   * like "1 of 3 steps completed."
   *
   * item: string       = Description of the sub-task
   * completed: boolean = Whether this specific step is done (true/false)
   */
  checklist?: Array<{
    item: string;
    completed: boolean;
  }>;

  /**
   * notes?: string
   *
   * WHAT: Free-form notes or comments about the task.
   * WHY:  A catch-all for any additional context that doesn't fit
   *       elsewhere. Could be internal notes, special instructions,
   *       or conversation history about the task.
   */
  notes?: string;

  /**
   * tags?: string[]
   *
   * WHAT: An array of label strings for categorization.
   * WHY:  Flexible tagging allows cross-cutting categorization.
   *       A task could be tagged ["compliance", "quarterly", "vip"]
   *       enabling search across any of those dimensions.
   *
   * Example: ["compliance", "q4-2024", "high-value-client"]
   */
  tags?: string[];
}

/**
 * Task Relations (POLYMORPHIC LINKING + TRIPLE USER REFERENCE)
 *
 * Kevin, tasks are the most CONNECTED table in our schema.
 * They combine polymorphic linking (like documents) with multiple user FKs.
 *
 * POLYMORPHIC CONTEXT (what the task is about):
 *   ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
 *   │ Client   │  │ Entity   │  │ Asset   │  │ Document │
 *   │(optional)│  │(optional)│  │(optional)│  │(optional)│
 *   └────┬─────┘  └────┬─────┘  └────┬────┘  └────┬─────┘
 *        └──────────────┴─────────────┴─────────────┘
 *                            │
 *                      ┌─────┴─────┐
 *                      │   Task    │
 *                      └─────┬─────┘
 *                            │
 *   ┌────────────────────────┼────────────────────────┐
 *   │                        │                        │
 *   ▼                        ▼                        ▼
 *   assignedToUser      createdByUser          completedByUser
 *   (who does it)       (who made it)          (who finished it)
 *
 * THREE FKs TO users TABLE:
 *   Tasks reference users THREE times. Each FK means something different:
 *   - assigned_to:  WHO should do this task
 *   - created_by:   WHO created this task
 *   - completed_by: WHO marked it done (may differ from assignee)
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
 *   For each task:
 *     task.org             → "Find the ONE org this task belongs to"
 *                            SELECT * FROM orgs WHERE id = task.org_id
 *     task.assignedToUser  → "Find the ONE user who should do this task"
 *                            SELECT * FROM users WHERE id = task.assigned_to
 *     task.createdByUser   → "Find the ONE user who created this task"
 *                            SELECT * FROM users WHERE id = task.created_by
 *     task.completedByUser → "Find the ONE user who finished this task"
 *                            SELECT * FROM users WHERE id = task.completed_by
 *     task.client          → "Find the ONE client (if any) this task relates to"
 *                            SELECT * FROM clients WHERE id = task.client_id
 *     task.entity          → "Find the ONE entity (if any) this task relates to"
 *                            SELECT * FROM entities WHERE id = task.entity_id
 *     task.asset           → "Find the ONE asset (if any) this task relates to"
 *                            SELECT * FROM assets WHERE id = task.asset_id
 *     task.document        → "Find the ONE document (if any) this task relates to"
 *                            SELECT * FROM documents WHERE id = task.document_id
 *
 * QUERY EXAMPLE - Get my pending tasks with context:
 *   const myTasks = await db.query.tasks.findMany({
 *     where: and(
 *       eq(tasks.assignedTo, userId),
 *       eq(tasks.status, "pending"),
 *     ),
 *     with: {
 *       client: true,         // Which client is this for?
 *       entity: true,         // Which entity?
 *       createdByUser: true,  // Who assigned this to me?
 *     },
 *     orderBy: asc(tasks.dueDate),
 *   });
 *
 * QUERY EXAMPLE - Get task with full audit trail:
 *   const task = await db.query.tasks.findFirst({
 *     where: eq(tasks.id, taskId),
 *     with: {
 *       assignedToUser: true,
 *       createdByUser: true,
 *       completedByUser: true,
 *       client: true,
 *       document: true,
 *     },
 *   });
 *   // task.createdByUser.fullName = "Alice" (who made the task)
 *   // task.assignedToUser.fullName = "Bob" (who should do it)
 *   // task.completedByUser?.fullName = "Bob" (who actually did it, or null)
 */
export const tasksRelations = relations(tasks, ({ one }) => ({
  /**
   * ONE relationship: Task belongs to ONE Org (REQUIRED)
   * SQL: SELECT * FROM orgs WHERE id = task.org_id
   */
  org: one(orgs, {
    fields: [tasks.orgId],
    references: [orgs.id],
  }),

  /**
   * ONE relationship: Task is assigned to ONE User (OPTIONAL)
   *
   * "Who should do this task?"
   * SQL: SELECT * FROM users WHERE id = task.assigned_to
   */
  assignedToUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),

  /**
   * ONE relationship: Task was created by ONE User (OPTIONAL)
   *
   * "Who made this task?"
   * SQL: SELECT * FROM users WHERE id = task.created_by
   */
  createdByUser: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),

  /**
   * ONE relationship: Task was completed by ONE User (OPTIONAL)
   *
   * "Who marked this task done?"
   * May differ from assignee (e.g., admin completed on behalf).
   * SQL: SELECT * FROM users WHERE id = task.completed_by
   */
  completedByUser: one(users, {
    fields: [tasks.completedBy],
    references: [users.id],
  }),

  /**
   * ONE relationship: Task MAY be for ONE Client (OPTIONAL)
   * SQL: SELECT * FROM clients WHERE id = task.client_id
   */
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),

  /**
   * ONE relationship: Task MAY be for ONE Entity (OPTIONAL)
   * SQL: SELECT * FROM entities WHERE id = task.entity_id
   */
  entity: one(entities, {
    fields: [tasks.entityId],
    references: [entities.id],
  }),

  /**
   * ONE relationship: Task MAY be for ONE Asset (OPTIONAL)
   * SQL: SELECT * FROM assets WHERE id = task.asset_id
   */
  asset: one(assets, {
    fields: [tasks.assetId],
    references: [assets.id],
  }),

  /**
   * ONE relationship: Task MAY be for ONE Document (OPTIONAL)
   *
   * "Review this document", "Verify this upload", etc.
   * SQL: SELECT * FROM documents WHERE id = task.document_id
   */
  document: one(documents, {
    fields: [tasks.documentId],
    references: [documents.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Task = typeof tasks.$inferSelect
 *
 * WHAT: Creates a TypeScript type representing a TASK ROW from the database.
 * WHY:  Used when you SELECT (read) data FROM the database. TypeScript uses
 *       this type to give you autocomplete and catch errors.
 *
 * Example:
 *   const task: Task = await db.query.tasks.findFirst();
 *   task.title       // TypeScript knows this is a string
 *   task.status      // TypeScript knows this is "pending" | "in_progress" | "completed" | "cancelled"
 *   task.assignedTo  // TypeScript knows this is string | null (nullable FK)
 *   task.dueDate     // TypeScript knows this is Date | null
 *   task.metadata    // TypeScript knows this is TaskMetadata
 *
 * All columns are present because SELECT returns the full row.
 *
 * See clients.ts for full explanation of $inferSelect.
 */
export type Task = typeof tasks.$inferSelect;

/**
 * export type NewTask = typeof tasks.$inferInsert
 *
 * WHAT: Creates a TypeScript type for INSERTING a new task.
 * WHY:  Some fields are optional (have defaults or are nullable), so this
 *       type reflects which fields you MUST provide vs. which are optional.
 *
 * Example:
 *   const newTask: NewTask = {
 *     orgId: "abc-123",                          // REQUIRED - which org
 *     title: "Review Q4 statement",              // REQUIRED - task name
 *     // status defaults to "pending"            // OPTIONAL - has default
 *     // priority defaults to "medium"           // OPTIONAL - has default
 *     assignedTo: "bob-user-id",                 // OPTIONAL - who does it
 *     clientId: "john-smith-id",                 // OPTIONAL - polymorphic link
 *     dueDate: new Date("2024-06-15"),           // OPTIONAL - deadline
 *     // createdAt/updatedAt auto-filled         // OPTIONAL - has defaults
 *     // metadata defaults to {}                 // OPTIONAL - has default
 *   };
 *   await db.insert(tasks).values(newTask);
 *
 * See clients.ts for full explanation of $inferInsert.
 */
export type NewTask = typeof tasks.$inferInsert;
