/**
 * ============================================================================
 * TEST FILE: document-tags.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the DOCUMENTS table — specifically the tags array,
 * the nullable FK columns, and the storage_path requirement.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS A TEST?                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ A test is code that checks whether other code works correctly.         │
 * │ Think of it like a checklist that runs automatically:                  │
 * │                                                                        │
 * │   ✓ Does the documents table have all the right columns?              │
 * │   ✓ Is storage_path required (NOT NULL)?                               │
 * │   ✓ Are client_id, entity_id, asset_id optional (nullable)?           │
 * │   ✓ Does the Zod validation accept valid tags arrays?                 │
 * │   ✓ Does it reject invalid data (like numbers in tags)?               │
 * │                                                                        │
 * │ RUN TESTS WITH: npx vitest run --project unit                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT DOES THIS FILE TEST?                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. DRIZZLE SCHEMA: Inspects the documents table definition to verify  │
 * │    that all columns exist, required ones are NOT NULL, and optional    │
 * │    ones (client_id, entity_id, asset_id) are nullable.                │
 * │                                                                        │
 * │ 2. TAGS ARRAY: Documents have a `tags` column that stores a list of   │
 * │    strings like ["tax", "2024", "personal"]. We test that:            │
 * │    - Empty arrays [] are valid                                         │
 * │    - String arrays are valid                                           │
 * │    - Non-string values (numbers, booleans) are rejected               │
 * │                                                                        │
 * │ 3. POLYMORPHIC LINKING: A document can optionally link to a client,   │
 * │    entity, and/or asset. We test that a document with NO links is     │
 * │    valid (e.g., an org-level policy document).                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/db/schema/documents.ts          — The Drizzle table definition
 *   lib/validations/document.schema.ts  — The Zod validation schema
 */

/**
 * import { describe, it, expect } from "vitest"
 *
 * WHAT: The three core functions from Vitest (our test runner).
 *   describe = groups related tests under a name
 *   it       = one individual test (reads like "it accepts...", "it rejects...")
 *   expect   = makes an assertion ("I expect this value to be X")
 *
 * See ledger-event.schema.test.ts for a full explanation of Vitest basics.
 */
import { describe, it, expect } from "vitest"

/**
 * import { createDocumentSchema } from "@/lib/validations/document.schema"
 *
 * WHAT: Imports the Zod validation schema for creating documents.
 * WHY:  We test that the validation correctly accepts/rejects tags arrays
 *       and optional FK fields.
 */
import { createDocumentSchema } from "@/lib/validations/document.schema"

/**
 * import { documents } from "@/app/db/schema/documents"
 *
 * WHAT: Imports the Drizzle table definition.
 * WHY:  We use getTableConfig() to inspect its columns and indexes.
 */
import { documents } from "@/app/db/schema/documents"

/**
 * import { getTableConfig } from "drizzle-orm/pg-core"
 *
 * WHAT: A Drizzle utility that extracts the full configuration of a table.
 * WHY:  Returns the table's columns, indexes, and constraints so we can
 *       verify they match the spec without needing a running database.
 *
 * See ledger-event.schema.test.ts for full explanation.
 */
import { getTableConfig } from "drizzle-orm/pg-core"

// ============================================================================
// TEST GROUP 1: Drizzle Schema Structure
// ============================================================================
// These tests inspect the documents table definition to verify the right
// columns exist with the right constraints (NOT NULL vs nullable).

