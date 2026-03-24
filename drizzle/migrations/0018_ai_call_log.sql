-- Migration: 0018_ai_call_log
-- Purpose: Create the ai_call_log table for tracking every AI agent invocation
-- This table stores input hashes, outputs, latency, model versions, token counts,
-- and cost estimates for audit, debugging, and cost monitoring.

CREATE TABLE IF NOT EXISTS "ai_call_log" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "agent_type"      text NOT NULL,           -- 'extraction' | 'narrative' | 'email_draft' | 'alert_digest'
  "input_hash"      text NOT NULL,           -- SHA-256 hash of the input for deduplication
  "input_summary"   text,                    -- Human-readable summary of what was sent
  "output"          jsonb NOT NULL DEFAULT '{}', -- The full structured output from Claude
  "latency_ms"      integer NOT NULL,        -- How long the API call took
  "model_version"   text NOT NULL,           -- e.g. 'claude-sonnet-4-20250514'
  "token_count"     integer,                 -- Total tokens used (input + output)
  "input_tokens"    integer,                 -- Input tokens
  "output_tokens"   integer,                 -- Output tokens
  "cost_estimate"   numeric(10, 4),          -- Estimated cost in USD
  "status"          text NOT NULL DEFAULT 'success', -- 'success' | 'error' | 'timeout'
  "error_message"   text,                    -- Error details if status != 'success'
  "actor_user_id"   uuid REFERENCES "users"("id") ON DELETE SET NULL, -- Who triggered the call
  "target_id"       text,                    -- ID of the document/report/request being processed
  "target_type"     text,                    -- 'document' | 'report' | 'document_request' | 'digest'
  "created_at"      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "ai_call_log_org_id_idx" ON "ai_call_log" ("org_id");
CREATE INDEX IF NOT EXISTS "ai_call_log_created_at_idx" ON "ai_call_log" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_call_log_agent_type_idx" ON "ai_call_log" ("agent_type");
CREATE INDEX IF NOT EXISTS "ai_call_log_input_hash_idx" ON "ai_call_log" ("input_hash");
