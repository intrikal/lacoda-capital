import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { orgs } from "./orgs";
import { users } from "./users";

// ─── API Keys Table ──────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** Human-readable name for this key: "Production", "CI/CD", "Partner Integration" */
    name: text("name").notNull(),

    /**
     * SHA-256 hash of the raw API key.
     * The raw key (lch_xxxx...) is shown ONCE at creation, then only the hash is stored.
     * This is the same pattern as GitHub personal access tokens.
     */
    keyHash: text("key_hash").notNull().unique(),

    /** First 8 characters of the key for display: "lch_ab12..." */
    keyPrefix: text("key_prefix").notNull(),

    /** Who created this key */
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    /** Optional expiration date */
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    /** Last time this key was used for an API request */
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

    /** Whether the key has been revoked */
    revoked: boolean("revoked").notNull().default(false),

    /** When the key was revoked */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    /** Number of requests made with this key (for analytics) */
    requestCount: integer("request_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("api_keys_org_id_idx").on(table.orgId),
    index("api_keys_key_hash_idx").on(table.keyHash),
    index("api_keys_created_by_idx").on(table.createdBy),
  ]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  org: one(orgs, {
    fields: [apiKeys.orgId],
    references: [orgs.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
