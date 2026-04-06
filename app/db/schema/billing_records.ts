/**
 * ============================================================================
 * FILE: app/db/schema/billing_records.ts
 * ============================================================================
 *
 * Drizzle ORM table definition for billing records (advisory fee invoices).
 *
 * A "billing record" represents a single advisory fee invoice for a client.
 * Advisors create and manage these; clients view them read-only in the portal.
 * Each record captures the billing period, fee amount, AUM at time of billing,
 * payment status, and the effective fee rate charged.
 *
 * TABLE: billing_records
 *   One row per invoice. Scoped to an org (multi-tenant).
 *   Every invoice MUST belong to a client (clientId is NOT NULL).
 *
 * KEY DESIGN DECISIONS:
 *   - orgId (required):       Multi-tenancy anchor, cascades on delete.
 *   - clientId (required):    Every invoice belongs to a client. Cascades on delete.
 *   - doublePrecision:        Used for amount, aum, effectiveRate for simplicity.
 *   - dueDate/paidDate text:  Stored as "YYYY-MM-DD" to avoid timezone issues.
 *   - metadata jsonb:         Extensible field for line items, payment references.
 *
 * RELATIONS:
 *   billing_records → orgs    (many-to-one: each invoice belongs to one org)
 *   billing_records → clients (many-to-one: each invoice belongs to one client)
 *
 * CONSUMERS:
 *   - lib/actions/billing-record.actions.ts     (CRUD server actions)
 *   - lib/hooks/crud/use-billing-records.ts     (React hook via server actions)
 *   - app/(dashboard)/app/billing/              (advisor billing management page)
 *   - app/(client)/client/billing/              (client read-only billing view)
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
import { billingStatusEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// ─── TABLE ────────────────────────────────────────────────────────────────────

export const billingRecords = pgTable(
  "billing_records",
  {
    /** id — Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId — Multi-tenancy anchor. Cascades on delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** clientId — Every invoice belongs to a client. Cascades on delete. */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /** period — Billing period label (e.g., "Q1 2024", "Jan 2024"). */
    period: text("period").notNull(),

    /** amount — Total advisory fee amount in USD. */
    amount: doublePrecision("amount").notNull().default(0),

    /** aum — Average assets under management for this billing period. */
    aum: doublePrecision("aum").notNull().default(0),

    /** status — Invoice lifecycle: paid | upcoming | due. */
    status: billingStatusEnum("status").notNull().default("upcoming"),

    /** dueDate — Payment due date, stored as "YYYY-MM-DD" text. */
    dueDate: text("due_date").notNull(),

    /** paidDate — Date payment was received, null if unpaid. */
    paidDate: text("paid_date"),

    /** effectiveRate — Fee rate as decimal (e.g., 0.0085 = 0.85%). */
    effectiveRate: doublePrecision("effective_rate").notNull().default(0),

    /** description — Optional invoice description (e.g., "Q1 2024 Advisory Fee"). */
    description: text("description"),

    /** notes — Free-form advisor notes about this invoice. */
    notes: text("notes"),

    /** metadata — Extensible JSON for line items, payment references, etc. */
    metadata: jsonb("metadata").$type<BillingRecordMetadata>().default({}),

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
    index("billing_records_org_id_idx").on(table.orgId),
    index("billing_records_client_id_idx").on(table.clientId),
    index("billing_records_status_idx").on(table.status),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const billingRecordsRelations = relations(billingRecords, ({ one }) => ({
  org: one(orgs, {
    fields: [billingRecords.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [billingRecords.clientId],
    references: [clients.id],
  }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** BillingRecordMetadata — Shape of the extensible metadata JSONB column. */
export interface BillingRecordMetadata {
  [key: string]: unknown;
}

/** BillingRecord — TypeScript type inferred from the Drizzle table definition. */
export type BillingRecord = typeof billingRecords.$inferSelect;

/** NewBillingRecord — TypeScript type for inserting a new row. */
export type NewBillingRecord = typeof billingRecords.$inferInsert;
