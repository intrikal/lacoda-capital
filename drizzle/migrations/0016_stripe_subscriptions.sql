-- Migration: Add Stripe subscription billing tables
-- Supports self-serve plan selection, payment, and subscription management

-- Subscription plan tiers
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Subscription lifecycle statuses
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelling', 'cancelled', 'unpaid');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Subscriptions table: one row per org
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end TEXT DEFAULT 'false',
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_org_id_idx ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

-- Add billing-related ledger actions
ALTER TYPE ledger_action ADD VALUE IF NOT EXISTS 'subscription_created';
ALTER TYPE ledger_action ADD VALUE IF NOT EXISTS 'subscription_updated';
ALTER TYPE ledger_action ADD VALUE IF NOT EXISTS 'subscription_cancelled';
ALTER TYPE ledger_action ADD VALUE IF NOT EXISTS 'payment_succeeded';
ALTER TYPE ledger_action ADD VALUE IF NOT EXISTS 'payment_failed';
