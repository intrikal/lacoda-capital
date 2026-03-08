/**
 * ============================================================================
 * FILE: app/db/schema/deals.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Database schema for the deals table — tracks investment opportunities
 *   through a Kanban-style pipeline (prospecting → exit planning).
 *
 * RELATIONSHIPS:
 *   deals.orgId      → orgs.id       (many-to-one, cascade delete)
 *   deals.clientId   → clients.id    (many-to-one, optional, set null)
 *   deals.assignedTo → users.id      (many-to-one, optional, set null)
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";
import { dealStageEnum, dealTypeEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";
import { users } from "./users";

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Org isolation
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    // Optional client association
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    // Core fields
    name: text("name").notNull(),
    stage: dealStageEnum("stage").notNull().default("prospecting"),
    type: dealTypeEnum("type").notNull(),
    potentialValue: doublePrecision("potential_value").notNull().default(0),
    probability: integer("probability").notNull().default(50),

    // Assignment (stores user name for display, references user for lookup)
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    assigneeName: text("assignee_name"),

    // Dates
    dueDate: text("due_date"),

    // Content
    notes: text("notes"),
    lastActivity: text("last_activity"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("deals_org_id_idx").on(table.orgId),
    index("deals_client_id_idx").on(table.clientId),
    index("deals_stage_idx").on(table.stage),
    index("deals_assigned_to_idx").on(table.assignedTo),
  ]
);

export const dealsRelations = relations(deals, ({ one }) => ({
  org: one(orgs, {
    fields: [deals.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id],
  }),
  assignee: one(users, {
    fields: [deals.assignedTo],
    references: [users.id],
  }),
}));

// Type exports
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
