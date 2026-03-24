import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { orgs } from "./orgs";
import { users } from "./users";

// ============================================================================
// Exchange Rates — Manual currency rate entries for multi-currency consolidation
// ============================================================================

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** Source currency, e.g. "EUR" */
    fromCurrency: text("from_currency").notNull(),

    /** Target currency, e.g. "USD" */
    toCurrency: text("to_currency").notNull(),

    /** Exchange rate with high precision */
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),

    /** Date this rate is effective from */
    effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),

    /** 'manual' | 'api' | 'import' */
    source: text("source").default("manual"),

    /** User who entered this rate */
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("exchange_rates_org_id_idx").on(table.orgId),
    index("exchange_rates_pair_date_idx").on(
      table.fromCurrency,
      table.toCurrency,
      table.effectiveDate
    ),
    uniqueIndex("exchange_rates_unique_pair_date_idx").on(
      table.orgId,
      table.fromCurrency,
      table.toCurrency,
      table.effectiveDate
    ),
  ]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  org: one(orgs, {
    fields: [exchangeRates.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(users, {
    fields: [exchangeRates.createdBy],
    references: [users.id],
  }),
}));

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
