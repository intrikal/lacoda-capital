/**
 * ============================================================================
 * TEST FILE: ledger-event.schema.test.ts
 * ============================================================================
 *
 * Kevin, this is a TEST FILE. Let's break down what that means:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS A TEST?                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ A test is a piece of code that CHECKS whether other code works         │
 * │ correctly. Think of it like a quality inspector on a factory line:     │
 * │                                                                        │
 * │   1. You build a widget (write code)                                   │
 * │   2. The inspector checks it (test runs)                               │
 * │   3. If it's good → GREEN CHECKMARK (✓ pass)                          │
 * │   4. If it's bad  → RED X (× fail)                                    │
 * │                                                                        │
 * │ WHY BOTHER?                                                            │
 * │   Without tests, you'd have to manually check every feature after     │
 * │   every change. With 25+ database tables, that's impossible.          │
 * │   Tests do it automatically in seconds.                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS VITEST?                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Vitest is a TEST RUNNER — a program that:                              │
 * │   1. Finds all files ending in .test.ts                                │
 * │   2. Runs each test function                                           │
 * │   3. Reports pass/fail results                                         │
 * │                                                                        │
 * │ It's configured in vitest.config.ts at the project root.              │
 * │ To run tests: `npx vitest run --project unit`                          │
 * │                                                                        │
 * │ KEY FUNCTIONS:                                                         │
 * │   describe("group name", () => { ... })                                │
 * │     Groups related tests together. Like a chapter in a book.           │
 * │                                                                        │
 * │   it("should do X", () => { ... })                                     │
 * │     One individual test. The string describes what you're checking.    │
 * │     "it" reads like English: "it has the correct table name"           │
 * │                                                                        │
 * │   expect(value).toBe(expected)                                         │
 * │     The ASSERTION — "I expect this value to be equal to this."         │
 * │     If they don't match, the test FAILS.                               │
 * │                                                                        │
 * │ EXAMPLE:                                                               │
 * │   it("1 + 1 equals 2", () => {                                        │
 * │     expect(1 + 1).toBe(2)  // PASS ✓                                  │
 * │   })                                                                   │
 * │   it("1 + 1 equals 3", () => {                                        │
 * │     expect(1 + 1).toBe(3)  // FAIL × (1 + 1 is 2, not 3)             │
 * │   })                                                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT DOES THIS FILE TEST?                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This file tests the ledger_events table — our IMMUTABLE AUDIT LOG.    │
 * │                                                                        │
 * │ The ledger is the CORE COMPLIANCE PROMISE of the entire platform:     │
 * │   - Every action is recorded (WHO did WHAT to WHICH thing)             │
 * │   - Records can NEVER be updated or deleted                            │
 * │   - This is enforced at BOTH the schema level AND RLS policy level     │
 * │                                                                        │
 * │ We test:                                                               │
 * │   1. The Drizzle schema has the right columns and constraints          │
 * │   2. There is NO updated_at or deleted_at (append-only)                │
 * │   3. The Zod validation schema rejects bad input                       │
 * │   4. No "update" schema exists (you can't update audit records)        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/db/schema/ledger_events.ts     — The Drizzle table definition
 *   lib/validations/ledger-event.schema.ts — The Zod validation schema
 *   drizzle/migrations/0012_rls_policies.sql — RLS: INSERT+SELECT only
 */

/**
 * import { describe, it, expect } from "vitest"
 *
 * WHAT: Imports the three core testing functions from Vitest.
 * WHY:  These are the building blocks of every test:
 *       - describe = group related tests
 *       - it = define one test
 *       - expect = make an assertion ("I expect X to be Y")
 */
import { describe, it, expect } from "vitest"

/**
 * import { createLedgerEventSchema, ledgerActionEnum, ledgerTargetTypeEnum }
 *   from "@/lib/validations/ledger-event.schema"
 *
 * WHAT: Imports the Zod validation schema for creating ledger events.
 * WHY:  We want to test that the validation correctly accepts good input
 *       and rejects bad input BEFORE it ever hits the database.
 *
 *       Also imports the enum definitions so we can loop through ALL
 *       valid action types and target types automatically.
 */
