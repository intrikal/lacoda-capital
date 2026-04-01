-- Migration: 0023_contact_submissions
-- Purpose: Store inbound marketing form submissions (contact page + demo booking).
--
-- Used as:
--   1. A permanent audit record of every inquiry regardless of email config.
--   2. The sole delivery mechanism when CONTACT_FORM_EMAIL / Resend is not set.

CREATE TYPE "contact_submission_type" AS ENUM ('contact', 'demo');

CREATE TABLE "contact_submissions" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"           contact_submission_type NOT NULL,
  "first_name"     text NOT NULL,
  "last_name"      text NOT NULL,
  "email"          text NOT NULL,
  "company"        text,
  -- contact-specific
  "subject"        text,
  "reason"         text,
  "message"        text,
  -- demo-specific
  "aum"            text,
  "role"           text,
  "preferred_date" text,
  "preferred_time" text,
  "metadata"       jsonb DEFAULT '{}'::jsonb,
  "created_at"     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "contact_submissions_email_idx"      ON "contact_submissions" ("email");
CREATE INDEX "contact_submissions_type_idx"       ON "contact_submissions" ("type");
CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions" ("created_at");
