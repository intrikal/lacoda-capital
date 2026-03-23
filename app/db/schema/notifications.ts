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
 *       For notifications, we need to say "a notification belongs to ONE user
 *       and ONE org." Without relations, we'd have to write manual SQL joins.
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * (See clients.ts for full explanation of the relations function)
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
 *               (See orgs.ts for full explanation)
 *
 *   uuid      = Column type for UUIDs (Universally Unique Identifier)
 *               A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *               We use UUIDs for every id and foreign key column.
 *               (See orgs.ts for full explanation of why we use UUIDs)
 *
 *   text      = Column type for text/strings (like "New task assigned" or a message body)
 *               Can hold any length of text.
 *               (See orgs.ts for full explanation)
 *
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *               We use { withTimezone: true } to track the timezone too.
 *               ESPECIALLY important in notifications for the read_at column.
 *               (See orgs.ts for full explanation of timestamps)
 *
 *   jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format)
 *               Allows storing flexible, structured data like:
 *               { "href": "/tasks/abc", "taskTitle": "Review contract" }
 *               The "b" in jsonb means "binary" - it's stored efficiently.
 *               (See orgs.ts for full explanation of JSONB)
 *
 *   index     = Function to create database indexes (makes queries faster)
 *               Notifications get queried A LOT (every page load checks for unread),
 *               so indexes are critical here.
 *               (See clients.ts for full explanation of indexes)
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
 * import { notificationTypeEnum } from "./00_enums"
 *
 * WHAT: Imports the notification_type PostgreSQL enum from the enums file.
 * WHY:  An ENUM is a column type that only allows specific values.
 *       Think of it like a dropdown menu - you can ONLY pick from the list.
 *
 *       The notificationTypeEnum allows these values:
 *         "task_assigned"      → Someone assigned a task to this user
 *         "task_due"           → A task deadline is approaching
 *         "document_uploaded"  → A new document was uploaded
 *         "document_expiring"  → A document is about to expire
 *         "document_requested" → A document has been requested from a client
 *         "report_ready"       → A generated report is ready to view
 *         "compliance_alert"   → Something needs compliance attention
 *         "system"             → General system-level notification
 *
 *       If you try to insert a notification with type = "banana":
 *         → DATABASE ERROR: "invalid input value for enum notification_type"
 *
 *       WHY USE AN ENUM INSTEAD OF PLAIN TEXT?
 *         - Database ENFORCES the values (can't have typos like "taks_assigned")
 *         - Queries are faster (enum values are stored as integers internally)
 *         - Self-documenting: You can always check what types are allowed
 *
 * WHERE: "./00_enums" is the centralized enums file (app/db/schema/00_enums.ts).
 *        The "00_" prefix ensures it's loaded first (alphabetical order matters).
 *        (See 00_enums.ts for the full list of all enums in the system)
 */
import { notificationTypeEnum } from "./00_enums";

/**
 * import { users } from "./users"
 *
 * WHAT: Imports the users table definition from the users.ts file.
 * WHY:  We need to reference users.id to create a Foreign Key relationship.
 *       Every notification is sent TO a specific user, so we need to say
 *       "this notification's user_id must point to a real user."
 * WHERE: "./" means "same directory", so this imports from app/db/schema/users.ts
 */
import { users } from "./users";

/**
 * import { orgs } from "./orgs"
 *
 * WHAT: Imports the orgs table definition from the orgs.ts file.
 * WHY:  We need to reference orgs.id to create a Foreign Key relationship.
 *       Every notification belongs to an org context (multi-tenant isolation).
 *       This means a user who belongs to multiple orgs will have SEPARATE
 *       notification feeds per org.
 * WHERE: "./" means "same directory", so this imports from app/db/schema/orgs.ts
 *
 * (See clients.ts for full explanation of why we import parent tables for FKs)
 */
import { orgs } from "./orgs";

/**
 * ============================================================================
 * NOTIFICATIONS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this is the NOTIFICATIONS table - it stores in-app notifications
 * for users. Think of it like the notification bell you see on websites
 * (the little bell icon with a red badge showing "3 unread").
 *
 * WHAT THIS TABLE STORES:
 *   Each row is ONE notification for ONE user. Examples:
 *     - "You were assigned a new task: Review Smith Trust documents"
 *     - "Document 'Passport.pdf' will expire in 7 days"
 *     - "Quarterly report is ready to download"
 *     - "Compliance review needed for Doe Family Trust"
 *
 * NOTIFICATION TYPES (from the enum):
 *   ┌──────────────────────┬────────────────────────────────────────────┐
 *   │ Type                 │ When it's created                          │
 *   ├──────────────────────┼────────────────────────────────────────────┤
 *   │ task_assigned        │ Someone assigns a task to this user        │
 *   │ task_due             │ A task's deadline is approaching           │
 *   │ document_uploaded    │ A new document was uploaded for review     │
 *   │ document_expiring    │ A document is about to expire              │
 *   │ document_requested   │ A document has been requested from client  │
 *   │ report_ready         │ A generated report is ready to view        │
 *   │ compliance_alert     │ Something needs compliance attention       │
 *   │ system               │ General system messages (maintenance, etc.)│
 *   └──────────────────────┴────────────────────────────────────────────┘
 *
 * THE "READ" PATTERN:
 *   Notifications use a clever pattern for tracking read/unread status:
 *     - read_at = NULL  → The notification is UNREAD
 *     - read_at = timestamp → The notification was READ at that time
 *   This is explained in detail on the readAt column below.
 *
 * WHY NO updated_at COLUMN?
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ Most tables have both created_at and updated_at. But notifications  │
 *   │ only have created_at. WHY?                                          │
 *   │                                                                     │
 *   │ Because notifications are IMMUTABLE once created.                   │
 *   │ You never "edit" a notification's title or message after sending.   │
 *   │                                                                     │
 *   │ The ONLY change is marking it as "read" (setting read_at),          │
 *   │ and read_at is its own dedicated column, not a general "updated_at".│
 *   │                                                                     │
 *   │ Think of it like a letter in the mail:                              │
 *   │   - Once the letter is written and sent, you don't change it.       │
 *   │   - You just mark it as "opened" when you read it.                  │
 *   │   - There's no reason to track "when was this letter last edited?"  │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * CLEANUP STRATEGY:
 *   Notifications can pile up fast! Consider these strategies:
 *   - Archive (or delete) notifications older than 90 days
 *   - Implement a retention policy per org (some orgs may want longer history)
 *   - Keep UNREAD notifications indefinitely (don't delete what they haven't seen)
 *   - Run a scheduled job (cron) to clean up old read notifications
 *
 * REAL-WORLD FLOW:
 *   1. Admin assigns a task to Kevin
 *   2. System creates a notification:
 *        { userId: "kevin-123", orgId: "acme-456", type: "task_assigned",
 *          title: "New task assigned", message: "Review Smith Trust docs",
 *          payload: { taskId: "task-789", href: "/tasks/task-789" } }
 *   3. Kevin loads the app → app queries unread notifications
 *        SELECT * FROM notifications WHERE user_id = 'kevin-123' AND read_at IS NULL
 *   4. Kevin sees the bell icon with a badge showing "1"
 *   5. Kevin clicks the notification → app sets read_at to NOW
 *        UPDATE notifications SET read_at = NOW() WHERE id = 'notif-abc'
 *   6. Badge count goes to 0
 */

/**
 * export const notifications = pgTable(...)
 *
 * BREAKDOWN:
 *   export   = Makes this available for other files to import
 *              Other files can do: import { notifications } from "./notifications"
 *
 *   const    = Declares a constant (value that won't change)
 *
 *   notifications = The name we give this table in our TypeScript code
 *                   We'll use it like: db.query.notifications.findMany()
 *
 *   pgTable  = The function that creates a PostgreSQL table
 *              (See orgs.ts for full explanation)
 *
 * pgTable takes 3 arguments:
 *   1. "notifications" = The actual table name in the database
 *   2. { columns }     = An object defining all the columns
 *   3. (table) => []   = A function that returns an array of indexes
 */
export const notifications = pgTable(
  "notifications", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is the PRIMARY KEY (PK) column.                                │
     * │ (See clients.ts for full explanation of Primary Keys)               │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In code, we use: notifications.id   │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   Example value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"            │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each notification row.       │
     * │   - UNIQUE: No two notifications can have the same id               │
     * │   - NOT NULL: Every notification MUST have an id                    │
     * │   - IMMUTABLE: Should never change once set                         │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID when a new notification     │
     * │   is created. You don't have to make up an ID yourself.             │
     * │   (See orgs.ts for full explanation of .defaultRandom())            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ userId: uuid("user_id").notNull().references(() => users.id, {...}) │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) - it points to the users table.         │
     * │ It answers the question: "WHO should see this notification?"        │
     * │                                                                     │
     * │ userId:                                                             │
     * │   TypeScript property name. We use notifications.userId in code.    │
     * │   Note: camelCase in TypeScript (userId), but snake_case in the     │
     * │   database (user_id). Drizzle handles this mapping automatically.   │
     * │                                                                     │
     * │ uuid("user_id")                                                     │
     * │   Creates a column named "user_id" in the database.                 │
     * │   It stores a UUID that matches a user's id.                        │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every notification MUST have a target user. You can't create      │
     * │   a notification that nobody should see.                            │
     * │   (See clients.ts orgId column for full explanation of .notNull())  │
     * │                                                                     │
     * │ .references(() => users.id, { onDelete: "cascade" })                │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ FOREIGN KEY TO USERS:                                       │   │
     * │   │                                                             │   │
     * │   │ "This column's value must exist in users.id"                │   │
     * │   │                                                             │   │
     * │   │ VISUAL:                                                     │   │
     * │   │   users table            notifications table                │   │
     * │   │   ┌────────────┐         ┌────────────────────┐             │   │
     * │   │   │ id (PK)    │◄────────│ user_id (FK)       │             │   │
     * │   │   │ "kevin-123"│         │ "kevin-123"        │             │   │
     * │   │   │ "jane-456" │         │ "kevin-123"        │             │   │
     * │   │   └────────────┘         │ "jane-456"         │             │   │
     * │   │        ▲                 └────────────────────┘             │   │
     * │   │        │                                                    │   │
     * │   │   Kevin has 2 notifications, Jane has 1                     │   │
     * │   │                                                             │   │
     * │   │ { onDelete: "cascade" }                                     │   │
     * │   │   If a user is deleted, ALL their notifications are deleted  │   │
     * │   │   too. No point keeping notifications for a user who no     │   │
     * │   │   longer exists.                                            │   │
     * │   │   (See clients.ts orgId column for full explanation          │   │
     * │   │    of onDelete options: cascade, set null, restrict)        │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ orgId: uuid("org_id").notNull().references(() => orgs.id, {...})    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This is a FOREIGN KEY (FK) to the orgs table.                      │
     * │ It answers the question: "WHICH ORG is this notification about?"   │
     * │                                                                     │
     * │ WHY DO NOTIFICATIONS NEED AN ORG?                                   │
     * │   This app is MULTI-TENANT - one user can belong to multiple orgs.  │
     * │   Kevin might be an admin at "Acme Wealth" AND an assistant at      │
     * │   "Best Financial". Each org has its own clients, tasks, docs, etc. │
     * │                                                                     │
     * │   When Kevin gets a notification "New task assigned", it needs to   │
     * │   specify WHICH ORG the task is in. Otherwise Kevin wouldn't know   │
     * │   if the task is for Acme or Best Financial.                        │
     * │                                                                     │
     * │   org_id provides this context, and also lets us:                   │
     * │   - Show notifications filtered by current org                      │
     * │   - Ensure notifications respect org boundaries                     │
     * │   - Let admins view all notifications in their org                  │
     * │                                                                     │
     * │ VISUAL:                                                             │
     * │   orgs table              notifications table                       │
     * │   ┌────────────┐          ┌────────────────────┐                    │
     * │   │ id (PK)    │◄─────────│ org_id (FK)        │                    │
     * │   │ "acme-456" │          │ "acme-456"         │                    │
     * │   │ "best-789" │          │ "acme-456"         │                    │
     * │   └────────────┘          │ "best-789"         │                    │
     * │                           └────────────────────┘                    │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every notification MUST belong to an org. No "org-less" alerts.   │
     * │                                                                     │
     * │ { onDelete: "cascade" }                                             │
     * │   If an org is deleted, ALL its notifications are deleted too.       │
     * │   (See clients.ts orgId column for full explanation of cascade)     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ type: notificationTypeEnum("type").notNull()                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ This column categorizes the notification using a PostgreSQL ENUM.   │
     * │                                                                     │
     * │ notificationTypeEnum("type")                                        │
     * │   Creates a column named "type" that can ONLY hold one of these:    │
     * │     "task_assigned"      → A task was assigned to this user          │
     * │     "task_due"           → A task deadline is approaching            │
     * │     "document_uploaded"  → A document was uploaded                   │
     * │     "document_expiring"  → A document is about to expire            │
     * │     "document_requested" → A document was requested from a client   │
     * │     "report_ready"       → A generated report is ready              │
     * │     "compliance_alert"   → Compliance issue needs attention          │
     * │     "system"             → General system message                    │
     * │                                                                     │
     * │ WHY WE NEED TYPE:                                                   │
     * │   1. FILTERING: "Show me only task notifications"                   │
     * │      SELECT * FROM notifications WHERE type = 'task_assigned'       │
     * │                                                                     │
     * │   2. ICONS: The frontend uses type to show the right icon:          │
     * │      "task_assigned" → clipboard icon                               │
     * │      "document_expiring" → warning icon                             │
     * │      "report_ready" → chart icon                                    │
     * │                                                                     │
     * │   3. GROUPING: Group notifications by type in the UI                │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every notification MUST have a type. We need to know what kind    │
     * │   of notification it is so the UI can render it properly.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    type: notificationTypeEnum("type").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ title: text("title").notNull()                                      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The notification's headline - the bold text users see first.        │
     * │                                                                     │
     * │ text("title")                                                       │
     * │   Creates a TEXT column named "title" in the database.              │
     * │   Example values:                                                   │
     * │     "New task assigned"                                             │
     * │     "Document expiring soon"                                        │
     * │     "Quarterly report ready"                                        │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every notification MUST have a title. A notification without a    │
     * │   title would be meaningless - the user wouldn't know what it's     │
     * │   about. Think of it like an email subject line: always required.   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    title: text("title").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ message: text("message")                                            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The notification's body text - additional detail beyond the title.  │
     * │                                                                     │
     * │ text("message")                                                     │
     * │   Creates a TEXT column named "message" in the database.            │
     * │   Example values:                                                   │
     * │     "Review Smith Trust documents by Friday"                        │
     * │     "Passport.pdf expires on 2024-03-15. Request a new copy."       │
     * │     null (no extra detail needed)                                   │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The message CAN be empty (null)                                 │
     * │   - Some notifications only need a title, no extra detail           │
     * │   - For example, "Report ready" might not need a body because       │
     * │     clicking it takes you straight to the report                    │
     * │                                                                     │
     * │ TITLE vs MESSAGE:                                                   │
     * │   title   = "Document expiring soon"     (always shown, bold)       │
     * │   message = "Passport.pdf expires Mar 15" (optional detail, smaller)│
     * │                                                                     │
     * │   Like an email:                                                    │
     * │     title   = Subject line                                          │
     * │     message = Preview text / first line of body                     │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    message: text("message"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ readAt: timestamp("read_at", { withTimezone: true })                │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ THE READ/UNREAD PATTERN - This is one of the most elegant patterns │
     * │ in database design. Pay close attention, Kevin!                     │
     * │                                                                     │
     * │ timestamp("read_at", { withTimezone: true })                        │
     * │   Creates a TIMESTAMP column named "read_at".                       │
     * │   { withTimezone: true } = includes timezone info                   │
     * │                                                                     │
     * │ NO .notNull() - THIS IS INTENTIONAL AND CRITICAL:                   │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ THE NULL = UNREAD PATTERN:                                   │   │
     * │   │                                                             │   │
     * │   │ Instead of having a separate boolean "is_read" column       │   │
     * │   │ (true/false), we use NULL to mean "not yet read":           │   │
     * │   │                                                             │   │
     * │   │   read_at = NULL                                            │   │
     * │   │     → The user has NOT read this notification yet (UNREAD)  │   │
     * │   │     → This is the DEFAULT when a notification is created    │   │
     * │   │                                                             │   │
     * │   │   read_at = "2024-01-15T10:30:00+05:00"                     │   │
     * │   │     → The user READ this notification at that exact time    │   │
     * │   │                                                             │   │
     * │   │ WHY IS THIS BETTER THAN A BOOLEAN is_read?                  │   │
     * │   │   boolean: is_read = true    → "It was read... but when?"   │   │
     * │   │   timestamp: read_at = 10:30 → "It was read at 10:30 AM!"  │   │
     * │   │                                                             │   │
     * │   │   The timestamp gives you MORE information:                 │   │
     * │   │   - Was it read? YES (read_at is not null)                  │   │
     * │   │   - When was it read? At 10:30 AM                           │   │
     * │   │   - How long before they read it? created_at vs read_at     │   │
     * │   │                                                             │   │
     * │   │ ┌─────────────────────────────────────────────────────────┐ │   │
     * │   │ │ SQL: IS NULL and IS NOT NULL                            │ │   │
     * │   │ │                                                         │ │   │
     * │   │ │ In SQL, you can't use = to check for NULL.              │ │   │
     * │   │ │ NULL is special - it means "no value" or "unknown".     │ │   │
     * │   │ │                                                         │ │   │
     * │   │ │ WRONG:  WHERE read_at = NULL     ← NEVER WORKS!        │ │   │
     * │   │ │ RIGHT:  WHERE read_at IS NULL    ← Finds unread        │ │   │
     * │   │ │ RIGHT:  WHERE read_at IS NOT NULL ← Finds read ones    │ │   │
     * │   │ │                                                         │ │   │
     * │   │ │ WHY? Because NULL is not a "value" - it's the ABSENCE  │ │   │
     * │   │ │ of a value. You can't compare something to nothing      │ │   │
     * │   │ │ using equals. SQL has special syntax (IS NULL) for this.│ │   │
     * │   │ │                                                         │ │   │
     * │   │ │ In Drizzle ORM, the equivalent is:                      │ │   │
     * │   │ │   isNull(notifications.readAt)    → unread              │ │   │
     * │   │ │   isNotNull(notifications.readAt) → read                │ │   │
     * │   │ └─────────────────────────────────────────────────────────┘ │   │
     * │   │                                                             │   │
     * │   │ EXAMPLE - Counting unread notifications (for the badge):    │   │
     * │   │   SELECT COUNT(*) FROM notifications                        │   │
     * │   │     WHERE user_id = 'kevin-123'                             │   │
     * │   │       AND read_at IS NULL                                   │   │
     * │   │   → Result: 3 (Kevin has 3 unread notifications)            │   │
     * │   │                                                             │   │
     * │   │ EXAMPLE - Marking a notification as read:                   │   │
     * │   │   UPDATE notifications                                      │   │
     * │   │     SET read_at = NOW()                                     │   │
     * │   │     WHERE id = 'notif-abc'                                  │   │
     * │   │   → read_at changes from NULL to "2024-01-15T10:30:00"      │   │
     * │   │                                                             │   │
     * │   │ EXAMPLE - "Mark all as read" button:                        │   │
     * │   │   UPDATE notifications                                      │   │
     * │   │     SET read_at = NOW()                                     │   │
     * │   │     WHERE user_id = 'kevin-123'                             │   │
     * │   │       AND read_at IS NULL                                   │   │
     * │   │   → Sets read_at for ALL of Kevin's unread notifications    │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    readAt: timestamp("read_at", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ link: text("link")                                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHAT: A relative URL path to navigate to when the notification is   │
     * │       clicked.                                                      │
     * │ WHY:  Clicking a notification should take you to the relevant page. │
     * │       "Document expiring" → /vault/doc-456                          │
     * │       "Task assigned"     → /tasks/task-789                         │
     * │                                                                     │
     * │ NULLABLE — some notifications are informational with no destination.│
     * │                                                                     │
     * │ Example values:                                                     │
     * │   "/vault/d4e5f6a7-b8c9-1234-5678-abcdef012345"                    │
     * │   "/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890"                    │
     * │   "/compliance/controls/550e8400-e29b-41d4-a716-446655440000"       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    link: text("link"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ payload: jsonb("payload").$type<NotificationPayload>().default({}) │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A flexible JSONB column for type-specific data about this          │
     * │ notification. Different notification types need different data.     │
     * │                                                                     │
     * │ jsonb("payload")                                                    │
     * │   Creates a JSONB column named "payload".                           │
     * │   JSONB stores structured JSON data efficiently.                    │
     * │   (See clients.ts profile column for full explanation of JSONB)    │
     * │                                                                     │
     * │ WHY USE JSONB INSTEAD OF MORE COLUMNS?                              │
     * │   Different notification types need different data:                 │
     * │                                                                     │
     * │   task_assigned notification:                                       │
     * │     { "taskId": "task-789", "taskTitle": "Review docs",            │
     * │       "dueDate": "2024-03-15", "href": "/tasks/task-789" }         │
     * │                                                                     │
     * │   document_expiring notification:                                   │
     * │     { "documentId": "doc-456", "documentName": "Passport.pdf",     │
     * │       "expiresAt": "2024-03-15", "href": "/documents/doc-456" }    │
     * │                                                                     │
     * │   If we made separate columns for taskId, documentId, etc.,         │
     * │   most would be NULL for any given notification type. JSONB lets    │
     * │   us store only what's relevant.                                    │
     * │                                                                     │
     * │ .$type<NotificationPayload>()                                       │
     * │   Tells TypeScript what shape the JSON should have.                 │
     * │   NotificationPayload is defined below - it's a TypeScript          │
     * │   interface. This gives us autocomplete and type checking!          │
     * │   (See clients.ts profile column for explanation of .$type<>())    │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no payload is provided, use an empty object {}.                │
     * │   Some simple notifications (like "system" type) might not need     │
     * │   any extra data beyond the title and message.                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    payload: jsonb("payload").$type<NotificationPayload>().default({}),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", {...}).notNull().defaultNow()     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this notification was created/sent.                     │
     * │ (See clients.ts for full explanation of timestamp columns)          │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Stores the exact date and time the notification was created.      │
     * │   { withTimezone: true } = Also stores timezone info.               │
     * │   Example value: "2024-01-15T10:30:45-05:00"                       │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every notification MUST have a creation timestamp.                │
     * │   We need to know WHEN it was sent to sort by "most recent".        │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   If not provided, use the current time when the row is inserted.   │
     * │   The database handles this automatically.                          │
     * │                                                                     │
     * │ NOTE: There is NO updatedAt column here!                            │
     * │   Unlike clients.ts or users.ts which have both createdAt AND       │
     * │   updatedAt, notifications only have createdAt.                     │
     * │                                                                     │
     * │   WHY? Notifications are WRITE-ONCE. Once created, their content    │
     * │   never changes. The only mutation is setting read_at, which has    │
     * │   its own dedicated column. There's nothing to "update", so         │
     * │   there's no need to track "when was this last updated".            │
     * │                                                                     │
     * │   Compare to clients.ts where you might update a client's email,   │
     * │   phone, profile, etc. - that's why clients NEED updatedAt.        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

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
   * This function returns an array of INDEXES for faster queries.
   * (See clients.ts for full explanation of what indexes are and why we need them)
   *
   * QUICK REFRESHER:
   *   - Index = like the index at the back of a book
   *   - Makes finding specific rows MUCH faster
   *   - Tradeoff: Slightly slower writes (INSERT/UPDATE must update the index)
   *   - Only add indexes for columns you frequently search/filter by
   *
   * NOTIFICATIONS ARE QUERIED CONSTANTLY:
   *   Every time a user loads ANY page, the app checks for unread notifications
   *   to update the bell icon badge. That's potentially thousands of queries
   *   per minute across all users. Without indexes, the database would have to
   *   scan EVERY notification row to answer "does Kevin have unread notifications?"
   *   With indexes, it's practically instant.
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("notifications_user_id_idx").on(table.userId)                 │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index named "notifications_user_id_idx" on user_id.      │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Get ALL notifications for a specific user"                       │
     * │   SELECT * FROM notifications WHERE user_id = 'kevin-123'           │
     * │                                                                     │
     * │ WHY: This is the MOST COMMON query - every page load fetches        │
     * │ the current user's notifications. Without this index, the database  │
     * │ would scan every notification in the entire system just to find     │
     * │ Kevin's. With millions of notifications across all users, that      │
     * │ would be extremely slow.                                            │
     * │                                                                     │
     * │ NAMING CONVENTION: tablename_columnname_idx                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("notifications_user_id_idx").on(table.userId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("notifications_user_unread_idx").on(table.userId, table.readAt)│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on TWO columns: user_id AND read_at.              │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Get UNREAD notifications for a specific user"                    │
     * │   SELECT * FROM notifications                                       │
     * │     WHERE user_id = 'kevin-123'                                     │
     * │       AND read_at IS NULL                                           │
     * │                                                                     │
     * │ WHY: This is arguably the MOST IMPORTANT index in this table.       │
     * │ The "unread count" query runs on EVERY page load to update the      │
     * │ notification bell badge number. It filters by BOTH user_id          │
     * │ (whose notifications?) AND read_at (only unread ones).              │
     * │                                                                     │
     * │ Without this composite index, the database would:                   │
     * │   1. Find all notifications for this user (using user_id index)     │
     * │   2. Then scan through ALL of them to check which have read_at NULL │
     * │   A user with 10,000 total notifications but only 3 unread would    │
     * │   still have to scan all 10,000.                                    │
     * │                                                                     │
     * │ With this composite index, the database can jump directly to        │
     * │ "user_id = kevin AND read_at = NULL" in one efficient lookup.       │
     * │                                                                     │
     * │ ┌─────────────────────────────────────────────────────────────────┐ │
     * │ │ HOW COMPOSITE INDEXES WORK WITH NULL:                           │ │
     * │ │                                                                 │ │
     * │ │ Kevin, you might wonder: "Can an index work with NULL values?"  │ │
     * │ │ YES! PostgreSQL indexes include NULL values by default.         │ │
     * │ │                                                                 │ │
     * │ │ The index entries look conceptually like:                       │ │
     * │ │   ("kevin-123", NULL)         → unread notification rows        │ │
     * │ │   ("kevin-123", "2024-01-15") → read notification rows          │ │
     * │ │   ("jane-456", NULL)          → Jane's unread rows              │ │
     * │ │                                                                 │ │
     * │ │ So "WHERE user_id = X AND read_at IS NULL" can be answered      │ │
     * │ │ entirely from the index - super fast!                           │ │
     * │ └─────────────────────────────────────────────────────────────────┘ │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("notifications_user_unread_idx").on(table.userId, table.readAt),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("notifications_user_type_idx").on(table.userId, table.type)   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on user_id AND type.                              │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Get notifications for a user, filtered by type"                  │
     * │   SELECT * FROM notifications                                       │
     * │     WHERE user_id = 'kevin-123'                                     │
     * │       AND type = 'task_assigned'                                    │
     * │                                                                     │
     * │ WHY: Users might want to filter their notification list:            │
     * │   "Show me only task notifications"                                 │
     * │   "Show me only document notifications"                             │
     * │ This index makes those filtered views fast.                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("notifications_user_type_idx").on(table.userId, table.type),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("notifications_user_created_at_idx")                          │
     * │   .on(table.userId, table.createdAt)                                │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on user_id AND created_at.                        │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Get a user's notifications, sorted by most recent"               │
     * │   SELECT * FROM notifications                                       │
     * │     WHERE user_id = 'kevin-123'                                     │
     * │     ORDER BY created_at DESC                                        │
     * │                                                                     │
     * │   DESC means "descending" = newest first.                           │
     * │   (ASC = ascending = oldest first)                                  │
     * │                                                                     │
     * │ WHY: The notification dropdown always shows newest first.           │
     * │ Without this index, the database would have to find all of          │
     * │ Kevin's notifications and then SORT them by date. With this         │
     * │ index, they're already in date order - no sorting needed.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("notifications_user_created_at_idx").on(
      table.userId,
      table.createdAt
    ),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("notifications_org_id_idx").on(table.orgId)                   │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the org_id column.                              │
     * │                                                                     │
     * │ QUERY PATTERN THIS SUPPORTS:                                        │
     * │   "Get ALL notifications in a specific org" (admin view)            │
     * │   SELECT * FROM notifications WHERE org_id = 'acme-456'             │
     * │                                                                     │
     * │ WHY: An org admin might want to see all notifications across        │
     * │ all users in their org, perhaps for monitoring or debugging:        │
     * │   "Are compliance alerts being sent?"                               │
     * │   "How many notifications went out this week?"                      │
     * │   "What types of notifications are most common?"                    │
     * │                                                                     │
     * │ Also used for cleanup: "Delete all notifications in this org        │
     * │ older than 90 days."                                                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("notifications_org_id_idx").on(table.orgId),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * NotificationPayload interface
 *
 * This defines the SHAPE of the JSON stored in the "payload" column.
 * TypeScript uses this for autocomplete and error checking.
 *
 * The "?" after each property means it's OPTIONAL (can be undefined).
 * Different notification types populate different fields.
 *
 * EXAMPLE BY NOTIFICATION TYPE:
 *
 *   task_assigned:
 *     { href: "/tasks/task-789", entityType: "task", entityId: "task-789",
 *       taskId: "task-789", taskTitle: "Review Smith docs", dueDate: "2024-03-15",
 *       actorId: "admin-123", actorName: "Sarah (Admin)" }
 *
 *   document_expiring:
 *     { href: "/documents/doc-456", entityType: "document", entityId: "doc-456",
 *       documentId: "doc-456", documentName: "Passport.pdf", expiresAt: "2024-03-15",
 *       clientId: "client-789", clientName: "John Smith" }
 *
 *   report_ready:
 *     { href: "/reports/rpt-123", entityType: "report", entityId: "rpt-123",
 *       reportId: "rpt-123", reportName: "Q1 Portfolio Summary" }
 *
 *   system:
 *     { metadata: { maintenanceWindow: "2024-03-20 02:00-04:00 UTC" } }
 *     (System notifications may only need freeform metadata)
 */
export interface NotificationPayload {
  /**
   * href?: string
   *
   * The URL path to navigate to when the user clicks this notification.
   * Example: "/tasks/task-789" or "/documents/doc-456"
   *
   * The frontend uses this to make the notification clickable:
   *   <a href={notification.payload.href}>notification.title</a>
   *
   * Optional because some notifications (like "system") might not
   * have a specific page to navigate to.
   */
  href?: string;

  /**
   * entityType?: string
   *
   * What KIND of thing this notification is about.
   * Example values: "task", "document", "client", "report"
   *
   * Used by the frontend to decide which icon to show or which
   * detail component to render.
   */
  entityType?: string;

  /**
   * entityId?: string
   *
   * The UUID of the entity this notification is about.
   * Combined with entityType, you can look up the full record:
   *   entityType: "task", entityId: "task-789"
   *   → Go fetch the task with id "task-789"
   */
  entityId?: string;

  /**
   * ── Task-related fields ──
   * Populated when type = "task_assigned" or "task_due"
   */

  /**
   * taskId?: string
   *
   * The UUID of the specific task. Lets the frontend link directly
   * to the task detail page or pre-load the task data.
   */
  taskId?: string;

  /**
   * taskTitle?: string
   *
   * The title of the task, so the notification can display it
   * without making an extra database query.
   * Example: "Review Smith Trust documents"
   */
  taskTitle?: string;

  /**
   * dueDate?: string
   *
   * When the task is due, as an ISO date string.
   * Example: "2024-03-15"
   * Shown in the notification so the user knows the urgency.
   */
  dueDate?: string;

  /**
   * ── Document-related fields ──
   * Populated when type = "document_uploaded", "document_expiring",
   * or "document_requested"
   */

  /**
   * documentId?: string
   *
   * The UUID of the specific document.
   */
  documentId?: string;

  /**
   * documentName?: string
   *
   * The name of the document, displayed in the notification.
   * Example: "Passport.pdf" or "Trust Agreement - Smith Family"
   */
  documentName?: string;

  /**
   * expiresAt?: string
   *
   * When the document expires, as an ISO date string.
   * Example: "2024-03-15"
   * Used for "document_expiring" notifications so the user
   * knows how urgent the renewal is.
   */
  expiresAt?: string;

  /**
   * ── Client-related fields ──
   * Populated when the notification relates to a specific client.
   * Many notification types include this for context.
   */

  /**
   * clientId?: string
   *
   * The UUID of the client this notification relates to.
   * Example: A "document_expiring" notification might include the
   * client whose document is expiring.
   */
  clientId?: string;

  /**
   * clientName?: string
   *
   * The display name of the client, so the notification text
   * can mention them without an extra database lookup.
   * Example: "John Smith" or "Doe Family"
   */
  clientName?: string;

  /**
   * ── Report-related fields ──
   * Populated when type = "report_ready"
   */

  /**
   * reportId?: string
   *
   * The UUID of the report that's ready to view.
   */
  reportId?: string;

  /**
   * reportName?: string
   *
   * The name of the report.
   * Example: "Q1 2024 Portfolio Summary" or "Annual Tax Report"
   */
  reportName?: string;

  /**
   * ── Actor fields ──
   * Populated when another user triggered this notification.
   * "Actor" means "the person who performed the action."
   */

  /**
   * actorId?: string
   *
   * The UUID of the user who caused this notification.
   * Example: If Sarah assigns a task to Kevin, Sarah is the actor.
   * Not populated for system-generated notifications (no human actor).
   */
  actorId?: string;

  /**
   * actorName?: string
   *
   * The display name of the actor, so the notification can say
   * "Sarah assigned you a task" without fetching Sarah's user record.
   */
  actorName?: string;

  /**
   * ── Freeform metadata ──
   */

  /**
   * metadata?: Record<string, unknown>
   *
   * A catch-all field for any extra data that doesn't fit the
   * structured fields above.
   *
   * Record<string, unknown> means "an object with string keys
   * and values of any type" - essentially a JavaScript object.
   *
   * Example:
   *   { maintenanceWindow: "2024-03-20 02:00-04:00 UTC" }
   *   { previousValue: "pending", newValue: "approved" }
   *
   * Use this sparingly - prefer the structured fields above
   * when possible, because they give better TypeScript autocomplete.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Notification Relations (LEAF NODE - No children)
 *
 * Kevin, notifications are simple LEAF NODES like integrations.
 * They belong to a user and an org. No other table references them.
 *
 *   ┌──────┐          ┌────────────────┐          ┌──────┐
 *   │ Org  │ ───────< │ Notifications  │ >─────── │ User │
 *   │(PK)  │          │ org_id (FK)    │          │(PK)  │
 *   └──────┘          │ user_id (FK)   │          └──────┘
 *                     └────────────────┘
 *                        (LEAF NODE)
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER (see documents.ts for full breakdown):                │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │   "Fetch all columns from [table] where [column] matches [value]"   │
 *   │                                                                     │
 *   │ IS NULL = "the column has no value (is empty)"                      │
 *   │   WHERE read_at IS NULL means "only unread notifications"           │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each notification:
 *     notification.user → "Find the ONE user this notification is for"
 *                         SELECT * FROM users WHERE id = notification.user_id
 *     notification.org  → "Find the ONE org this notification is about"
 *                         SELECT * FROM orgs WHERE id = notification.org_id
 *
 * QUERY EXAMPLE - Get unread notifications for a user:
 *   const unread = await db.query.notifications.findMany({
 *     where: and(
 *       eq(notifications.userId, userId),
 *       isNull(notifications.readAt),     // readAt IS NULL = unread
 *     ),
 *     with: { org: true },
 *     orderBy: desc(notifications.createdAt),
 *   });
 *   // unread[0].title = "New task assigned"
 *   // unread[0].type = "task_assigned"
 *   // unread[0].org.name = "Acme Wealth"
 *
 * QUERY EXAMPLE - Count unread notifications (for badge):
 *   // In Drizzle, you'd use:
 *   //   SELECT COUNT(*) FROM notifications
 *   //   WHERE user_id = [userId] AND read_at IS NULL
 *   //
 *   // COUNT(*) = "count how many rows match"
 *   //   Instead of returning all the rows, just tell me HOW MANY there are
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  /**
   * ONE relationship: Notification is for ONE User (REQUIRED)
   *
   * "Who should see this notification?"
   * SQL: SELECT * FROM users WHERE id = notification.user_id
   */
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),

  /**
   * ONE relationship: Notification is in ONE Org context (REQUIRED)
   *
   * Multi-tenant: notifications are org-scoped so a user
   * can have separate notification feeds per org.
   * SQL: SELECT * FROM orgs WHERE id = notification.org_id
   */
  org: one(orgs, {
    fields: [notifications.orgId],
    references: [orgs.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Notification = typeof notifications.$inferSelect
 *
 * Creates a TypeScript type representing a NOTIFICATION ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 * (See clients.ts for full explanation of $inferSelect)
 *
 * WHAT THIS TYPE LOOKS LIKE (TypeScript generates this automatically):
 *   {
 *     id: string;                        // UUID, always present
 *     userId: string;                    // UUID, always present
 *     orgId: string;                     // UUID, always present
 *     type: "task_assigned" | "task_due" | ... ;  // enum value
 *     title: string;                     // always present
 *     message: string | null;            // might be null (optional)
 *     readAt: Date | null;               // null = unread, Date = when read
 *     payload: NotificationPayload;      // JSON object (defaults to {})
 *     createdAt: Date;                   // always present
 *   }
 *
 * USAGE:
 *   const notif: Notification = await db.query.notifications.findFirst();
 *   notif.title     // TypeScript knows this is a string
 *   notif.message   // TypeScript knows this is string | null
 *   notif.readAt    // TypeScript knows this is Date | null
 *   notif.payload.href  // TypeScript knows this is string | undefined
 *
 *   // Check if notification is unread:
 *   if (notif.readAt === null) {
 *     console.log("This notification is unread!");
 *   }
 */
export type Notification = typeof notifications.$inferSelect;

/**
 * export type NewNotification = typeof notifications.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new notification.
 * Some fields are optional (have defaults), so this type reflects that.
 * (See clients.ts for full explanation of $inferInsert)
 *
 * WHAT THIS TYPE LOOKS LIKE:
 *   {
 *     id?: string;                       // Optional - auto-generated UUID
 *     userId: string;                    // REQUIRED - who is this for?
 *     orgId: string;                     // REQUIRED - which org?
 *     type: "task_assigned" | ... ;      // REQUIRED - what kind?
 *     title: string;                     // REQUIRED - the headline
 *     message?: string | null;           // Optional - extra detail
 *     readAt?: Date | null;              // Optional - defaults to null (unread)
 *     payload?: NotificationPayload;     // Optional - defaults to {}
 *     createdAt?: Date;                  // Optional - defaults to NOW
 *   }
 *
 * USAGE:
 *   const newNotif: NewNotification = {
 *     userId: "kevin-123",              // Required - send to Kevin
 *     orgId: "acme-456",               // Required - in the Acme org
 *     type: "task_assigned",            // Required - it's a task assignment
 *     title: "New task assigned",       // Required - the headline
 *     message: "Review Smith Trust documents by Friday",  // Optional detail
 *     payload: {                        // Optional extra data
 *       taskId: "task-789",
 *       taskTitle: "Review Smith Trust documents",
 *       href: "/tasks/task-789",
 *       actorId: "sarah-111",
 *       actorName: "Sarah",
 *     },
 *     // id: auto-generated
 *     // readAt: defaults to null (unread)
 *     // createdAt: defaults to now
 *   };
 *   await db.insert(notifications).values(newNotif);
 */
export type NewNotification = typeof notifications.$inferInsert;
