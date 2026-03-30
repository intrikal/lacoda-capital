/**
 * ============================================================================
 * FILE: app/db/schema/transfers.ts
 * ============================================================================
 *
 * Drizzle ORM table definition for client-initiated fund transfers.
 *
 * A "transfer" is a fund movement request initiated by a client -- deposit
 * into an investment account, withdrawal to a bank, or internal transfer
 * between investment accounts.
 *
 * NOTE: This is DIFFERENT from capital_events (PE/VC capital calls) and
 * billing_records (advisory fee invoices). Those tables track firm-level
 * financial events; this table tracks client-facing fund movements.
 *
 * TABLE: transfers
 *   One row per transfer request. Scoped to an org (multi-tenant).
 *   Every transfer MUST belong to a client (clientId is NOT NULL).
 *
 * KEY DESIGN DECISIONS:
 *   - orgId (required):       Multi-tenancy anchor, cascades on delete.
 *   - clientId (required):    Every transfer belongs to a client.
 *   - type enum:              deposit | withdrawal | transfer (DB-enforced).
 *   - status enum:            pending | processing | completed | cancelled | failed.
 *   - amount:                 Double precision, always positive.
 *   - fromAccount/toAccount:  Free-text account labels (e.g. "Chase ****4532").
 *   - completedAt:            NULL until status reaches "completed".
 *   - Soft deletes:           deletedAt timestamp (NULL = active row).
 *
 * RELATIONS:
 *   transfers -> orgs    (many-to-one: each transfer belongs to one org)
 *   transfers -> clients (many-to-one: each transfer belongs to one client)
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { transferTypeEnum, transferStatusEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// --- TABLE -----------------------------------------------------------------

export const transfers = pgTable(
  "transfers",
  {
    /** id -- Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId -- Multi-tenancy anchor. Cascades on delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** clientId -- Every transfer belongs to a client. Cascades on delete. */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /** type -- deposit, withdrawal, or internal transfer. */
    type: transferTypeEnum("type").notNull(),

    /** amount -- Transfer amount in USD (always positive). */
    amount: doublePrecision("amount").notNull(),

    /** fromAccount -- Source account label (e.g. "Chase Bank ****4532"). */
    fromAccount: text("from_account").notNull(),

    /** toAccount -- Destination account label. */
    toAccount: text("to_account").notNull(),

    /** status -- Lifecycle: pending -> processing -> completed (or cancelled/failed). */
    status: transferStatusEnum("status").notNull().default("pending"),

    /** frequency -- "One-time", "Weekly", "Monthly", "Quarterly". */
    frequency: text("frequency").notNull().default("One-time"),

    /** reference -- Optional advisor note or reference number (e.g. "DEP-2024-0120"). */
    reference: text("reference"),

    /** completedAt -- Set when status reaches "completed". NULL otherwise. */
    completedAt: timestamp("completed_at", { withTimezone: true }),

    /** createdAt / updatedAt -- Standard audit timestamps. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Soft delete -- NULL = active row. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("transfers_org_id_idx").on(table.orgId),
    index("transfers_client_id_idx").on(table.clientId),
    index("transfers_status_idx").on(table.status),
    index("transfers_type_idx").on(table.type),
  ]
);

// --- RELATIONS -------------------------------------------------------------

export const transfersRelations = relations(transfers, ({ one }) => ({
  org: one(orgs, {
    fields: [transfers.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [transfers.clientId],
    references: [clients.id],
  }),
}));

// --- TYPES -----------------------------------------------------------------

/** TransferRecord -- TypeScript type inferred from the Drizzle table definition. */
export type TransferRecord = typeof transfers.$inferSelect;

/** NewTransfer -- TypeScript type for inserting a new row. */
export type NewTransfer = typeof transfers.$inferInsert;
