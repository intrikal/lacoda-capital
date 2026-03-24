-- Migration: Plaid & DocuSign Integration Support
-- Adds sync_history JSONB to integrations table for tracking sync events,
-- and adds a pg_cron schedule for daily Plaid balance refresh.

-- ============================================================================
-- 1. Add sync_history column to integrations table
-- ============================================================================
-- Stores an array of sync event objects:
-- [{ "timestamp": "...", "status": "success"|"failed", "accounts": 3, "error": null }]
ALTER TABLE "integrations"
  ADD COLUMN IF NOT EXISTS "sync_history" jsonb DEFAULT '[]'::jsonb;

-- ============================================================================
-- 2. Add envelope_id tracking for DocuSign to document_requests
-- ============================================================================
-- When a document request is sent for signature via DocuSign, store the
-- envelope ID so we can correlate webhook events back to the request.
ALTER TABLE "document_requests"
  ADD COLUMN IF NOT EXISTS "docusign_envelope_id" text;

-- Index for fast webhook lookups by envelope ID
CREATE INDEX IF NOT EXISTS "idx_doc_requests_envelope_id"
  ON "document_requests" ("docusign_envelope_id")
  WHERE "docusign_envelope_id" IS NOT NULL;

-- ============================================================================
-- 3. Add source tracking to valuations for API feeds
-- ============================================================================
-- Allow distinguishing manual valuations from automated Plaid balance syncs.
-- The source column already exists (added in a prior migration) but we ensure
-- 'api_feed' is a recognized value by convention (text column, not enum).

-- ============================================================================
-- 4. Daily Plaid balance sync via pg_cron (Supabase)
-- ============================================================================
-- This creates a cron job that calls our sync-balances Edge Function daily.
-- NOTE: pg_cron must be enabled in your Supabase project settings.
-- The Edge Function URL uses the SUPABASE_URL environment variable.
--
-- To enable manually in Supabase SQL Editor:
-- SELECT cron.schedule(
--   'daily-plaid-balance-sync',
--   '0 6 * * *',  -- 6:00 AM UTC daily
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-balances',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{"mode": "scheduled"}'::jsonb
--   );
--   $$
-- );
