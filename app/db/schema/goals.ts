/**
 * ============================================================================
 * FILE: app/db/schema/goals.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Drizzle ORM table definition for financial goals.
 *
 *   A "goal" is a named financial target that a client is working toward —
 *   e.g., "Retirement Fund by 2040" or "Children's Education by 2030".
 *   Each goal tracks a target amount, current amount, monthly contribution,
 *   and a target date so progress can be visualized over time.
 *
 * TABLE: goals
 *   One row per financial goal.
 *   Scoped to an org (multi-tenant) with an optional link to a specific client.
 *
 * KEY DESIGN DECISIONS:
 *   - orgId (required):    All goals belong to an org — enforces multi-tenancy.
 *   - clientId (optional): Goals can be linked to a specific client for filtering
 *     in the client portal, or left null for org-level goals.
 *   - doublePrecision:     Used for financial amounts (targetAmount, currentAmount,
 *     monthlyContribution) for simplicity. For production systems requiring
 *     arbitrary precision, switch to numeric(18, 2).
 *   - targetDate as text:  Stored as ISO date string "YYYY-MM-DD" to avoid
 *     timezone complications with date-only values.
 *   - status stored:       Goal status (on_track/ahead/behind/completed) is stored
 *     explicitly and updated by the advisor via the UI — not derived automatically.
 *     This gives advisors control over the displayed status narrative.
 *   - metadata jsonb:      Extensible field for future use (e.g., milestones,
 *     recurrence rules, linked asset IDs).
 *
 * RELATIONS:
 *   goals → orgs    (many-to-one: each goal belongs to one org)
 *   goals → clients (many-to-one: each goal optionally belongs to one client)
 *
 * CONSUMERS:
 *   - lib/graphql/resolvers/goal.ts   (CRUD resolvers)
 *   - lib/hooks/crud/use-goals.ts     (React hook via Apollo Client)
 *   - app/(dashboard)/app/goals/      (advisor dashboard goals page)
 *   - app/(client)/client/goals/      (client portal goals page)
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
import { goalCategoryEnum, goalStatusEnum, goalPriorityEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// ─── TABLE ────────────────────────────────────────────────────────────────────

export const goals = pgTable(
  "goals",
  {
    /**
     * id — Primary key.
     * Auto-generated UUID. Never changes after creation.
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * orgId — Multi-tenancy anchor.
     * Every goal is owned by exactly one organization.
     * Cascades on delete: removing an org removes all its goals.
     */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /**
     * clientId — Optional link to a specific client.
     * When set, the goal appears in that client's portal view.
     * When null, the goal is an org-level goal not tied to any client.
     * SET NULL on delete: removing a client orphans the goal (doesn't delete it).
     */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /**
     * name — Human-readable goal name.
     * Example: "Retirement Fund", "Dream Home Down Payment"
     */
    name: text("name").notNull(),

    /**
     * category — Type of financial objective.
     * Drives icon and color in the UI.
     * Values: retirement | education | realestate | emergency |
     *         travel | vehicle | investment | custom
     */
    category: goalCategoryEnum("category").notNull().default("custom"),

    /**
     * status — Current progress narrative.
     * Set explicitly by the advisor via the status dropdown.
     * NOT automatically derived — advisors have full control.
     * Values: on_track | ahead | behind | completed
     */
    status: goalStatusEnum("status").notNull().default("on_track"),

    /**
     * priority — Relative importance of this goal.
     * Values: high | medium | low
     */
    priority: goalPriorityEnum("priority").notNull().default("medium"),

    /**
     * targetAmount — The total monetary goal (e.g., $5,000,000).
     * doublePrecision maps to float8 in PostgreSQL → JS number.
     */
    targetAmount: doublePrecision("target_amount").notNull(),

    /**
     * currentAmount — Amount saved / invested toward this goal so far.
     * Updated periodically by the advisor or via integrations.
     */
    currentAmount: doublePrecision("current_amount").notNull().default(0),

    /**
     * monthlyContribution — Regular monthly deposit toward this goal.
     * Used to compute projected completion date.
     */
    monthlyContribution: doublePrecision("monthly_contribution")
      .notNull()
      .default(0),

    /**
     * targetDate — The desired completion date.
     * Stored as ISO date string "YYYY-MM-DD" to avoid timezone drift.
     */
    targetDate: text("target_date").notNull(),

    /**
     * notes — Free-form advisor or client notes about this goal.
     */
    notes: text("notes"),

    /**
     * metadata — Extensible JSON for future fields.
     * Examples: milestone checkpoints, linked asset IDs, recurrence rules.
     */
    metadata: jsonb("metadata").$type<GoalMetadata>().default({}),

    /**
     * createdAt / updatedAt — Standard audit timestamps.
     */
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
    // Index on orgId — every query scopes by org first
    index("goals_org_id_idx").on(table.orgId),
    // Index on clientId — for client-portal filtered views
    index("goals_client_id_idx").on(table.clientId),
    // Index on status — for filtering by on_track / behind / completed
    index("goals_status_idx").on(table.status),
    // Index on category — for grouping / filtering by goal type
    index("goals_category_idx").on(table.category),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

/**
 * goalsRelations — Drizzle relation definitions for the goals table.
 *
 * MANY-TO-ONE:
 *   Each goal belongs to exactly one org (required).
 *   Each goal optionally belongs to one client.
 */
export const goalsRelations = relations(goals, ({ one }) => ({
  org: one(orgs, {
    fields: [goals.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [goals.clientId],
    references: [clients.id],
  }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * GoalMetadata — Shape of the extensible metadata JSONB column.
 *
 * Currently empty — reserved for future milestone tracking, linked assets,
 * or recurrence configuration without requiring a schema migration.
 */
export interface GoalMetadata {
  [key: string]: unknown;
}

/**
 * Goal — TypeScript type inferred from the Drizzle table definition.
 * Use this for type-safe reads from the database.
 */
export type Goal = typeof goals.$inferSelect;

/**
 * NewGoal — TypeScript type for inserting a new row.
 * Use this for type-safe inserts.
 */
export type NewGoal = typeof goals.$inferInsert;
