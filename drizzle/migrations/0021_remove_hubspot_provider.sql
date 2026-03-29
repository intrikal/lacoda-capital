-- Migration: Remove "hubspot" from integration_provider enum
-- HubSpot has been removed from the integration plan; Salesforce covers enterprise CRM.
--
-- PostgreSQL does not support DROP VALUE on an enum directly.
-- The standard approach is:
--   1. Create a new enum with the desired values
--   2. Alter the column(s) to use the new enum (casting via text)
--   3. Drop the old enum
--   4. Rename the new enum to the original name

-- Step 1: Create replacement enum (without "hubspot")
CREATE TYPE "integration_provider_new" AS ENUM (
  'stripe',
  'plaid',
  'docusign',
  'quickbooks',
  'google_drive',
  'dropbox',
  'salesforce',
  'other'
);

-- Step 2: Migrate any existing "hubspot" rows to "other" before changing the type
UPDATE "integrations"
SET "provider" = 'other'
WHERE "provider" = 'hubspot';

-- Step 3: Alter the column to use the new enum (cast through text)
ALTER TABLE "integrations"
  ALTER COLUMN "provider" TYPE "integration_provider_new"
  USING "provider"::text::"integration_provider_new";

-- Step 4: Drop the old enum
DROP TYPE "integration_provider";

-- Step 5: Rename the new enum to the canonical name
ALTER TYPE "integration_provider_new" RENAME TO "integration_provider";
