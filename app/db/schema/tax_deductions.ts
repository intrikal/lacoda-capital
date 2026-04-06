/**
 * ============================================================================
 * FILE: app/db/schema/tax_deductions.ts
 * ============================================================================
 *
 * Drizzle ORM table definition for per-client tax deductions.
 *
 * A "tax deduction" tracks a specific deductible expense for a client —
 * which deductions they're using, the amounts claimed, and their status.
 * Reference data (IRS limits, requirements, documentation checklists) lives
 * in the tax-writeoffs page as static content; this table stores the
 * client-specific tracking data.
 *
 * TABLE: tax_deductions
 *   One row per deduction per client per tax year.
 *   Scoped to an org (multi-tenant).
 *   Every deduction MUST belong to a client (clientId NOT NULL).
 *
 * KEY DESIGN DECISIONS:
 *   - orgId (required):       Multi-tenancy anchor, cascades on delete.
 *   - clientId (required):    Every deduction belongs to a client. Cascades on delete.
 *   - doublePrecision:        Used for amount and estimatedSavings.
 *   - taxYear text:           Stored as "2024" to avoid date conversion issues.
 *   - metadata jsonb:         Extensible for documentation links, receipts, etc.
 *
 * RELATIONS:
 *   tax_deductions → orgs    (many-to-one)
 *   tax_deductions → clients (many-to-one)
 *
 * CONSUMERS:
 *   - lib/actions/tax-deduction.actions.ts      (CRUD server actions)
 *   - lib/hooks/crud/use-tax-deductions.ts     (React hook via server actions)
 *   - app/(dashboard)/app/tax-writeoffs/       (advisor tax deductions page)
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
import {
  taxDeductionCategoryEnum,
  taxDeductionTypeEnum,
  taxDeductionStatusEnum,
} from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// ─── TABLE ────────────────────────────────────────────────────────────────────

export const taxDeductions = pgTable(
  "tax_deductions",
  {
    /** id — Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId — Multi-tenancy anchor. Cascades on delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** clientId — Every deduction belongs to a client. Cascades on delete. */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /** name — Deduction name (e.g., "Mortgage Interest", "Vehicle Mileage"). */
    name: text("name").notNull(),

    /** category — Type of deductible expense. */
    category: taxDeductionCategoryEnum("category").notNull().default("other"),

    /** type — Personal or business deduction. */
    type: taxDeductionTypeEnum("type").notNull().default("personal"),

    /** status — Tracking status: eligible | pending_review | claimed | ineligible. */
    status: taxDeductionStatusEnum("status").notNull().default("eligible"),

    /** amount — Actual deduction amount in USD. */
    amount: doublePrecision("amount").notNull().default(0),

    /** estimatedSavings — Estimated tax savings from this deduction. */
    estimatedSavings: doublePrecision("estimated_savings").notNull().default(0),

    /** taxYear — Tax year this deduction applies to (e.g., "2024"). */
    taxYear: text("tax_year").notNull(),

    /** description — Optional description of the deduction. */
    description: text("description"),

    /** notes — Free-form advisor notes. */
    notes: text("notes"),

    /** metadata — Extensible JSON for documentation links, receipts, etc. */
    metadata: jsonb("metadata").$type<TaxDeductionMetadata>().default({}),

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
    index("tax_deductions_org_id_idx").on(table.orgId),
    index("tax_deductions_client_id_idx").on(table.clientId),
    index("tax_deductions_status_idx").on(table.status),
    index("tax_deductions_category_idx").on(table.category),
    index("tax_deductions_tax_year_idx").on(table.taxYear),
  ]
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const taxDeductionsRelations = relations(taxDeductions, ({ one }) => ({
  org: one(orgs, {
    fields: [taxDeductions.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [taxDeductions.clientId],
    references: [clients.id],
  }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** TaxDeductionMetadata — Shape of the extensible metadata JSONB column. */
export interface TaxDeductionMetadata {
  [key: string]: unknown;
}

/** TaxDeduction — TypeScript type inferred from the Drizzle table definition. */
export type TaxDeduction = typeof taxDeductions.$inferSelect;

/** NewTaxDeduction — TypeScript type for inserting a new row. */
export type NewTaxDeduction = typeof taxDeductions.$inferInsert;
