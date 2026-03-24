-- Migration: Stakeholder portals for external read-only access
-- Feature: Shareable portal URLs with magic-link auth and visibility config

CREATE TABLE IF NOT EXISTS "stakeholder_portals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "visibility" jsonb NOT NULL DEFAULT '{"assets":true,"documents":false,"reports":false,"entities":true,"valuations":true}'::jsonb,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stakeholder_portals_org_id_idx" ON "stakeholder_portals" ("org_id");
CREATE INDEX IF NOT EXISTS "stakeholder_portals_client_id_idx" ON "stakeholder_portals" ("client_id");
CREATE INDEX IF NOT EXISTS "stakeholder_portals_token_idx" ON "stakeholder_portals" ("token");
