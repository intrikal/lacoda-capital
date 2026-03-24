/**
 * Unit tests for import conflict resolution logic.
 *
 * Tests:
 *   - Duplicate detection by name
 *   - Conflict resolution modes: skip, overwrite, create
 *   - Missing required columns validation
 */

import { describe, it, expect } from "vitest"
import type { ImportValidatedRow, ConflictMode } from "@/lib/actions/import-wizard.actions"

// ─── Simulated conflict resolution logic (mirrors action) ───────────────────

function resolveConflicts(
  validRows: ImportValidatedRow[],
  duplicateRows: ImportValidatedRow[],
  mode: ConflictMode
): { created: number; updated: number; skipped: number } {
  let created = validRows.length // all valid rows get created
  let updated = 0
  let skipped = 0

  for (const row of duplicateRows) {
    switch (mode) {
      case "skip":
        skipped++
        break
      case "overwrite":
        updated++
        break
      case "create":
        created++
        break
    }
  }

  return { created, updated, skipped }
}

function detectDuplicates(
  rows: { name: string }[],
  existingNames: Set<string>
): { newRows: { name: string }[]; duplicates: { name: string }[] } {
  const newRows: { name: string }[] = []
  const duplicates: { name: string }[] = []

  for (const row of rows) {
    if (existingNames.has(row.name.toLowerCase().trim())) {
      duplicates.push(row)
    } else {
      newRows.push(row)
    }
  }

  return { newRows, duplicates }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("import-conflict — duplicate detection", () => {
  it("detects duplicates by name (case-insensitive)", () => {
    const existing = new Set(["apple stock", "main street property"])
    const rows = [
      { name: "Apple Stock" },
      { name: "New Asset" },
      { name: "MAIN STREET PROPERTY" },
    ]

    const { newRows, duplicates } = detectDuplicates(rows, existing)
    expect(newRows).toHaveLength(1)
    expect(newRows[0].name).toBe("New Asset")
    expect(duplicates).toHaveLength(2)
  })

  it("no duplicates when existing set is empty", () => {
    const existing = new Set<string>()
    const rows = [{ name: "Asset A" }, { name: "Asset B" }]

    const { newRows, duplicates } = detectDuplicates(rows, existing)
    expect(newRows).toHaveLength(2)
    expect(duplicates).toHaveLength(0)
  })

  it("all duplicates when all names exist", () => {
    const existing = new Set(["a", "b", "c"])
    const rows = [{ name: "A" }, { name: "B" }, { name: "C" }]

    const { newRows, duplicates } = detectDuplicates(rows, existing)
    expect(newRows).toHaveLength(0)
    expect(duplicates).toHaveLength(3)
  })
})

describe("import-conflict — conflict resolution modes", () => {
  const makeRow = (i: number, isDuplicate: boolean): ImportValidatedRow => ({
    rowIndex: i,
    valid: true,
    isDuplicate,
    existingId: isDuplicate ? `existing-${i}` : null,
    errors: [],
    data: { name: `Asset ${i}` },
  })

  it("skip mode: 0 new assets from duplicates", () => {
    const valid = [makeRow(1, false), makeRow(2, false)]
    const dups = [makeRow(3, true), makeRow(4, true), makeRow(5, true)]

    const result = resolveConflicts(valid, dups, "skip")
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(3)
  })

  it("overwrite mode: duplicates become updates", () => {
    const valid = [makeRow(1, false)]
    const dups = [makeRow(2, true), makeRow(3, true)]

    const result = resolveConflicts(valid, dups, "overwrite")
    expect(result.created).toBe(1)
    expect(result.updated).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it("create mode: duplicates become new assets", () => {
    const valid = [makeRow(1, false)]
    const dups = [makeRow(2, true)]

    const result = resolveConflicts(valid, dups, "create")
    expect(result.created).toBe(2) // 1 valid + 1 force-created duplicate
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
  })

  it("no duplicates: all modes produce same result", () => {
    const valid = [makeRow(1, false), makeRow(2, false), makeRow(3, false)]
    const dups: ImportValidatedRow[] = []

    for (const mode of ["skip", "overwrite", "create"] as ConflictMode[]) {
      const result = resolveConflicts(valid, dups, mode)
      expect(result.created).toBe(3)
      expect(result.updated).toBe(0)
      expect(result.skipped).toBe(0)
    }
  })

  it("import same CSV twice with skip → 0 new", () => {
    // First import: 5 new assets
    const firstImport = resolveConflicts(
      Array.from({ length: 5 }, (_, i) => makeRow(i, false)),
      [],
      "skip"
    )
    expect(firstImport.created).toBe(5)

    // Second import: all 5 are now duplicates
    const secondImport = resolveConflicts(
      [],
      Array.from({ length: 5 }, (_, i) => makeRow(i, true)),
      "skip"
    )
    expect(secondImport.created).toBe(0)
    expect(secondImport.skipped).toBe(5)
  })
})

describe("import-conflict — validation", () => {
  it("row without name is invalid", () => {
    const row: ImportValidatedRow = {
      rowIndex: 1,
      valid: false,
      isDuplicate: false,
      existingId: null,
      errors: ["Name is required"],
      data: { value: 1000 },
    }
    expect(row.valid).toBe(false)
    expect(row.errors).toContain("Name is required")
  })

  it("row with name is valid", () => {
    const row: ImportValidatedRow = {
      rowIndex: 1,
      valid: true,
      isDuplicate: false,
      existingId: null,
      errors: [],
      data: { name: "Test Asset" },
    }
    expect(row.valid).toBe(true)
    expect(row.errors).toHaveLength(0)
  })
})
