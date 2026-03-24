-- Migration: SAML SSO providers and API keys
-- Feature: Enterprise SSO (SAML 2.0) + Public REST API with key management

-- ─── SAML Identity Providers ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "saml_providers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "provider_type" text NOT NULL DEFAULT 'custom',
  "domains" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "metadata_url" text,
  "metadata_xml" text,
  "entity_id" text,
  "sso_url" text,
  "certificate" text,
  "attribute_mapping" jsonb NOT NULL DEFAULT '{"email":"email","name":"displayName","groups":"groups"}'::jsonb,
  "group_role_mapping" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "default_role" text NOT NULL DEFAULT 'client',
  "enforced" boolean NOT NULL DEFAULT false,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "saml_providers_org_id_idx" ON "saml_providers" ("org_id");

-- ─── API Keys ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "key_prefix" text NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "revoked" boolean NOT NULL DEFAULT false,
  "revoked_at" timestamp with time zone,
  "request_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "api_keys_org_id_idx" ON "api_keys" ("org_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_created_by_idx" ON "api_keys" ("created_by");
