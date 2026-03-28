import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { orgs } from "./orgs";
import { clients } from "./clients";
import { users } from "./users";

// ─── Stakeholder Portals Table ───────────────────────────────────────────────

export const stakeholderPortals = pgTable(
  "stakeholder_portals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** The client this portal is for */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    /** Human-readable label: "Smith Family Advisory Portal" */
    name: text("name").notNull(),

    /**
     * Unique, non-guessable token used in the portal URL.
     * Format: 32-byte random hex (64 chars).
     * URL: /portal/{token}
     */
    token: text("token").notNull().unique(),

    /** What sections are visible to external users */
    visibility: jsonb("visibility")
      .$type<PortalVisibility>()
      .notNull()
      .default({
        assets: true,
        documents: false,
        reports: false,
        entities: true,
        valuations: true,
      }),

    /** Who created this portal */
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "set null" }),

    /** Whether the portal is currently active */
    enabled: boolean("enabled").notNull().default(true),

    /** Optional expiration date for the portal link */
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("stakeholder_portals_org_id_idx").on(table.orgId),
    index("stakeholder_portals_client_id_idx").on(table.clientId),
    index("stakeholder_portals_token_idx").on(table.token),
  ]
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PortalVisibility {
  assets?: boolean;
  documents?: boolean;
  reports?: boolean;
  entities?: boolean;
  valuations?: boolean;
}

export const stakeholderPortalsRelations = relations(
  stakeholderPortals,
  ({ one }) => ({
    org: one(orgs, {
      fields: [stakeholderPortals.orgId],
      references: [orgs.id],
    }),
    client: one(clients, {
      fields: [stakeholderPortals.clientId],
      references: [clients.id],
    }),
    creator: one(users, {
      fields: [stakeholderPortals.createdBy],
      references: [users.id],
    }),
  })
);

export type StakeholderPortal = typeof stakeholderPortals.$inferSelect;
export type NewStakeholderPortal = typeof stakeholderPortals.$inferInsert;
