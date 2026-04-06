import { relations } from "drizzle-orm"
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { kycStatusEnum, kycTierEnum, amlStatusEnum } from "./00_enums"
import { orgs } from "./orgs"
import { clients } from "./clients"
import { users } from "./users"

/**
 * KYC Records Table  (Know Your Customer / Anti-Money Laundering)
 *
 * Captures the full regulatory due-diligence record for each client:
 *
 *   KYC (Know Your Customer)
 *   ─────────────────────────
 *   Identity verification — government ID, passport, proof of address
 *   Beneficial ownership  — who ultimately owns/controls the account
 *   Source of funds       — documented explanation of wealth origin
 *
 *   AML (Anti-Money Laundering)
 *   ────────────────────────────
 *   Sanctions screening   — OFAC, EU, UN watchlists
 *   PEP screening         — Politically Exposed Person flag
 *   Adverse media         — negative news search results
 *   Ongoing monitoring    — periodic re-screening on a cadence
 *
 * One record per client per org (unique constraint).
 * Soft audit trail: updates are tracked via updatedAt + the ledger_events table.
 *
 * Regulatory note:
 *   BSA/AML programs (31 CFR Part 1020) require financial firms to:
 *   1. Identify and verify customers (CIP)
 *   2. Understand the nature of the customer relationship
 *   3. Perform ongoing monitoring
 *   4. File SARs when suspicious activity is detected
 *
 *   This table stores the state of those checks.
 *   Document evidence lives in the documents table (KYC document type).
 */
export const kycRecords = pgTable(
  "kyc_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ── Tenant isolation ───────────────────────────────────────────────────
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    // ── Subject ────────────────────────────────────────────────────────────
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // ── Reviewer / assigned compliance officer ─────────────────────────────
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),

    // ── KYC status & tier ─────────────────────────────────────────────────
    status: kycStatusEnum("status").notNull().default("not_started"),
    tier: kycTierEnum("tier").notNull().default("standard"),

    // ── Identity verification ─────────────────────────────────────────────
    identityVerified: boolean("identity_verified").notNull().default(false),
    identityVerifiedAt: timestamp("identity_verified_at", { withTimezone: true }),
    identityDocumentType: text("identity_document_type"), // "passport" | "drivers_license" | "national_id"
    identityDocumentExpiry: timestamp("identity_document_expiry", { withTimezone: true }),

    // ── Beneficial ownership ──────────────────────────────────────────────
    beneficialOwnershipVerified: boolean("beneficial_ownership_verified")
      .notNull()
      .default(false),
    beneficialOwnershipNotes: text("beneficial_ownership_notes"),

    // ── Source of funds ───────────────────────────────────────────────────
    sourceOfFundsVerified: boolean("source_of_funds_verified")
      .notNull()
      .default(false),
    sourceOfFundsDescription: text("source_of_funds_description"),

    // ── AML screening ─────────────────────────────────────────────────────
    amlStatus: amlStatusEnum("aml_status").notNull().default("not_screened"),
    amlScreenedAt: timestamp("aml_screened_at", { withTimezone: true }),
    amlRiskScore: integer("aml_risk_score"), // 0–100; higher = more risk

    // ── PEP / Sanctions ───────────────────────────────────────────────────
    // PEP = Politically Exposed Person (foreign officials, family members, associates)
    pepStatus: boolean("pep_status").notNull().default(false),
    sanctionsMatch: boolean("sanctions_match").notNull().default(false),
    adverseMediaFlag: boolean("adverse_media_flag").notNull().default(false),

    // ── Ongoing monitoring ────────────────────────────────────────────────
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewDue: timestamp("next_review_due", { withTimezone: true }),
    reviewFrequencyDays: integer("review_frequency_days").default(365), // annual by default

    // ── Compliance notes & flex data ──────────────────────────────────────
    notes: text("notes"),
    metadata: jsonb("metadata"), // SAR references, screening provider details, etc.

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
    // One KYC record per client per org
    unique("kyc_records_org_client_unique").on(table.orgId, table.clientId),
    index("kyc_records_org_id_idx").on(table.orgId),
    index("kyc_records_client_id_idx").on(table.clientId),
    index("kyc_records_status_idx").on(table.status),
    index("kyc_records_aml_status_idx").on(table.amlStatus),
    index("kyc_records_next_review_idx").on(table.nextReviewDue),
  ]
)

// ── Relations ─────────────────────────────────────────────────────────────────

export const kycRecordsRelations = relations(kycRecords, ({ one }) => ({
  org: one(orgs, { fields: [kycRecords.orgId], references: [orgs.id] }),
  client: one(clients, { fields: [kycRecords.clientId], references: [clients.id] }),
  assignedTo: one(users, { fields: [kycRecords.assignedTo], references: [users.id] }),
}))

// ── Types ─────────────────────────────────────────────────────────────────────

export type KycRecord = typeof kycRecords.$inferSelect
export type NewKycRecord = typeof kycRecords.$inferInsert
