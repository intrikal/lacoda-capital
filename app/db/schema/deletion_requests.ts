/**
 * ============================================================================
 * FILE: app/db/schema/deletion_requests.ts
 * ============================================================================
 *
 * Tracks GDPR account deletion requests with a 30-day grace period.
 *
 * When a user requests account deletion:
 *   1. Row created with scheduledFor = now + 30 days
 *   2. User can still log in during grace period
 *   3. User can cancel the request (sets cancelledAt)
 *   4. After 30 days, a cron job processes the deletion:
 *      - Nulls all PII in users table (email → deleted, fullName → null, etc.)
 *      - Removes org memberships
 *      - Preserves ledger events with actor='deleted_user:{id}'
 *      - Sets completedAt on this row
 *      - Sends confirmation email
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** userId — The user requesting deletion. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    /** reason — Optional reason for leaving. */
    reason: text("reason"),

    /** requestedAt — When the request was made. */
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** scheduledFor — When the deletion will be executed (requestedAt + 30 days). */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true })
      .notNull(),

    /** cancelledAt — If the user cancelled the request during grace period. */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    /** completedAt — When the deletion was actually executed. */
    completedAt: timestamp("completed_at", { withTimezone: true }),

    /** confirmationSentAt — When the deletion confirmation email was sent. */
    confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
  },
  (table) => [
    index("deletion_requests_user_id_idx").on(table.userId),
    index("deletion_requests_scheduled_for_idx").on(table.scheduledFor),
  ]
);

export const deletionRequestsRelations = relations(deletionRequests, ({ one }) => ({
  user: one(users, {
    fields: [deletionRequests.userId],
    references: [users.id],
  }),
}));

export type DeletionRequest = typeof deletionRequests.$inferSelect;
export type NewDeletionRequest = typeof deletionRequests.$inferInsert;
