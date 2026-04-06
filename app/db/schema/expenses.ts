import { relations } from "drizzle-orm"
import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { expenseCategoryEnum, expenseStatusEnum } from "./00_enums"
import { orgs } from "./orgs"
import { clients } from "./clients"
import { entities } from "./entities"
import { assets } from "./assets"
import { users } from "./users"

/**
 * Expenses Table
 *
 * Tracks all portfolio-related spending — renovation costs, maintenance,
 * management fees, financing costs, etc. — tied to specific assets or
 * entities so advisors and clients can see where money is going.
 *
 * Real-estate-specific fields:
 *   - propertyImpact: classifies whether the spend improves the property
 *   - estimatedValueIncrease: projected equity gain from the expense
 *   - refinanceRelated: flags costs incurred as part of a refi
 *
 * Design decisions:
 *   - orgId for multi-tenant isolation (every query filters by orgId)
 *   - assetId / entityId / clientId are all nullable — an expense can be
 *     org-wide (e.g. legal retainer) or scoped to a single property
 *   - Soft-deleted via deletedAt (regulatory retention requirement)
 */
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ── Tenant isolation ───────────────────────────────────────────────────
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    // ── Scope (all optional — expense can be at any level) ────────────────
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),

    // ── Who logged it ──────────────────────────────────────────────────────
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),

    // ── Core fields ────────────────────────────────────────────────────────
    title: text("title").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    category: expenseCategoryEnum("category").notNull(),
    status: expenseStatusEnum("status").notNull().default("pending"),

    // ── Payment details ────────────────────────────────────────────────────
    date: timestamp("date", { withTimezone: true }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    vendor: text("vendor"),
    invoiceNumber: text("invoice_number"),

    // ── Real-estate-specific ───────────────────────────────────────────────
    // "renovation" | "maintenance" | "capital_improvement" | null
    propertyImpact: text("property_impact"),
    // Estimated increase in property/asset value from this spend
    estimatedValueIncrease: numeric("estimated_value_increase", {
      precision: 18,
      scale: 2,
    }),
    // True if this expense is part of a refinance transaction
    refinanceRelated: text("refinance_related"), // "yes" | "no" | null — text avoids a boolean migration

    // ── Flex metadata ──────────────────────────────────────────────────────
    metadata: jsonb("metadata"),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("expenses_org_id_idx").on(table.orgId),
    index("expenses_asset_id_idx").on(table.assetId),
    index("expenses_client_id_idx").on(table.clientId),
    index("expenses_date_idx").on(table.date),
  ]
)

// ── Relations ─────────────────────────────────────────────────────────────────

export const expensesRelations = relations(expenses, ({ one }) => ({
  org: one(orgs, { fields: [expenses.orgId], references: [orgs.id] }),
  client: one(clients, { fields: [expenses.clientId], references: [clients.id] }),
  entity: one(entities, { fields: [expenses.entityId], references: [entities.id] }),
  asset: one(assets, { fields: [expenses.assetId], references: [assets.id] }),
  createdBy: one(users, { fields: [expenses.createdBy], references: [users.id] }),
}))

// ── Types ─────────────────────────────────────────────────────────────────────

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
