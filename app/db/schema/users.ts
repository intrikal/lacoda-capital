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
 *       For example, "a user has many org memberships" or "a user has many tasks".
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * Without relations, we could store data but couldn't easily query
 * "give me a user AND all their org memberships" in one go.
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
 *
 *   uuid      = Column type for UUIDs (Universally Unique Identifier)
 *               A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *               It's a random 36-character string that's practically impossible to guess.
 *               (See orgs.ts for full explanation of why we use UUIDs)
 *
 *   text      = Column type for text/strings (like "John Smith" or "john@email.com")
 *               Can hold any length of text.
 *
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *               We use { withTimezone: true } to track the timezone too.
 *               (See orgs.ts for full explanation of timestamps)
 *
 *   jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format)
 *               Allows storing flexible, structured data like:
 *               { "theme": "dark", "notifications": { "email": true } }
 *               The "b" in jsonb means "binary" - it's stored efficiently.
 *               (See orgs.ts for full explanation of JSONB)
 *
 *   index     = Function to create database indexes (makes queries faster)
 *               (See orgs.ts for full explanation of indexes)
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
 * import { orgMembers } from "./org_members"
 *
 * WHAT: Imports the org_members table definition from the org_members.ts file.
 * WHY:  We need to reference it to define the relationship "a user has many org memberships".
 *       Drizzle needs to know what table we're relating to.
 * WHERE: "./" means "same directory", so this imports from app/db/schema/org_members.ts
 */
import { orgMembers } from "./org_members";

/**
 * import { tasks } from "./tasks"
 *
 * WHAT: Imports the tasks table definition.
 * WHY:  Users can be assigned tasks. We need this to define the
 *       "a user has many assigned tasks" relationship.
 * WHERE: Same directory - app/db/schema/tasks.ts
 */
import { tasks } from "./tasks";

/**
 * import { notifications } from "./notifications"
 *
 * WHAT: Imports the notifications table definition.
 * WHY:  Users receive notifications. We need this to define the
 *       "a user has many notifications" relationship.
 * WHERE: Same directory - app/db/schema/notifications.ts
 */
import { notifications } from "./notifications";

/**
 * import { ledgerEvents } from "./ledger_events"
 *
 * WHAT: Imports the ledger_events table definition.
 * WHY:  Users perform actions that create ledger events (audit trail).
 *       We need this to define "a user has many ledger events as actor".
 * WHERE: Same directory - app/db/schema/ledger_events.ts
 */
import { ledgerEvents } from "./ledger_events";

/**
 * ============================================================================
 * USERS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the USERS table - it stores user profile data.
 *
 * IMPORTANT DISTINCTION:
 *   There are TWO places user data lives:
 *
 *   1. SUPABASE auth.users (NOT this table)
 *      - Managed by Supabase authentication
 *      - Stores: password hash, email verification, login tokens
 *      - We don't touch this directly
 *
 *   2. THIS users table (what we're defining here)
 *      - Stores: profile info, preferences, display name, avatar
 *      - This is OUR app-specific data about users
 *      - The id MATCHES auth.users.id so we can link them
 *
 *   WHY SEPARATE?
 *   - Supabase handles security-sensitive auth data
 *   - We control our own profile/preferences data
 *   - Clean separation of concerns
 */

/**
 * export const users = pgTable(...)
 *
 * BREAKDOWN:
 *   export   = Makes this available for other files to import
 *              Other files can do: import { users } from "./users"
 *
 *   const    = Declares a constant (value that won't change)
 *
 *   users    = The name we give this table in our TypeScript code
 *              We'll use it like: db.query.users.findMany()
 *
 *   pgTable  = The function that creates a PostgreSQL table
 *              (See orgs.ts for full explanation)
 *
 * pgTable takes 3 arguments:
 *   1. "users"       = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes
 */
