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

// ─── SAML Identity Providers Table ───────────────────────────────────────────

export const samlProviders = pgTable(
  "saml_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),

    /** Human-readable name: "Okta Production", "Azure AD", "Google Workspace" */
    name: text("name").notNull(),

    /** IdP type for UI presets */
    providerType: text("provider_type").notNull().default("custom"),
    // Values: "okta", "azure_ad", "google_workspace", "custom"

    /** The email domain(s) this IdP handles, e.g. ["acme.com", "acme.co.uk"] */
    domains: jsonb("domains").$type<string[]>().notNull().default([]),

    /** SAML metadata URL — fetched periodically to refresh certs */
    metadataUrl: text("metadata_url"),

    /** Raw SAML metadata XML (uploaded manually or fetched from URL) */
    metadataXml: text("metadata_xml"),

    /** Entity ID from the IdP metadata */
    entityId: text("entity_id"),

    /** SSO URL — where we redirect users for authentication */
    ssoUrl: text("sso_url"),

    /** IdP's X.509 certificate for verifying SAML assertions */
    certificate: text("certificate"),

    /**
     * Attribute mapping — maps IdP SAML attributes to our user fields.
     * e.g. { email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
     *         name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname",
     *         groups: "http://schemas.xmlsoap.org/claims/Group" }
     */
    attributeMapping: jsonb("attribute_mapping")
      .$type<SamlAttributeMapping>()
      .notNull()
      .default({
        email: "email",
        name: "displayName",
        groups: "groups",
      }),

    /**
     * Group → role mapping.
     * e.g. { "Admins": "admin", "Advisors": "assistant", "Clients": "client" }
     */
    groupRoleMapping: jsonb("group_role_mapping")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),

    /** Default role when no group mapping matches */
    defaultRole: text("default_role").notNull().default("client"),

    /** Whether SSO is enforced for this domain (blocks password login) */
    enforced: boolean("enforced").notNull().default(false),

    /** Whether this IdP config is active */
    enabled: boolean("enabled").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("saml_providers_org_id_idx").on(table.orgId),
    index("saml_providers_domains_idx").on(table.orgId),
  ]
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SamlAttributeMapping {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  groups?: string;
}

export const samlProvidersRelations = relations(samlProviders, ({ one }) => ({
  org: one(orgs, {
    fields: [samlProviders.orgId],
    references: [orgs.id],
  }),
}));

export type SamlProvider = typeof samlProviders.$inferSelect;
export type NewSamlProvider = typeof samlProviders.$inferInsert;
