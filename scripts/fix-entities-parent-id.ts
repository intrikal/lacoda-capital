/**
 * One-shot script to add the missing parent_id column to the entities table.
 * Run with: npx tsx scripts/fix-entities-parent-id.ts
 */
import pg from "pg"
import "dotenv/config"

const client = new pg.Client({ connectionString: process.env.DIRECT_URL })

async function main() {
  await client.connect()
  console.log("Connected to DB")

  await client.query(`
    ALTER TABLE entities
      ADD COLUMN IF NOT EXISTS parent_id uuid;
  `)
  console.log("✓ Added parent_id column to entities")

  await client.query(`
    CREATE INDEX IF NOT EXISTS entities_parent_id_idx
      ON entities USING btree (parent_id);
  `)
  console.log("✓ Created entities_parent_id_idx index")

  await client.end()
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
