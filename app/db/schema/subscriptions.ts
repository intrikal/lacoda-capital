/**
 * ============================================================================
 * FILE: app/db/schema/subscriptions.ts
 * ============================================================================
 *
 * Drizzle ORM table for Stripe subscription tracking.
 *
 * Each org has at most one active subscription. This table stores the Stripe
 * subscription ID, plan tier, billing cycle dates, and usage snapshots.
 * Stripe is the source of truth for payment state; this table caches the
 * relevant fields so the app can check plan limits without calling Stripe.
 *
 * TABLE: subscriptions
 *   One row per org. Updated by Stripe webhooks.
 *
 * KEY DESIGN DECISIONS:
 *   - orgId is unique — one subscription per org.
 *   - stripeCustomerId / stripeSubscriptionId stored for API lookups.
 *   - Plan limits enforced by lib/stripe/plan-limits.ts using the plan column.
 *   - Webhook idempotency via stripeSubscriptionId + status combo.
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { subscriptionPlanEnum, subscriptionStatusEnum } from "./00_enums";
import { orgs } from "./orgs";

// ─── TABLE ────────────────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId — One subscription per org. Cascades on delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** plan — Current plan tier (free/starter/professional/enterprise). */
    plan: subscriptionPlanEnum("plan").notNull().default("free"),

    /** status — Subscription lifecycle state. */
    status: subscriptionStatusEnum("status").notNull().default("trialing"),

    /** stripeCustomerId — Stripe Customer object ID (cus_xxx). */
    stripeCustomerId: text("stripe_customer_id"),

    /** stripeSubscriptionId — Stripe Subscription object ID (sub_xxx). */
    stripeSubscriptionId: text("stripe_subscription_id"),

    /** stripePriceId — Stripe Price ID for the current plan. */
    stripePriceId: text("stripe_price_id"),

    /** currentPeriodStart — Start of the current billing cycle. */
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),

    /** currentPeriodEnd — End of the current billing cycle / trial end. */
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

    /** cancelAtPeriodEnd — True if user requested cancellation. */
    cancelAtPeriodEnd: text("cancel_at_period_end").default("false"),

    /** trialEnd — When the trial period ends (null if not trialing). */
    trialEnd: timestamp("trial_end", { withTimezone: true }),

    /** metadata — Extensible: coupon codes, discount info, etc. */
    metadata: jsonb("metadata").$type<SubscriptionMetadata>().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("subscriptions_org_id_idx").on(table.orgId),
    index("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
    index("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
    index("subscriptions_status_idx").on(table.status),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  org: one(orgs, {
    fields: [subscriptions.orgId],
    references: [orgs.id],
  }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface SubscriptionMetadata {
  couponId?: string;
  discountPercent?: number;
  checkoutSessionId?: string;
  lastInvoiceId?: string;
  lastPaymentIntentId?: string;
  [key: string]: unknown;
}

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