import {
  createLedgerEventSchema,
  ledgerActionEnum,
  ledgerTargetTypeEnum,
} from "@/lib/validations/ledger-event.schema"

/**
 * import { ledgerEvents } from "@/app/db/schema/ledger_events"
 *
 * WHAT: Imports the Drizzle table definition for ledger_events.
 * WHY:  We use getTableConfig() below to INSPECT this table's structure
 *       and verify it has the correct columns, constraints, and indexes.
 *       This is like X-raying the table definition.
 */
import { ledgerEvents } from "@/app/db/schema/ledger_events"

/**
 * import { getTableConfig } from "drizzle-orm/pg-core"
 *
 * WHAT: A Drizzle utility that extracts the full configuration of a table.
 * WHY:  It returns an object with:
 *       - .name       → the table name (e.g., "ledger_events")
 *       - .columns    → array of all columns with their types and constraints
 *       - .indexes    → array of all indexes defined on the table
 *       - .foreignKeys → array of all foreign key constraints
 *
 *       This lets us programmatically check that the schema is correct
 *       without needing a running database.
 */
import { getTableConfig } from "drizzle-orm/pg-core"

// ============================================================================
// TEST GROUP 1: Drizzle Schema Structure
// ============================================================================
// These tests inspect the actual Drizzle table definition to verify that
// the ledger_events table has the correct columns, constraints, and indexes.
// They run WITHOUT a database — they just examine the JavaScript schema object.

