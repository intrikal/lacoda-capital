/**
 * Applies all schema changes from migrations 0013 and 0014 that were never
 * applied to the database, using IF NOT EXISTS / IF NOT EXISTS guards so it
 * can be re-run safely.
 *
 * Run with: npx tsx scripts/apply-missing-schema.ts
 */
import pg from "pg"
import { config } from "dotenv"

config() // load .env
config({ path: ".env.local", override: true }) // override with .env.local if present

const client = new pg.Client({ connectionString: process.env.DIRECT_URL })

async function run(label: string, sql: string) {
  try {
    await client.query(sql)
    console.log(`✓ ${label}`)
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    // 42701 = duplicate column, 42P07 = relation already exists, 42710 = type already exists
    if (["42701", "42P07", "42710", "42P16"].includes(e.code ?? "")) {
      console.log(`  (already exists, skipping) ${label}`)
    } else {
      console.error(`✗ ${label}`)
      throw err
    }
  }
}

async function main() {
  await client.connect()
  console.log("Connected\n")

  // ── 0013: assets columns ───────────────────────────────────────────────────
  await run(
    "assets.committed_capital",
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS committed_capital numeric(18,2);`
  )
  await run(
    "assets.called_capital_cached",
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS called_capital_cached numeric(18,2) DEFAULT '0';`
  )
  await run(
    "assets.distributed_cached",
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS distributed_cached numeric(18,2) DEFAULT '0';`
  )

  // ── 0013: entities.parent_id (may already be done) ─────────────────────────
  await run(
    "entities.parent_id",
    `ALTER TABLE entities ADD COLUMN IF NOT EXISTS parent_id uuid;`
  )
  await run(
    "entities_parent_id_idx",
    `CREATE INDEX IF NOT EXISTS entities_parent_id_idx ON entities USING btree (parent_id);`
  )

  // ── 0013: new tables ───────────────────────────────────────────────────────
  await run(
    "capital_event_status enum",
    `DO $$ BEGIN
       CREATE TYPE capital_event_status AS ENUM('pending','paid','received','overdue');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "capital_event_type enum",
    `DO $$ BEGIN
       CREATE TYPE capital_event_type AS ENUM('capital_call','distribution','recallable');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "subscription_plan enum",
    `DO $$ BEGIN
       CREATE TYPE subscription_plan AS ENUM('free','starter','professional','enterprise');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "subscription_status enum",
    `DO $$ BEGIN
       CREATE TYPE subscription_status AS ENUM('trialing','active','past_due','cancelling','cancelled','unpaid');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "capital_events table",
    `CREATE TABLE IF NOT EXISTS capital_events (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
       asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
       org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
       event_type capital_event_type NOT NULL,
       amount numeric(18,2) NOT NULL,
       currency text DEFAULT 'USD' NOT NULL,
       event_date timestamptz NOT NULL,
       due_date timestamptz,
       status capital_event_status DEFAULT 'pending' NOT NULL,
       notes text,
       created_by uuid REFERENCES users(id) ON DELETE SET NULL,
       created_at timestamptz DEFAULT now() NOT NULL,
       updated_at timestamptz DEFAULT now() NOT NULL,
       deleted_at timestamptz
     );`
  )
  await run(
    "capital_events indexes",
    `CREATE INDEX IF NOT EXISTS capital_events_asset_id_idx ON capital_events USING btree (asset_id);
     CREATE INDEX IF NOT EXISTS capital_events_org_id_idx ON capital_events USING btree (org_id);`
  )
  await run(
    "subscriptions table",
    `CREATE TABLE IF NOT EXISTS subscriptions (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
       org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
       plan subscription_plan DEFAULT 'free' NOT NULL,
       status subscription_status DEFAULT 'trialing' NOT NULL,
       stripe_customer_id text,
       stripe_subscription_id text,
       stripe_price_id text,
       current_period_start timestamptz,
       current_period_end timestamptz,
       cancel_at_period_end text DEFAULT 'false',
       trial_end timestamptz,
       metadata jsonb DEFAULT '{}',
       created_at timestamptz DEFAULT now() NOT NULL,
       updated_at timestamptz DEFAULT now() NOT NULL
     );`
  )
  await run(
    "subscriptions_org_id_idx",
    `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_org_id_idx ON subscriptions USING btree (org_id);`
  )

  // ── 0014: beneficiary/transfer enums + tables ──────────────────────────────
  await run(
    "beneficiary_designation enum",
    `DO $$ BEGIN
       CREATE TYPE beneficiary_designation AS ENUM('primary','contingent');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "transfer_status enum",
    `DO $$ BEGIN
       CREATE TYPE transfer_status AS ENUM('pending','processing','completed','cancelled','failed');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "transfer_type enum",
    `DO $$ BEGIN
       CREATE TYPE transfer_type AS ENUM('deposit','withdrawal','transfer');
     EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  )
  await run(
    "beneficiaries table",
    `CREATE TABLE IF NOT EXISTS beneficiaries (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
       org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
       client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
       name text NOT NULL,
       relationship text NOT NULL,
       designation beneficiary_designation NOT NULL,
       percentage double precision DEFAULT 0 NOT NULL,
       accounts jsonb DEFAULT '[]',
       ssn_last4 text,
       date_of_birth text,
       phone text,
       email text,
       verified boolean DEFAULT false NOT NULL,
       created_at timestamptz DEFAULT now() NOT NULL,
       updated_at timestamptz DEFAULT now() NOT NULL,
       deleted_at timestamptz
     );`
  )
  await run(
    "transfers table",
    `CREATE TABLE IF NOT EXISTS transfers (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
       org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
       client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
       type transfer_type NOT NULL,
       amount double precision NOT NULL,
       from_account text NOT NULL,
       to_account text NOT NULL,
       status transfer_status DEFAULT 'pending' NOT NULL,
       frequency text DEFAULT 'One-time' NOT NULL,
       reference text,
       completed_at timestamptz,
       created_at timestamptz DEFAULT now() NOT NULL,
       updated_at timestamptz DEFAULT now() NOT NULL,
       deleted_at timestamptz
     );`
  )
  await run(
    "beneficiaries/transfers indexes",
    `CREATE INDEX IF NOT EXISTS beneficiaries_org_id_idx ON beneficiaries USING btree (org_id);
     CREATE INDEX IF NOT EXISTS beneficiaries_client_id_idx ON beneficiaries USING btree (client_id);
     CREATE INDEX IF NOT EXISTS transfers_org_id_idx ON transfers USING btree (org_id);
     CREATE INDEX IF NOT EXISTS transfers_client_id_idx ON transfers USING btree (client_id);`
  )

  await client.end()
  console.log("\nAll done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
