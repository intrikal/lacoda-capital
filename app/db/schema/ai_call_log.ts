import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";

import { orgs } from "./orgs";
import { users } from "./users";

// ============================================================================
// AI Call Log — Tracks every AI agent invocation for audit & cost monitoring
// ============================================================================

export const aiCallLog = pgTable(
  "ai_call_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** Which agent made the call: 'extraction' | 'narrative' | 'email_draft' | 'alert_digest' */
    agentType: text("agent_type").notNull(),

    /** SHA-256 hash of the input for deduplication and cache lookup */
    inputHash: text("input_hash").notNull(),

    /** Human-readable summary of the input */
    inputSummary: text("input_summary"),

    /** Full structured output from Claude */
    output: jsonb("output").notNull().default({}),

    /** API call latency in milliseconds */
    latencyMs: integer("latency_ms").notNull(),

    /** Model identifier, e.g. 'claude-sonnet-4-20250514' */
    modelVersion: text("model_version").notNull(),

    /** Total tokens used (input + output) */
    tokenCount: integer("token_count"),

    /** Input tokens */
    inputTokens: integer("input_tokens"),

    /** Output tokens */
    outputTokens: integer("output_tokens"),

    /** Estimated cost in USD */
    costEstimate: numeric("cost_estimate", { precision: 10, scale: 4 }),

    /** 'success' | 'error' | 'timeout' */
    status: text("status").notNull().default("success"),

    /** Error details if status != 'success' */
    errorMessage: text("error_message"),

    /** Who triggered the AI call */
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** ID of the document/report/request being processed */
    targetId: text("target_id"),

    /** 'document' | 'report' | 'document_request' | 'digest' */
    targetType: text("target_type"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_call_log_org_id_idx").on(table.orgId),
    index("ai_call_log_created_at_idx").on(table.createdAt),
    index("ai_call_log_agent_type_idx").on(table.agentType),
    index("ai_call_log_input_hash_idx").on(table.inputHash),
  ]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const aiCallLogRelations = relations(aiCallLog, ({ one }) => ({
  org: one(orgs, {
    fields: [aiCallLog.orgId],
    references: [orgs.id],
  }),
  actorUser: one(users, {
    fields: [aiCallLog.actorUserId],
    references: [users.id],
  }),
}));

// ─── Types ──────────────────────────────────────────────────────────────────

export type AiCallLog = typeof aiCallLog.$inferSelect;
export type NewAiCallLog = typeof aiCallLog.$inferInsert;
