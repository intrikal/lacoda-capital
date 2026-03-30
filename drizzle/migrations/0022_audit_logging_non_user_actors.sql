-- Migration: 0022_audit_logging_non_user_actors
-- Purpose: Support audit log entries from non-user actors (API keys, portal tokens).
--
-- Changes:
--   1. Add "api_read" and "portal_accessed" to ledger_action enum
--   2. Add "stakeholder_portal" to ledger_target_type enum
--   3. Make ledger_events.actor_user_id nullable (was NOT NULL)
--      NULL actor_user_id means the action was performed by a system actor;
--      the actor identity is stored in the payload column instead.

-- 1. Extend ledger_action enum
ALTER TYPE "ledger_action" ADD VALUE IF NOT EXISTS 'api_read';
ALTER TYPE "ledger_action" ADD VALUE IF NOT EXISTS 'portal_accessed';

-- 2. Extend ledger_target_type enum
ALTER TYPE "ledger_target_type" ADD VALUE IF NOT EXISTS 'stakeholder_portal';

-- 3. Drop NOT NULL constraint on actor_user_id
ALTER TABLE "ledger_events" ALTER COLUMN "actor_user_id" DROP NOT NULL;