describe("ledger_events — Drizzle schema structure", () => {
  /**
   * getTableConfig() extracts the full schema configuration from the
   * Drizzle table object. We store it in `config` so every test below
   * can inspect it.
   *
   * config.columns is an array like:
   *   [
   *     { name: "id", notNull: true, ... },
   *     { name: "org_id", notNull: true, ... },
   *     { name: "actor_user_id", notNull: true, ... },
   *     ...
   *   ]
   */
  const config = getTableConfig(ledgerEvents)

  /**
   * TEST: Verify the table is named "ledger_events" in the database.
   *
   * expect(config.name).toBe("ledger_events")
   *   "I expect the table name to be exactly 'ledger_events'"
   *   If someone accidentally renamed it, this test catches it.
   */
  it("has the correct table name", () => {
    expect(config.name).toBe("ledger_events")
  })

  /**
   * TEST: Verify all required columns exist.
   *
   * expect.arrayContaining([...]) means:
   *   "The array must contain AT LEAST these items (in any order)"
   *   Extra columns are fine — we just check the required ones are there.
   *
   * WHY THIS MATTERS:
   *   If someone accidentally deletes a column from the schema, this
   *   test will catch it immediately instead of waiting for a runtime error.
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "org_id",
        "actor_user_id",
        "target_type",
        "target_id",
        "action",
        "payload",
        "ip_address",
        "created_at",
      ])
    )
  })

  /**
   * TEST: actor_user_id must be NOT NULL.
   *
   * WHY THIS IS CRITICAL:
   *   For compliance, every audit event MUST record WHO did it.
   *   If actor_user_id were nullable, we could end up with
   *   "someone deleted all client data" with no record of who.
   *   That would be a compliance nightmare.
   *
   * HOW WE CHECK:
   *   1. Find the column named "actor_user_id" in the config
   *   2. Check that .notNull is true
   */
  it("actor_user_id is NOT NULL (required for compliance)", () => {
    const col = config.columns.find((c) => c.name === "actor_user_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: action must be NOT NULL.
   *
   * Every audit event must say WHAT happened (e.g., "created", "deleted").
   * An event without an action is meaningless.
   */
  it("action is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "action")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: target_type must be NOT NULL.
   *
   * The polymorphic target pattern uses target_type + target_id together.
   * target_type says WHICH TABLE the target is in (e.g., "document", "asset").
   * Without it, you'd have a UUID pointing to... who knows where.
   */
  it("target_type is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "target_type")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: target_id must be NOT NULL.
   *
   * Together with target_type, this tells us WHICH SPECIFIC ROW was affected.
   * Example: target_type = "document", target_id = "abc-123"
   *   → "Something happened to document abc-123"
   */
  it("target_id is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "target_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: There must be NO updated_at column.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ THIS IS THE CORE APPEND-ONLY GUARANTEE                             │
   * │                                                                     │
   * │ Most tables have updated_at (set when a row is changed).            │
   * │ The ledger table must NOT have it because ledger events should      │
   * │ NEVER be modified after creation.                                   │
   * │                                                                     │
   * │ If someone adds updated_at to ledger_events, this test FAILS,      │
   * │ alerting us that the immutability contract is broken.               │
   * │                                                                     │
   * │ COMBINED WITH:                                                      │
   * │   - RLS policy (0012_rls_policies.sql): No UPDATE or DELETE policy  │
   * │   - This schema test: No updated_at or deleted_at columns           │
   * │ = TWO layers of protection for audit integrity.                     │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  it("does NOT have updated_at column (append-only)", () => {
    const col = config.columns.find((c) => c.name === "updated_at")
    expect(col).toBeUndefined()
  })

  /**
   * TEST: There must be NO deleted_at column.
   *
   * Same reasoning as updated_at above. Most tables have deleted_at for
   * soft deletes. But you CANNOT soft-delete an audit record — that
   * would defeat the entire purpose of having an audit trail.
   */
  it("does NOT have deleted_at column (append-only)", () => {
    const col = config.columns.find((c) => c.name === "deleted_at")
    expect(col).toBeUndefined()
  })

  /**
   * TEST: ip_address is nullable.
   *
   * Not every event will have an IP address (e.g., background jobs,
   * system-triggered events from cron). So this column is optional.
   */
  it("ip_address is nullable", () => {
    const col = config.columns.find((c) => c.name === "ip_address")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: There's an index on (org_id, created_at).
   *
   * WHY: The most common query is "show me all events for org X,
   * most recent first." This composite index makes that query fast.
   * Without it, PostgreSQL would scan EVERY row in the table.
   *
   * WHAT IS AN INDEX?
   *   Like the index at the back of a textbook. Instead of reading
   *   every page to find "PostgreSQL", you look in the index and
   *   jump straight to page 42. Database indexes work the same way.
   */
  it("has org_id + created_at index for chronological queries", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "ledger_events_org_created_at_idx"
    )
    expect(idx).toBeDefined()
  })

  /**
   * TEST: There's a composite index on (target_type, target_id).
   *
   * WHY: To query "show me all events about document abc-123",
   * we need to filter by target_type = 'document' AND target_id = 'abc-123'.
   * This composite index makes that lookup fast.
   */
  it("has target_type + target_id composite index", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "ledger_events_target_idx"
    )
    expect(idx).toBeDefined()
  })
})

// ============================================================================
// TEST GROUP 2: Zod Validation Schema
// ============================================================================
// These tests check the Zod validation schema (lib/validations/ledger-event.schema.ts).
// Zod is a library that validates data BEFORE it reaches the database.
// Think of it as a bouncer at the door: "Is your data properly formatted? No? Go away."
//
// .safeParse(data) returns:
//   { success: true, data: { ... } }   → Data is valid
//   { success: false, error: { ... } }  → Data is invalid, here's why

describe("createLedgerEventSchema — Zod validation", () => {
  /**
   * A known-good payload that should always pass validation.
   * We reuse this as a baseline and override individual fields in each test.
   *
   * The spread operator (...) copies all properties:
   *   { ...validPayload, action: "deleted" }
   *   = { targetType: "document", targetId: "550e...", action: "deleted" }
   */
  const validPayload = {
    targetType: "document",
    targetId: "550e8400-e29b-41d4-a716-446655440000",
    action: "created",
  }

  /**
   * TEST: A valid payload passes validation.
   * This is the "happy path" — the basic sanity check.
   */
  it("accepts a valid payload", () => {
    const result = createLedgerEventSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  /**
   * TEST: Every action in the enum is accepted.
   *
   * ledgerActionEnum.options gives us the full list:
   *   ["created", "updated", "deleted", "archived", "document_uploaded", ...]
   *
   * We loop through EVERY one and verify it passes validation.
   * This way, if someone adds a new action to the enum but forgets
   * to add it to the Zod schema, the test will catch it.
   */
  it("accepts all valid action types", () => {
    const actions = ledgerActionEnum.options
    for (const action of actions) {
      const result = createLedgerEventSchema.safeParse({
        ...validPayload,
        action,
      })
      expect(result.success).toBe(true)
    }
  })

  /**
   * TEST: Every target type in the enum is accepted.
   *
   * Same pattern as above but for target types:
   *   ["org", "user", "client", "entity", "asset", "document", "task", "report"]
   */
  it("accepts all valid target types", () => {
    const types = ledgerTargetTypeEnum.options
    for (const targetType of types) {
      const result = createLedgerEventSchema.safeParse({
        ...validPayload,
        targetType,
      })
      expect(result.success).toBe(true)
    }
  })

  /**
   * TEST: An invalid action is REJECTED.
   *
   * "hacked" is not in the ledgerActionEnum, so the schema must reject it.
   * This prevents someone from inserting arbitrary strings into the
   * action column.
   */
  it("rejects invalid action", () => {
    const result = createLedgerEventSchema.safeParse({
      ...validPayload,
      action: "hacked",
    })
    expect(result.success).toBe(false)
  })

  /**
   * TEST: An invalid target type is REJECTED.
   *
   * "spaceship" is not a valid target type, so Zod must reject it.
   */
  it("rejects invalid target type", () => {
    const result = createLedgerEventSchema.safeParse({
      ...validPayload,
      targetType: "spaceship",
    })
    expect(result.success).toBe(false)
  })

  /**
   * TEST: A non-UUID targetId is REJECTED.
   *
   * target_id must be a valid UUID (like "550e8400-e29b-41d4-a716-446655440000").
   * "not-a-uuid" doesn't match the UUID format, so Zod rejects it.
   */
  it("rejects non-UUID targetId", () => {
    const result = createLedgerEventSchema.safeParse({
      ...validPayload,
      targetId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  /**
   * TEST: Missing required fields are REJECTED.
   *
   * We test three scenarios:
   *   1. Empty object (missing everything)
   *   2. Only action (missing targetType and targetId)
   *   3. Only targetType (missing action and targetId)
   *
   * All three must fail because ALL fields are required for a ledger event.
   */
  it("rejects missing required fields", () => {
    expect(createLedgerEventSchema.safeParse({}).success).toBe(false)
    expect(
      createLedgerEventSchema.safeParse({ action: "created" }).success
    ).toBe(false)
    expect(
      createLedgerEventSchema.safeParse({ targetType: "document" }).success
    ).toBe(false)
  })

  /**
   * TEST: Optional payload metadata is accepted.
   *
   * The payload field stores extra context about what happened.
   * Example: { before: { status: "active" }, after: { status: "sold" } }
   * It's optional — not every event needs extra metadata.
   */
  it("accepts optional payload metadata", () => {
    const result = createLedgerEventSchema.safeParse({
      ...validPayload,
      payload: { before: { status: "active" }, after: { status: "sold" } },
    })
    expect(result.success).toBe(true)
  })

  /**
   * TEST: No "update" schema exists for ledger events.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ WHY THIS TEST EXISTS:                                               │
   * │                                                                     │
   * │ Most tables have TWO Zod schemas:                                   │
   * │   - createXxxSchema  (for INSERT operations)                        │
   * │   - updateXxxSchema  (for UPDATE operations)                        │
   * │                                                                     │
   * │ The ledger table must ONLY have createLedgerEventSchema.            │
   * │ There should be NO updateLedgerEventSchema because ledger events    │
   * │ are IMMUTABLE — once created, they can never be changed.            │
   * │                                                                     │
   * │ This test dynamically imports the module and checks that no         │
   * │ update schema is exported. If someone accidentally adds one,        │
   * │ this test will catch it.                                            │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  it("does NOT have an update schema (append-only — no updates allowed)", async () => {
    const mod = await import("@/lib/validations/ledger-event.schema")
    expect(
      (mod as Record<string, unknown>).updateLedgerEventSchema
    ).toBeUndefined()
  })
})
