-- Migration: 0019_exchange_rates
-- Purpose: Create exchange_rates table for multi-currency consolidation.
-- Stores manually-entered exchange rates with effective dates.

CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "from_currency"   text NOT NULL,           -- ISO 4217 code, e.g. "EUR"
  "to_currency"     text NOT NULL,           -- ISO 4217 code, e.g. "USD"
  "rate"            numeric(18, 8) NOT NULL,  -- Exchange rate (high precision)
  "effective_date"  timestamptz NOT NULL,     -- Date this rate is effective from
  "source"          text DEFAULT 'manual',    -- 'manual' | 'api' | 'import'
  "created_by"      uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient rate lookups
CREATE INDEX IF NOT EXISTS "exchange_rates_org_id_idx" ON "exchange_rates" ("org_id");
CREATE INDEX IF NOT EXISTS "exchange_rates_pair_date_idx" ON "exchange_rates" ("from_currency", "to_currency", "effective_date" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_unique_pair_date_idx" ON "exchange_rates" ("org_id", "from_currency", "to_currency", "effective_date");
