/**
 * ============================================================================
 * TEST FILE: notification-read.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the NOTIFICATIONS table — specifically the
 * "mark as read" pattern and the overall notification structure.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW "MARK AS READ" WORKS                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The notifications table uses a read_at TIMESTAMP column instead of    │
 * │ a simple read BOOLEAN. Here's why:                                    │
 * │                                                                        │
 * │ BOOLEAN approach (simpler but less useful):                            │
 * │   read = false  → unread                                               │
 * │   read = true   → read                                                 │
 * │   Problem: You don't know WHEN it was read.                           │
 * │                                                                        │
 * │ TIMESTAMP approach (what we use):                                      │
 * │   read_at = NULL              → unread                                 │
 * │   read_at = "2024-06-15 14:30" → read at 2:30 PM on June 15          │
 * │                                                                        │
 * │ Benefits:                                                              │
 * │   - "Find all unread" → WHERE read_at IS NULL                         │
 * │   - "When was it read?" → check read_at value                         │
 * │   - "Mark as read" → UPDATE SET read_at = NOW()                       │
 * │   - "Mark as unread" → UPDATE SET read_at = NULL                      │
 * │                                                                        │
 * │ IS NULL EXPLAINED:                                                     │
 * │   NULL means "no value" or "empty". It's different from 0, "", false. │
 * │   In SQL, you check for NULL with IS NULL (not = NULL).               │
 * │     WHERE read_at IS NULL     → finds unread notifications            │
 * │     WHERE read_at IS NOT NULL → finds read notifications              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/db/schema/notifications.ts         — The Drizzle table definition
 *   lib/validations/notification.schema.ts — The Zod validation schema
 *
 * See ledger-event.schema.test.ts for a full explanation of Vitest,
 * describe/it/expect, and testing fundamentals.
 */

/**
 * Vitest testing functions.
 * See ledger-event.schema.test.ts for full explanation of each.
 */
import { describe, it, expect } from "vitest"

/**
 * The Zod validation schema for creating notifications.
 * Used on both server and client to validate input.
 */
import { createNotificationSchema } from "@/lib/validations/notification.schema"

/**
 * The Drizzle table definition for notifications.
 * We use getTableConfig() to inspect its structure.
 */
import { notifications } from "@/app/db/schema/notifications"

/**
 * getTableConfig() extracts columns, indexes, and constraints
 * from a Drizzle table definition without needing a running database.
 */
import { getTableConfig } from "drizzle-orm/pg-core"

// ============================================================================
// TEST GROUP 1: Drizzle Schema Structure
// ============================================================================
// These tests verify the notifications table has the right columns
// and constraints. They run without a database.