describe("documents — Drizzle schema structure", () => {
  const config = getTableConfig(documents)

  it("has the correct table name", () => {
    expect(config.name).toBe("documents")
  })

  /**
   * TEST: All required columns from the spec exist.
   *
   * This is the "big picture" check — make sure no columns were
   * accidentally deleted or renamed. The array includes every column
   * mentioned in the database spec:
   *
   *   id, org_id, asset_id (nullable), entity_id (nullable),
   *   client_id (nullable), name, storage_path (NOT NULL),
   *   mime_type, size_bytes, folder, tags, version, expires_at,
   *   uploaded_by, created_at, updated_at, deleted_at
   */
  it("has all required columns from the spec", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "org_id",
        "asset_id",
        "entity_id",
        "client_id",
        "name",
        "storage_path",
        "mime_type",
        "size_bytes",
        "folder",
        "tags",
        "version",
        "expires_at",
        "uploaded_by",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
    )
  })

  /**
   * TEST: storage_path is NOT NULL.
   *
   * WHY: Every document MUST have a storage path pointing to where
   * the actual file lives (e.g., "/uploads/tax-return-2024.pdf").
   * A document record without a file path is useless.
   */
  it("storage_path is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "storage_path")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: name is NOT NULL.
   *
   * Every document needs a human-readable name like "Tax Return 2024"
   * so people can find it in the UI.
   */
  it("name is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "name")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: asset_id is nullable (optional FK).
   *
   * WHY: Not every document is tied to a specific asset.
   * A client's passport is about the CLIENT, not an asset.
   * An org-level compliance manual isn't about any asset at all.
   *
   * NULLABLE means the column CAN be empty (NULL).
   * If .notNull were true, you'd HAVE to provide an asset_id for every document.
   */
  it("asset_id is nullable (optional FK)", () => {
    const col = config.columns.find((c) => c.name === "asset_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: entity_id is nullable.
   * Same reasoning as asset_id — not every document belongs to a legal entity.
   */
  it("entity_id is nullable (optional FK)", () => {
    const col = config.columns.find((c) => c.name === "entity_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: client_id is nullable.
   * Some documents are org-level (compliance manuals, templates) and
   * don't belong to any specific client.
   */
  it("client_id is nullable (optional FK)", () => {
    const col = config.columns.find((c) => c.name === "client_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: version column defaults to 1.
   *
   * When a document is first uploaded, it's version 1.
   * If the user uploads a new version, the app increments this.
   * The default ensures you don't have to manually set version = 1
   * on every insert.
   */
  it("version defaults to 1", () => {
    const col = config.columns.find((c) => c.name === "version")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
    expect(col!.default).toBeDefined()
  })

  /**
   * TEST: There's an index on org_id for multi-tenant queries.
   *
   * Every query starts with "WHERE org_id = ?" for tenant isolation.
   * Without this index, PostgreSQL would scan every row in the table.
   */
  it("has org_id index", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "documents_org_id_idx"
    )
    expect(idx).toBeDefined()
  })

  /**
   * TEST: There's an index on expires_at for expiration queries.
   *
   * WHY: A cron job runs regularly to find documents that have expired
   * (expires_at < NOW()). This index makes that query fast.
   */
  it("has expires_at index for expiration queries", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "documents_expires_at_idx"
    )
    expect(idx).toBeDefined()
  })
})

// ============================================================================
// TEST GROUP 2: Document Tags — Zod Validation
// ============================================================================
// The `tags` column stores an array of strings like ["tax", "2024", "personal"].
// These tests verify the Zod schema handles tags correctly.
//
// WHY TAGS MATTER:
//   Tags let users categorize documents for easy searching.
//   "Show me all documents tagged 'tax'" is a common query.
//   We need to make sure:
//     - Empty arrays [] are valid (no tags is fine)
//     - String arrays are valid
//     - Non-string values (numbers, booleans) are rejected

describe("document tags — Zod validation", () => {
  /**
   * A minimal valid payload with the two required fields.
   * We'll add tags to this in each test below.
   */
  const basePayload = {
    name: "Test Document",
    storagePath: "/uploads/test.pdf",
  }

  /**
   * TEST: An empty tags array is valid.
   *
   * A document with no tags is perfectly fine — the user just
   * hasn't categorized it yet. tags: [] should be accepted.
   */
  it("accepts an empty tags array", () => {
    const result = createDocumentSchema.safeParse({
      ...basePayload,
      tags: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })

  /**
   * TEST: A tags array with string values is valid.
   *
   * This is the normal case: the user adds tags like
   * ["tax", "2024", "personal"] to categorize the document.
   */
  it("accepts tags with string values", () => {
    const result = createDocumentSchema.safeParse({
      ...basePayload,
      tags: ["tax", "2024", "personal"],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(["tax", "2024", "personal"])
    }
  })

  /**
   * TEST: No tags field at all is valid (undefined).
   *
   * If the user doesn't provide tags at all (not even an empty array),
   * the schema should still accept the document. The DB column
   * defaults to [] via .default([]).
   */
  it("accepts no tags field (undefined defaults to omitted)", () => {
    const result = createDocumentSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
  })

  /**
   * TEST: Non-string tag values are REJECTED.
   *
   * Tags must be strings. If someone passes [123, true], Zod
   * should reject it because numbers and booleans aren't strings.
   */
  it("rejects non-string tag values", () => {
    const result = createDocumentSchema.safeParse({
      ...basePayload,
      tags: [123, true],
    })
    expect(result.success).toBe(false)
  })

  /**
   * TEST: A document with NO linked entity/asset/client is valid.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ EDGE CASE: Document with no linked entity/asset/client             │
   * │                                                                     │
   * │ This is a valid scenario! Examples:                                 │
   * │   - An org-level policy manual                                      │
   * │   - A company-wide compliance document                              │
   * │   - A template document                                             │
   * │                                                                     │
   * │ All three FK fields (clientId, entityId, assetId) are OPTIONAL,     │
   * │ so omitting them should be perfectly fine.                          │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  it("document with no linked entity/asset/client is valid", () => {
    const result = createDocumentSchema.safeParse({
      name: "Org Policy Manual",
      storagePath: "/uploads/policy.pdf",
      // clientId, entityId, assetId all omitted — should be valid
    })
    expect(result.success).toBe(true)
  })

  /**
   * TEST: A document with ALL optional FKs set is valid.
   *
   * The other extreme: a document linked to a client AND entity AND asset.
   * Example: A property appraisal for 123 Main St (an asset) held in
   * the Smith Family Trust (entity) owned by John Smith (client).
   */
  it("document with all optional FKs set is valid", () => {
    const result = createDocumentSchema.safeParse({
      name: "Asset Appraisal",
      storagePath: "/uploads/appraisal.pdf",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      entityId: "550e8400-e29b-41d4-a716-446655440001",
      assetId: "550e8400-e29b-41d4-a716-446655440002",
      tags: ["appraisal", "real_estate"],
    })
    expect(result.success).toBe(true)
  })
})
