/**
 * ============================================================================
 * FILE: app/db/schema/benchmarks.ts
 * ============================================================================
 *
 * Drizzle ORM table definition for portfolio benchmarks.
 *
 * A "benchmark" is a market index or reference point that a portfolio is
 * measured against — e.g., S&P 500, NASDAQ Composite, Russell 2000, MSCI EAFE.
 * Each benchmark stores key performance metrics relative to the portfolio
 * (alpha, beta, Sharpe ratio, volatility) so advisors can track how well
 * their clients' portfolios perform against standard market indices.
 *
 * TABLE: benchmarks
 *   One row per tracked benchmark.
 *   Scoped to an org (multi-tenant) with an optional link to a specific client.
 *
 * KEY DESIGN DECISIONS:
 *   - orgId (required):    All benchmarks belong to an org — enforces multi-tenancy.
 *   - clientId (optional): Benchmarks can be linked to a specific client for
 *     per-client comparison, or left null for org-level benchmarks.
 *   - doublePrecision:     Used for financial metrics (ytdReturn, alpha, beta,
 *     sharpeRatio, volatility) for simplicity.
 *   - metadata jsonb:      Extensible field for performance data points,
 *     sector allocations, and time-series data.
 *
 * RELATIONS:
 *   benchmarks → orgs    (many-to-one: each benchmark belongs to one org)
 *   benchmarks → clients (many-to-one: each benchmark optionally belongs to one client)
 *
 * CONSUMERS:
 *   - lib/actions/benchmark.actions.ts     (CRUD server actions)
 *   - lib/hooks/crud/use-benchmarks.ts     (React hook via server actions)
 *   - app/(dashboard)/app/benchmarks/      (advisor dashboard benchmarks page)
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { benchmarkCategoryEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// ─── TABLE ────────────────────────────────────────────────────────────────────

export const benchmarks = pgTable(
  "benchmarks",
  {
    /** id — Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId — Multi-tenancy anchor. Cascades on delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** clientId — Optional link to a specific client. SET NULL on delete. */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /** name — Human-readable benchmark name (e.g., "S&P 500"). */
    name: text("name").notNull(),

    /** symbol — Ticker or symbol (e.g., "SPX", "IXIC", "RUT"). */
    symbol: text("symbol"),

    /** category — Type of benchmark: index | etf | mutual_fund | custom. */
    category: benchmarkCategoryEnum("category").notNull().default("index"),

    /** ytdReturn — Year-to-date return percentage (e.g., 13.2). */
    ytdReturn: doublePrecision("ytd_return").notNull().default(0),

    /** alpha — Excess return over the benchmark (e.g., 6.4). */
    alpha: doublePrecision("alpha").notNull().default(0),

    /** beta — Volatility relative to the market (e.g., 0.85). */
    beta: doublePrecision("beta").notNull().default(1),

    /** sharpeRatio — Risk-adjusted return measure (e.g., 1.42). */
    sharpeRatio: doublePrecision("sharpe_ratio").notNull().default(0),

    /** volatility — Annualized standard deviation percentage (e.g., 12.8). */
    volatility: doublePrecision("volatility").notNull().default(0),

    /** notes — Free-form advisor notes about this benchmark. */
    notes: text("notes"),

    /** metadata — Extensible JSON for performance data points, sector allocations. */
    metadata: jsonb("metadata").$type<BenchmarkMetadata>().default({}),

    /** createdAt / updatedAt — Standard audit timestamps. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * SOFT DELETE — see documents.ts deletedAt for full explanation.
     * NULL = active row. NOT NULL = "deleted" at that timestamp.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("benchmarks_org_id_idx").on(table.orgId),
    index("benchmarks_client_id_idx").on(table.clientId),
    index("benchmarks_category_idx").on(table.category),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const benchmarksRelations = relations(benchmarks, ({ one }) => ({
  org: one(orgs, {
    fields: [benchmarks.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [benchmarks.clientId],
    references: [clients.id],
  }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** BenchmarkMetadata — Shape of the extensible metadata JSONB column. */
export interface BenchmarkMetadata {
  [key: string]: unknown;
}

/** Benchmark — TypeScript type inferred from the Drizzle table definition. */
export type Benchmark = typeof benchmarks.$inferSelect;

/** NewBenchmark — TypeScript type for inserting a new row. */
export type NewBenchmark = typeof benchmarks.$inferInsert;