export const users = pgTable(
  "users", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey()                                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column.                                │
     * │ (See orgs.ts for full explanation of Primary Keys)                  │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In code, we use: users.id           │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "550e8400-e29b-41d4-a716-446655440000"             │
     * │   (See orgs.ts for full explanation of UUIDs)                       │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each row.                    │
     * │   - UNIQUE: No two users can have the same id                       │
     * │   - NOT NULL: Every user MUST have an id                            │
     * │   - IMMUTABLE: Should never change once set                         │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ NOTE: NO .defaultRandom() HERE!                                 │ │
     * │ │                                                                 │ │
     * │ │ Unlike orgs.ts which has .defaultRandom(), this table does NOT. │ │
     * │ │                                                                 │ │
     * │ │ WHY? Because the id comes from Supabase auth.users.id           │ │
     * │ │                                                                 │ │
     * │ │ When a user signs up:                                           │ │
     * │ │   1. Supabase creates auth.users row with id = "abc-123"        │ │
     * │ │   2. We create users row with SAME id = "abc-123"               │ │
     * │ │   3. Now both tables are linked by the same id                  │ │
     * │ │                                                                 │ │
     * │ │ This is called "matching primary keys" - a way to link tables   │ │
     * │ │ across different schemas (auth schema vs public schema).        │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ email: text("email").notNull().unique()                             │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ text("email")                                                       │
     * │   Creates a TEXT column named "email" in the database.              │
     * │   Example values: "john@example.com", "jane.doe@company.org"        │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   This column CANNOT be empty. Every user MUST have an email.       │
     * │   (See orgs.ts for full explanation of .notNull())                  │
     * │                                                                     │
     * │ .unique()                                                           │
     * │   No two users can have the same email address.                     │
     * │   (See orgs.ts slug column for full explanation of .unique())       │
     * │                                                                     │
     * │   If you try to create a user with an existing email:               │
     * │     await db.insert(users).values({                                 │
     * │       id: "new-user-id",                                            │
     * │       email: "john@example.com"  // ← Already exists!               │
     * │     });                                                             │
     * │     → DATABASE ERROR: "duplicate key violates unique"               │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ DENORMALIZATION NOTE:                                           │ │
     * │ │                                                                 │ │
     * │ │ This email is "denormalized" - it's a COPY of auth.users.email. │ │
     * │ │                                                                 │ │
     * │ │ SOURCE OF TRUTH: Supabase auth.users.email                      │ │
     * │ │ COPY (for convenience): This users.email column                 │ │
     * │ │                                                                 │ │
     * │ │ WHY COPY IT?                                                    │ │
     * │ │ - We can query users by email without joining auth schema       │ │
     * │ │ - Faster and simpler queries                                    │ │
     * │ │ - Display email in UI without extra auth lookup                 │ │
     * │ │                                                                 │ │
     * │ │ TRADEOFF: Must keep it in sync when user changes email.         │ │
     * │ │ (Usually handled by a Supabase trigger or webhook)              │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    email: text("email").notNull().unique(),

    /**
     * fullName: text("full_name")
     *
     * text("full_name")
     *   Creates a TEXT column named "full_name" in the database.
     *   Example values: "John Smith", "Jane Doe", "Kevin"
     *
     * NO .notNull() means this is NULLABLE:
     *   - The value CAN be empty (null)
     *   - Full name is OPTIONAL - users can sign up without providing one
     *   - They might add it later in their profile settings
     */
    fullName: text("full_name"),

    /**
     * avatarUrl: text("avatar_url")
     *
     * text("avatar_url")
     *   Creates a TEXT column for the user's profile picture URL.
     *   Example value: "https://cdn.example.com/avatars/user-123.jpg"
     *
     * NO .notNull() - avatar is optional:
     *   - Users can have a profile without uploading a picture
     *   - App might show initials or default avatar when this is null
     */
    avatarUrl: text("avatar_url"),

    /**
     * phone: text("phone")
     *
     * text("phone")
     *   Creates a TEXT column for the user's phone number.
     *   Example values: "+1-555-123-4567", "555-123-4567"
     *
     * NO .notNull() - phone is optional:
     *   - Some users might not want to provide phone
     *   - Used for optional SMS notifications or 2FA
     */
    phone: text("phone"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ preferences: jsonb("preferences").$type<UserPreferences>().default({})
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ jsonb("preferences")                                                │
     * │   Creates a JSONB column named "preferences".                       │
     * │   (See orgs.ts settings column for full explanation of JSONB)       │
     * │                                                                     │
     * │   Example value:                                                    │
     * │   {                                                                 │
     * │     "theme": "dark",                                                │
     * │     "notifications": {                                              │
     * │       "email": true,                                                │
     * │       "inApp": true,                                                │
     * │       "taskReminders": true                                         │
     * │     },                                                              │
     * │     "dashboard": {                                                  │
     * │       "defaultView": "grid",                                        │
     * │       "widgetLayout": ["calendar", "tasks", "clients"]              │
     * │     }                                                               │
     * │   }                                                                 │
     * │                                                                     │
     * │ .$type<UserPreferences>()                                           │
     * │   Tells TypeScript what SHAPE the JSON should have.                 │
     * │   UserPreferences is defined below - it's a TypeScript interface.   │
     * │   This gives us autocomplete and type checking!                     │
     * │                                                                     │
     * │   EXAMPLE - TypeScript will catch errors:                           │
     * │     const prefs: UserPreferences = {                                │
     * │       theme: "purple"  // ← ERROR! Must be "light" | "dark" | "system"
     * │     };                                                              │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no preferences provided, use an empty object {}.               │
     * │   New users start with default preferences.                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    preferences: jsonb("preferences").$type<UserPreferences>().default({}),

    /**
     * createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
     *
     * (See orgs.ts for full explanation of timestamp columns)
     *
     * timestamp("created_at", { withTimezone: true })
     *   Stores when the user account was created.
     *   { withTimezone: true } = Also stores timezone info (important for global apps)
     *   Example value: "2024-01-15T10:30:45-05:00"
     *
     * .notNull()
     *   Every user must have a creation timestamp.
     *
     * .defaultNow()
     *   If not provided, use the current time when the row is inserted.
     *   The database handles this automatically.
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
     *
     * (See orgs.ts for full explanation of $onUpdate)
     *
     * Same as createdAt, plus:
     *
     * .$onUpdate(() => new Date())
     *   AUTOMATICALLY updates this timestamp whenever the row is modified.
     *   Useful for tracking when user last updated their profile.
     *
     *   EXAMPLE:
     *     1. User created at 3:00 PM → updated_at: 3:00 PM
     *     2. User changes their name at 5:00 PM → updated_at: 5:00 PM
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
   * This function returns an array of INDEXES for faster queries.
   * (See orgs.ts for full explanation of what indexes are and why we need them)
   *
   * QUICK REFRESHER:
   *   - Index = like the index at the back of a book
   *   - Makes finding specific rows MUCH faster
   *   - Tradeoff: Slightly slower writes (INSERT/UPDATE)
   *   - Only add indexes for columns you frequently search/filter by
   */
  (table) => [
    /**
     * index("users_email_idx").on(table.email)
     *
     * Creates an index named "users_email_idx" on the email column.
     *
     * WHY: We frequently look up users by email.
     *      "Find the user with email john@example.com"
     *      SELECT * FROM users WHERE email = 'john@example.com'
     *
     * Without index: Database scans EVERY row looking for that email
     * With index: Database finds it instantly via the lookup table
     *
     * NAMING CONVENTION: tablename_columnname_idx
     */
    index("users_email_idx").on(table.email),

    /**
     * index("users_created_at_idx").on(table.createdAt)
     *
     * Creates an index on the created_at column.
     *
     * WHY: For queries that order users by join date or filter by date range.
     *      "Show me users who joined last month"
     *      "List all users, newest first"
     *      SELECT * FROM users ORDER BY created_at DESC
     */
    index("users_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * UserPreferences interface
 *
 * This defines the SHAPE of the JSON stored in the "preferences" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 * A user might have theme set but not notifications, or vice versa.
 */
export interface UserPreferences {
  /**
   * theme?: "light" | "dark" | "system"
   *
   * The UI color theme preference.
   *   - "light" = White/light background
   *   - "dark" = Dark/black background
   *   - "system" = Follow the operating system's setting
   *
   * The "?" means this is optional - might not be set.
   * The | means "one of these values" (TypeScript union type).
   */
  theme?: "light" | "dark" | "system";

  /**
   * notifications?: { ... }
   *
   * Nested object for notification preferences.
   * Each sub-property is also optional.
   */
  notifications?: {
    email?: boolean; // Receive email notifications?
    inApp?: boolean; // Show in-app notification badges?
    taskReminders?: boolean; // Remind about upcoming tasks?
    documentAlerts?: boolean; // Alert when documents need attention?
  };

  /**
   * dashboard?: { ... }
   *
   * Nested object for dashboard customization.
   */
  dashboard?: {
    defaultView?: string; // Which view to show by default ("grid", "list", etc.)
    widgetLayout?: string[]; // Order of dashboard widgets ["calendar", "tasks", ...]
  };
}

// ============================================================================
// RELATIONS DEFINITION
// ============================================================================

/**
 * User Relations (INDEPENDENT ROOT - Not Owned by Anyone)
 *
 * Kevin, users are INDEPENDENT - they don't "belong to" any other table.
 * Instead, other tables belong to THEM. Users only have many() relations.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ USERS RELATIONSHIP OVERVIEW                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ A user is at the TOP of their relationship hierarchy.                  │
 * │ They don't "belong to" any other table - other tables belong to THEM.  │
 * │                                                                        │
 * │                     ┌──────────┐                                       │
 * │                     │  users   │ ◄── YOU ARE HERE                      │
 * │                     └────┬─────┘                                       │
 * │                          │                                             │
 * │          ┌───────────────┼───────────────┬──────────────┐              │
 * │          │               │               │              │              │
 * │          ▼               ▼               ▼              ▼              │
 * │   ┌────────────┐  ┌────────────┐  ┌──────────────┐ ┌────────────┐      │
 * │   │ orgMembers │  │   tasks    │  │notifications │ │ledgerEvents│      │
 * │   │  (many)    │  │  (many)    │  │   (many)     │ │  (many)    │      │
 * │   └────────────┘  └────────────┘  └──────────────┘ └────────────┘      │
 * │                                                                        │
 * │ All relationships from users are MANY (one user has many of each)      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY USERS ≠ ORGS:
 *   - Orgs own data (clients, docs, tasks, etc.)
 *   - Users ACCESS data through org_members (the junction table)
 *   - A user can be in MULTIPLE orgs with DIFFERENT roles
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER:                                                      │
 *   │                                                                     │
 *   │ SELECT * FROM org_members WHERE user_id = user.id                   │
 *   │   ▲      ▲   ▲             ▲      ▲                                 │
 *   │   │      │   │             │      └─ "match this user's id"         │
 *   │   │      │   │             └─ "only rows WHERE this is true"        │
 *   │   │      │   └─ "look in the org_members table"                     │
 *   │   │      └─ "give me ALL columns" (* = everything)                  │
 *   │   └─ "fetch data from the database"                                 │
 *   │                                                                     │
 *   │ In plain English: "Go to the org_members table. Find ALL rows       │
 *   │ whose user_id matches this user's id. Give me everything."          │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each user:
 *     user.orgMemberships     → "Find ALL orgs this user belongs to"
 *                               SELECT * FROM org_members WHERE user_id = user.id
 *     user.assignedTasks      → "Find ALL tasks assigned to this user"
 *                               SELECT * FROM tasks WHERE assigned_to = user.id
 *     user.notifications      → "Find ALL notifications for this user"
 *                               SELECT * FROM notifications WHERE user_id = user.id
 *     user.ledgerEventsAsActor → "Find ALL audit events this user performed"
 *                                SELECT * FROM ledger_events WHERE actor_user_id = user.id
 *
 * QUERY EXAMPLE - Get a user with all their org memberships:
 *   const user = await db.query.users.findFirst({
 *     where: eq(users.id, userId),
 *     with: {
 *       orgMemberships: {        // MANY - all orgs this user is in
 *         with: {
 *           org: true,           // Include the org details for each membership
 *         },
 *       },
 *     },
 *   });
 *   // user.fullName = "Kevin"
 *   // user.orgMemberships[0].role = "admin"
 *   // user.orgMemberships[0].org.name = "Acme Wealth"
 *
 * QUERY EXAMPLE - Get unread notification count for a user:
 *   const user = await db.query.users.findFirst({
 *     where: eq(users.id, userId),
 *     with: {
 *       notifications: {
 *         where: isNull(notifications.readAt),  // only unread
 *       },
 *     },
 *   });
 *   // user.notifications.length = 5 (five unread)
 */
export const usersRelations = relations(users, ({ many }) => ({
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ orgMemberships: many(orgMembers)                                    │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ MANY RELATIONSHIP EXPLAINED:                                        │
   * │                                                                     │
   * │ many() means "This table has MANY of that table"                    │
   * │ (See clients.ts for full explanation of many())                     │
   * │                                                                     │
   * │ In plain English: "A user can be a member of MANY organizations"    │
   * │                                                                     │
   * │ EXAMPLE SCENARIO:                                                   │
   * │   Kevin is a consultant who works with multiple wealth firms:       │
   * │   - Member of "Acme Wealth" (role: admin)                           │
   * │   - Member of "Best Financial" (role: assistant)                    │
   * │   - Member of "Smith Advisory" (role: assistant)                    │
   * │                                                                     │
   * │ VISUAL:                                                             │
   * │   users                          org_members                        │
   * │   ┌─────────────┐               ┌─────────────────────┐             │
   * │   │ id (PK)     │───────────────│ user_id (FK)        │             │
   * │   │ "kevin-123" │               │ "kevin-123"         │ → Acme      │
   * │   │             │               │ "kevin-123"         │ → Best      │
   * │   │             │               │ "kevin-123"         │ → Smith     │
   * │   └─────────────┘               └─────────────────────┘             │
   * │                                                                     │
   * │ The FK (user_id) is on org_members table, pointing back to users.id │
   * │ Drizzle uses that to figure out the connection.                     │
   * │                                                                     │
   * │ USAGE IN CODE:                                                      │
   * │   const user = await db.query.users.findFirst({                     │
   * │     where: eq(users.id, userId),                                    │
   * │     with: { orgMemberships: true }  // ← Include all memberships    │
   * │   });                                                               │
   * │   console.log(user.orgMemberships);                                 │
   * │   // [{ orgId: "acme-id", role: "admin" }, { orgId: "best-id", ... }]│
   * └─────────────────────────────────────────────────────────────────────┘
   */
  orgMemberships: many(orgMembers),

  /**
   * assignedTasks: many(tasks)
   *
   * "A user can have MANY tasks assigned to them"
   *
   * When someone creates a task and assigns it to Kevin,
   * that task has Kevin's user_id in its assignee column.
   * This relationship lets us query "all tasks assigned to Kevin".
   *
   * USAGE:
   *   const user = await db.query.users.findFirst({
   *     with: { assignedTasks: true }
   *   });
   *   // user.assignedTasks = [{ title: "Review docs" }, { title: "Call client" }]
   */
  assignedTasks: many(tasks),

  /**
   * notifications: many(notifications)
   *
   * "A user can have MANY notifications"
   *
   * Notifications like "You have a new task" or "Document uploaded"
   * are stored in the notifications table with the user's id.
   *
   * USAGE:
   *   const user = await db.query.users.findFirst({
   *     with: { notifications: true }
   *   });
   *   // user.notifications = [{ message: "New task assigned" }, ...]
   */
  notifications: many(notifications),

  /**
   * ledgerEventsAsActor: many(ledgerEvents)
   *
   * "A user can create MANY ledger events (audit trail entries)"
   *
   * Ledger events are an audit trail - they record WHO did WHAT and WHEN.
   * When Kevin uploads a document, a ledger event is created:
   *   { actor_id: "kevin-123", action: "document.uploaded", ... }
   *
   * "AsActor" in the name clarifies that the user is the one who
   * PERFORMED the action (the actor), not the target of the action.
   *
   * USAGE:
   *   const user = await db.query.users.findFirst({
   *     with: { ledgerEventsAsActor: true }
   *   });
   *   // user.ledgerEventsAsActor = [{ action: "document.uploaded" }, ...]
   */
  ledgerEventsAsActor: many(ledgerEvents),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type User = typeof users.$inferSelect
 *
 * Creates a TypeScript type representing a USER ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 * (See orgs.ts for full explanation of $inferSelect)
 *
 * USAGE:
 *   const user: User = await db.query.users.findFirst();
 *   user.email      // TypeScript knows this is string
 *   user.fullName   // TypeScript knows this is string | null
 *   user.preferences // TypeScript knows this is UserPreferences
 */
export type User = typeof users.$inferSelect;

/**
 * export type NewUser = typeof users.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new user.
 * Some fields are optional (have defaults), so this type reflects that.
 * (See orgs.ts for full explanation of $inferInsert)
 *
 * USAGE:
 *   const newUser: NewUser = {
 *     id: "abc-123",             // Required (from Supabase auth)
 *     email: "john@example.com", // Required
 *     // fullName, phone, etc. are optional
 *     // createdAt, updatedAt have defaults
 *   };
 *   await db.insert(users).values(newUser);
 */
export type NewUser = typeof users.$inferInsert;
