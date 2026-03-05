/**
 * ============================================================================
 * FILE: app/db/schema/insurance_policies.ts
 * ============================================================================
 *
 * Drizzle ORM table definition for insurance policies.
 *
 * An insurance policy tracks coverage details for a client — homeowners, auto,
 * life, umbrella, liability, health, business, or property insurance.
 *
 * Scoped to an org (multi-tenant) with an optional link to a specific client.
 *
 * KEY DESIGN DECISIONS:
 *   - doublePrecision for financial amounts (coverageAmount, deductible, premium)
 *   - Dates as text "YYYY-MM-DD" to avoid timezone drift
 *   - coveredAssets / beneficiaries stored as JSONB string arrays
 *   - agent info stored as JSONB object {name, phone, email}
 *
 * CONSUMERS:
 *   - lib/graphql/resolvers/insurance-policy.ts
 *   - lib/hooks/crud/use-insurance-policies.ts
 *   - app/(dashboard)/app/insurance/page.tsx
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
import { policyTypeEnum, policyStatusEnum, premiumFrequencyEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// ─── TYPES ──────────────────────────────────────────────────────────────────

/** Shape of the agent JSONB column */
export interface InsuranceAgent {
  name: string;
  phone: string;
  email: string;
}

/** Shape of the extensible metadata JSONB column */
export interface InsurancePolicyMetadata {
  [key: string]: unknown;
}

// ─── TABLE ──────────────────────────────────────────────────────────────────

export const insurancePolicies = pgTable(
  "insurance_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Multi-tenancy anchor */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** Optional link to a specific client */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    /** Human-readable policy name, e.g. "Manhattan Penthouse - Homeowners" */
    name: text("name").notNull(),

    /** Type of insurance coverage */
    policyType: policyTypeEnum("policy_type").notNull().default("home"),

    /** Current state of the policy */
    status: policyStatusEnum("status").notNull().default("active"),

    /** Insurance company name */
    provider: text("provider").notNull(),

    /** Provider's policy reference number */
    policyNumber: text("policy_number").notNull(),

    /** Total coverage amount in dollars */
    coverageAmount: doublePrecision("coverage_amount").notNull().default(0),

    /** Deductible amount in dollars */
    deductible: doublePrecision("deductible").notNull().default(0),

    /** Premium payment amount */
    premium: doublePrecision("premium").notNull().default(0),

    /** How often premiums are paid */
    premiumFrequency: premiumFrequencyEnum("premium_frequency")
      .notNull()
      .default("annual"),

    /** When coverage begins — ISO "YYYY-MM-DD" */
    effectiveDate: text("effective_date").notNull(),

    /** When coverage ends — ISO "YYYY-MM-DD" */
    expirationDate: text("expiration_date").notNull(),

    /** Assets covered by this policy (string array) */
    coveredAssets: jsonb("covered_assets").$type<string[]>().default([]),

    /** Policy beneficiaries (string array) */
    beneficiaries: jsonb("beneficiaries").$type<string[]>().default([]),

    /** Insurance agent contact info */
    agent: jsonb("agent").$type<InsuranceAgent | null>().default(null),

    /** Free-form notes */
    notes: text("notes"),

    /** Extensible JSON for future fields */
    metadata: jsonb("metadata").$type<InsurancePolicyMetadata>().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("insurance_policies_org_id_idx").on(table.orgId),
    index("insurance_policies_client_id_idx").on(table.clientId),
    index("insurance_policies_status_idx").on(table.status),
    index("insurance_policies_policy_type_idx").on(table.policyType),
  ]
);

// ─── RELATIONS ──────────────────────────────────────────────────────────────

export const insurancePoliciesRelations = relations(insurancePolicies, ({ one }) => ({
  org: one(orgs, {
    fields: [insurancePolicies.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [insurancePolicies.clientId],
    references: [clients.id],
  }),
}));

// ─── INFERRED TYPES ─────────────────────────────────────────────────────────

export type InsurancePolicy = typeof insurancePolicies.$inferSelect;
export type NewInsurancePolicy = typeof insurancePolicies.$inferInsert;
