-- Migration: Data portability and GDPR account deletion
-- Adds deletion_requests table for 30-day grace period account deletion

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS deletion_requests_user_id_idx ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS deletion_requests_scheduled_for_idx ON deletion_requests(scheduled_for);