describe("notifications — Drizzle schema structure", () => {
  const config = getTableConfig(notifications)

  it("has the correct table name", () => {
    expect(config.name).toBe("notifications")
  })

  /**
   * TEST: All required columns exist.
   *
   * The notifications table needs:
   *   id       — unique identifier (PK)
   *   org_id   — which org this notification belongs to (multi-tenant)
   *   user_id  — which user should see this notification
   *   type     — what kind of notification (task_assigned, document_uploaded, etc.)
   *   title    — the notification headline ("New task assigned")
   *   message  — optional longer description
   *   read_at  — NULL = unread, timestamp = when it was read
   *   link     — optional URL to navigate to when clicked
   *   payload  — optional JSONB for extra data
   *   created_at — when the notification was created
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "org_id",
        "user_id",
        "type",
        "title",
        "message",
        "read_at",
        "link",
        "payload",
        "created_at",
      ])
    )
  })

  /**
   * TEST: user_id is NOT NULL.
   *
   * Every notification must be sent TO someone.
   * A notification without a recipient is meaningless.
   */
  it("user_id is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "user_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: org_id is NOT NULL.
   *
   * Multi-tenant isolation: every notification belongs to an org.
   * Org A's users should never see Org B's notifications.
   */
  it("org_id is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "org_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: title is NOT NULL.
   *
   * Every notification needs a headline. You can't show a blank
   * notification in the bell menu.
   */
  it("title is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "title")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: read_at is nullable.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ THIS IS THE "MARK AS READ" MECHANISM                               │
   * │                                                                     │
   * │ read_at = NULL  → the notification is UNREAD                        │
   * │ read_at = date  → the notification was read at that time            │
   * │                                                                     │
   * │ When the user clicks a notification:                                │
   * │   UPDATE notifications SET read_at = NOW() WHERE id = 'abc-123'    │
   * │                                                                     │
   * │ To find all unread notifications for a user:                        │
   * │   SELECT * FROM notifications                                       │
   * │   WHERE user_id = 'user-123' AND read_at IS NULL                   │
   * │                                                                     │
   * │ The column MUST be nullable for this pattern to work.               │
   * │ If it were NOT NULL, every notification would start "read."         │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  it("read_at is nullable (unread = NULL, read = timestamp)", () => {
    const col = config.columns.find((c) => c.name === "read_at")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: link is nullable.
   *
   * Not every notification has a link. A "system" notification
   * (like "Scheduled maintenance tonight") doesn't need to link anywhere.
   */
  it("link is nullable (not all notifications have links)", () => {
    const col = config.columns.find((c) => c.name === "link")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: message (body) is nullable.
   *
   * Sometimes the title is enough: "New task assigned to you".
   * A longer body is optional extra context.
   */
  it("message is nullable", () => {
    const col = config.columns.find((c) => c.name === "message")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: There's an index on (user_id, read_at) for unread queries.
   *
   * WHY: The most common notification query is:
   *   "Show me all UNREAD notifications for user X"
   *   → WHERE user_id = ? AND read_at IS NULL
   *
   * This composite index makes that query fast — it doesn't have to
   * scan all notifications for all users.
   */
  it("has user_id + read_at index for unread notification queries", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "notifications_user_unread_idx"
    )
    expect(idx).toBeDefined()
  })

  /**
   * TEST: There's an index on (user_id, type) for filtering by type.
   *
   * WHY: Users might want to filter notifications:
   *   "Show me only task-related notifications"
   *   → WHERE user_id = ? AND type = 'task_assigned'
   */
  it("has user_id + type index for filtering by notification type", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "notifications_user_type_idx"
    )
    expect(idx).toBeDefined()
  })

  /**
   * TEST: There's an index on (user_id, created_at) for chronological queries.
   *
   * WHY: Notifications are always shown newest first.
   *   "Show me notifications for user X, ordered by newest"
   *   → WHERE user_id = ? ORDER BY created_at DESC
   */
  it("has user_id + created_at index for chronological queries", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "notifications_user_created_at_idx"
    )
    expect(idx).toBeDefined()
  })
})

// ============================================================================
// TEST GROUP 2: Notification Read Toggle — Zod Validation
// ============================================================================
// These tests verify the Zod validation schema for creating notifications.
//
// KEY INSIGHT: The CREATE schema does NOT include read_at because
// notifications always start as UNREAD. The "mark as read" operation
// is a separate UPDATE that happens later when the user clicks it.

describe("notification read toggle — Zod validation", () => {
  /**
   * TEST: A new notification starts unread (no read_at field in create).
   *
   * When you create a notification, you provide userId, type, and title.
   * The read_at field is NOT in the create schema — it starts as NULL
   * in the database (meaning "unread").
   */
  it("creates a notification (starts as unread — no read_at field needed)", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "task_assigned",
      title: "New task assigned to you",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // read_at is not part of the create schema — notifications start unread
      expect(result.data).not.toHaveProperty("readAt")
    }
  })

  /**
   * TEST: A notification with an optional message body is valid.
   *
   * The message field provides extra context beyond the title.
   * Example: title = "Document uploaded"
   *          message = "The trust agreement has been uploaded and is ready for review."
   */
  it("accepts notification with optional message body", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "document_uploaded",
      title: "Document uploaded",
      message:
        "The trust agreement has been uploaded and is ready for review.",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe(
        "The trust agreement has been uploaded and is ready for review."
      )
    }
  })

  /**
   * TEST: The link column exists in the DB schema (nullable).
   *
   * The link field lets a notification navigate to a specific page
   * when clicked (e.g., "/app/tasks/abc-123"). It's added by the
   * server logic, not the create validation, so we verify it exists
   * on the Drizzle table definition.
   */
  it("accepts notification with link", () => {
    const config = getTableConfig(notifications)
    const linkCol = config.columns.find((c) => c.name === "link")
    expect(linkCol).toBeDefined()
    expect(linkCol!.notNull).toBe(false)
  })

  /**
   * TEST: Payload for deep linking is accepted.
   *
   * The payload JSONB column can store extra data for the frontend.
   * Example: { controlId: "ctrl-123", href: "/app/compliance/ctrl-123" }
   * The frontend uses this to navigate to the right page when clicked.
   */
  it("accepts notification with payload for deep linking", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "compliance_alert",
      title: "Compliance control overdue",
      payload: {
        controlId: "ctrl-123",
        controlCode: "KYC-001",
        href: "/app/compliance/ctrl-123",
      },
    })
    expect(result.success).toBe(true)
  })

  /**
   * TEST: Invalid notification types are REJECTED.
   *
   * The type enum only allows specific values like "task_assigned",
   * "document_uploaded", "system", etc. "invalid_type" is not one
   * of them, so Zod rejects it.
   */
  it("rejects invalid notification type", () => {
    const result = createNotificationSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      type: "invalid_type",
      title: "Test",
    })
    expect(result.success).toBe(false)
  })
})
