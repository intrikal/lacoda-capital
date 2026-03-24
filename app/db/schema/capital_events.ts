import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";

import { capitalEventTypeEnum, capitalEventStatusEnum } from "./00_enums";
import { assets } from "./assets";
import { orgs } from "./orgs";
import { users } from "./users";

// ============================================================================
// Capital Events — PE/VC capital call and distribution tracking
// ============================================================================

export const capitalEvents = pgTable(
  "capital_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),

    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    eventType: capitalEventTypeEnum("event_type").notNull(),

    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),

    currency: text("currency").notNull().default("USD"),

    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),

    dueDate: timestamp("due_date", { withTimezone: true }),

    status: capitalEventStatusEnum("status").notNull().default("pending"),

    notes: text("notes"),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("capital_events_asset_id_idx").on(table.assetId),
    index("capital_events_org_id_idx").on(table.orgId),
    index("capital_events_status_idx").on(table.status),
    index("capital_events_event_date_idx").on(table.eventDate),
  ]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const capitalEventsRelations = relations(capitalEvents, ({ one }) => ({
  asset: one(assets, {
    fields: [capitalEvents.assetId],
    references: [assets.id],
  }),
  org: one(orgs, {
    fields: [capitalEvents.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(users, {
    fields: [capitalEvents.createdBy],
    references: [users.id],
  }),
}));

// ─── Types ──────────────────────────────────────────────────────────────────

export type CapitalEvent = typeof capitalEvents.$inferSelect;
export type NewCapitalEvent = typeof capitalEvents.$inferInsert;
