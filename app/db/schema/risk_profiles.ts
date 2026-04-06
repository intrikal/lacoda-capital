import { relations } from "drizzle-orm"
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { riskToleranceEnum, riskAlertStatusEnum } from "./00_enums"
import { orgs } from "./orgs"
import { clients } from "./clients"
import { users } from "./users"

/**
 * Risk Profiles Table
 *
 * Stores the risk management framework for each client:
 *   - Drawdown limits (maximum allowed portfolio decline)
 *   - Volatility controls (target and maximum annualized volatility)
 *   - Hedging parameters (hedge ratio, instruments in use)
 *   - Value-at-Risk (VaR) settings
 *   - Current alert status for advisors to act on
 *
 * One row per client per org (enforced by unique constraint).
 * Reviewed and updated on a cadence set by nextReviewDue.
 *
 * Key concepts:
 *   drawdown      = peak-to-trough decline, e.g. -15% means the portfolio
 *                   is 15% below its most recent high-water mark
 *   volatility    = annualized standard deviation of returns (%)
 *   hedge ratio   = proportion of portfolio value that is hedged (0–100%)
 *   VaR           = maximum expected loss over a period at a confidence level
 *                   e.g. 95% VaR of $50,000 means 5% chance of losing >$50k in a day
 */
export const riskProfiles = pgTable(
  "risk_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ── Tenant isolation ───────────────────────────────────────────────────
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    // ── Subject (client-level profile) ────────────────────────────────────
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // ── Last reviewer ──────────────────────────────────────────────────────
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // ── Risk tolerance ─────────────────────────────────────────────────────
    riskTolerance: riskToleranceEnum("risk_tolerance").notNull().default("moderate"),
    investmentHorizon: text("investment_horizon"), // e.g. "5–10 years"

    // ── Drawdown limits (percentages stored as numeric, e.g. 15.00 = 15%) ─
    maxDrawdown: numeric("max_drawdown", { precision: 5, scale: 2 }),     // hard limit
    alertDrawdown: numeric("alert_drawdown", { precision: 5, scale: 2 }), // soft warning threshold
    currentDrawdown: numeric("current_drawdown", { precision: 5, scale: 2 }), // live reading

    // ── Volatility controls (annualized %) ────────────────────────────────
    targetVolatility: numeric("target_volatility", { precision: 5, scale: 2 }),
    maxVolatility: numeric("max_volatility", { precision: 5, scale: 2 }),
    currentVolatility: numeric("current_volatility", { precision: 5, scale: 2 }),

    // ── Hedging parameters ─────────────────────────────────────────────────
    hedgeRatio: numeric("hedge_ratio", { precision: 5, scale: 2 }), // 0–100
    hedgingInstruments: jsonb("hedging_instruments"),               // string[] of instrument names

    // ── Value-at-Risk ──────────────────────────────────────────────────────
    varConfidenceLevel: numeric("var_confidence_level", {
      precision: 5,
      scale: 2,
    }), // e.g. 95.00 or 99.00
    varAmount: numeric("var_amount", { precision: 18, scale: 2 }), // dollar VaR
    varHorizonDays: integer("var_horizon_days"),                    // e.g. 1, 10, 20

    // ── Current alert status ───────────────────────────────────────────────
    alertStatus: riskAlertStatusEnum("alert_status").notNull().default("normal"),
    alertNotes: text("alert_notes"), // advisor notes on any active breach/watch

    // ── Review cycle ──────────────────────────────────────────────────────
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewDue: timestamp("next_review_due", { withTimezone: true }),

    // ── Flex metadata ──────────────────────────────────────────────────────
    notes: text("notes"),
    metadata: jsonb("metadata"),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // One risk profile per client per org
    unique("risk_profiles_org_client_unique").on(table.orgId, table.clientId),
    index("risk_profiles_org_id_idx").on(table.orgId),
    index("risk_profiles_client_id_idx").on(table.clientId),
    index("risk_profiles_alert_status_idx").on(table.alertStatus),
  ]
)

// ── Relations ─────────────────────────────────────────────────────────────────

export const riskProfilesRelations = relations(riskProfiles, ({ one }) => ({
  org: one(orgs, { fields: [riskProfiles.orgId], references: [orgs.id] }),
  client: one(clients, { fields: [riskProfiles.clientId], references: [clients.id] }),
  reviewedBy: one(users, { fields: [riskProfiles.reviewedBy], references: [users.id] }),
}))

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskProfile = typeof riskProfiles.$inferSelect
export type NewRiskProfile = typeof riskProfiles.$inferInsert
