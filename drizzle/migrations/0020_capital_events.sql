-- Migration: 0020_capital_events
-- Purpose: Capital call and distribution tracking for PE/VC assets.
-- Creates capital_events table and adds PE-specific cached columns to assets.

-- New enums
DO $$ BEGIN
  CREATE TYPE "capital_event_type" AS ENUM ('capital_call', 'distribution', 'recallable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "capital_event_status" AS ENUM ('pending', 'paid', 'received', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add notification types for capital events
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'capital_call_due';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'capital_call_overdue';

-- Capital events table
CREATE TABLE IF NOT EXISTS "capital_events" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "asset_id"        uuid NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "org_id"          uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "event_type"      capital_event_type NOT NULL,
  "amount"          numeric(18, 2) NOT NULL,
  "currency"        text NOT NULL DEFAULT 'USD',
  "event_date"      timestamptz NOT NULL,
  "due_date"        timestamptz,
  "status"          capital_event_status NOT NULL DEFAULT 'pending',
  "notes"           text,
  "created_by"      uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now(),
  "deleted_at"      timestamptz
);

CREATE INDEX IF NOT EXISTS "capital_events_asset_id_idx" ON "capital_events" ("asset_id");
CREATE INDEX IF NOT EXISTS "capital_events_org_id_idx" ON "capital_events" ("org_id");
CREATE INDEX IF NOT EXISTS "capital_events_status_idx" ON "capital_events" ("status");
CREATE INDEX IF NOT EXISTS "capital_events_due_date_idx" ON "capital_events" ("due_date") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "capital_events_event_date_idx" ON "capital_events" ("event_date");

-- Add PE-specific cached columns to assets
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "committed_capital" numeric(18, 2);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "called_capital_cached" numeric(18, 2) DEFAULT 0;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "distributed_cached" numeric(18, 2) DEFAULT 0;
