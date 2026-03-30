/**
 * ============================================================================
 * FILE: app/db/schema/beneficiaries.ts
 * ============================================================================
 *
 * Drizzle ORM table definition for beneficiary designations (estate planning).
 *
 * A "beneficiary" is a person or entity designated to receive assets from
 * a client's accounts upon their passing. Each beneficiary has a designation
 * (primary or contingent) and a percentage allocation.
 *
 * TABLE: beneficiaries
 *   One row per beneficiary per client. Scoped to an org (multi-tenant).
 *   Every beneficiary MUST belong to a client (clientId is NOT NULL).
 *
 * KEY DESIGN DECISIONS:
 *   - orgId (required):       Multi-tenancy anchor, cascades on delete.
 *   - clientId (required):    Every beneficiary belongs to a client.
 *   - designation enum:       primary | contingent (DB-enforced).
 *   - percentage:             Double precision (must sum to 100 per designation).
 *   - accounts jsonb:         Array of account name strings this beneficiary covers.
 *   - verified boolean:       Whether compliance has verified identity.
 *   - Soft deletes:           deletedAt timestamp (NULL = active row).
 *
 * RELATIONS:
 *   beneficiaries -> orgs    (many-to-one: each beneficiary belongs to one org)
 *   beneficiaries -> clients (many-to-one: each beneficiary belongs to one client)
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { beneficiaryDesignationEnum } from "./00_enums";
import { orgs } from "./orgs";
import { clients } from "./clients";

// --- TABLE -----------------------------------------------------------------

export const beneficiaries = pgTable(
  "beneficiaries",
  {
    /** id -- Primary key. Auto-generated UUID. */
    id: uuid("id").primaryKey().defaultRandom(),

    /** orgId -- Multi-tenancy anchor. Cascades on delete. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** clientId -- Every beneficiary belongs to a client. Cascades on delete. */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /** name -- Full legal name of the beneficiary. */
    name: text("name").notNull(),

    /** relationship -- Relationship to account holder (e.g. "Spouse", "Child", "Trust"). */
    relationship: text("relationship").notNull(),

    /** designation -- Primary or contingent. */
    designation: beneficiaryDesignationEnum("designation").notNull(),

    /** percentage -- Share of assets to receive (must sum to 100 per designation group). */
    percentage: doublePrecision("percentage").notNull().default(0),

    /** accounts -- JSONB array of account names this beneficiary is assigned to. */
    accounts: jsonb("accounts").$type<string[]>().default([]),

    /** ssnLast4 -- Last four digits of SSN for identity verification. */
    ssnLast4: text("ssn_last4"),

    /** dateOfBirth -- ISO date string (YYYY-MM-DD). */
    dateOfBirth: text("date_of_birth"),

    /** phone -- Contact phone number. */
    phone: text("phone"),

    /** email -- Contact email address. */
    email: text("email"),

    /** verified -- Whether compliance has verified this beneficiary's identity. */
    verified: boolean("verified").notNull().default(false),

    /** createdAt / updatedAt -- Standard audit timestamps. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Soft delete -- NULL = active row. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("beneficiaries_org_id_idx").on(table.orgId),
    index("beneficiaries_client_id_idx").on(table.clientId),
    index("beneficiaries_designation_idx").on(table.designation),
  ]
);

// --- RELATIONS -------------------------------------------------------------

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  org: one(orgs, {
    fields: [beneficiaries.orgId],
    references: [orgs.id],
  }),
  client: one(clients, {
    fields: [beneficiaries.clientId],
    references: [clients.id],
  }),
}));

// --- TYPES -----------------------------------------------------------------

/** Beneficiary -- TypeScript type inferred from the Drizzle table definition. */
export type BeneficiaryRecord = typeof beneficiaries.$inferSelect;

/** NewBeneficiary -- TypeScript type for inserting a new row. */
export type NewBeneficiary = typeof beneficiaries.$inferInsert;
