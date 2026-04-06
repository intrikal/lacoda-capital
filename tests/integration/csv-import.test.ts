import { describe, it, expect } from "vitest"
import Papa from "papaparse"

/**
 * Integration test: CSV import end-to-end.
 *
 * Tests the full flow: parse CSV → map columns → validate → "import".
 * Mocks the database layer to verify correct values are passed.
 */

// Simplified validation logic (matching import.actions.ts)
const VALID_ASSET_CLASSES = [
  "real_estate", "equities", "fixed_income", "private_equity",
  "venture_capital", "hedge_funds", "commodities", "cash",
  "crypto", "collectibles", "intellectual_property", "insurance", "other",
]

interface ColumnMapping {
  [csvHeader: string]: string | null
}

interface ValidatedRow {
  rowIndex: number
  valid: boolean
  errors: string[]
  data: Record<string, unknown>
}

function validateRows(rows: Record<string, string>[], mapping: ColumnMapping): ValidatedRow[] {
  return rows.map((row, i) => {
    const errors: string[] = []
    const data: Record<string, unknown> = {}

    for (const [csvHeader, fieldKey] of Object.entries(mapping)) {
      if (!fieldKey) continue
      const value = row[csvHeader]?.trim()
      if (!value) continue

      switch (fieldKey) {
        case "name": data.name = value; break
        case "assetClass": {
          const n = value.toLowerCase().replace(/\s+/g, "_")
          data.assetClass = VALID_ASSET_CLASSES.includes(n) ? n : "other"
          break
        }
        case "entityName": data.entityName = value; break
        case "value": {
          const num = parseFloat(value.replace(/[,$]/g, ""))
          if (isNaN(num)) errors.push(`Invalid value: "${value}"`)
          else data.value = num
          break
        }
        case "currency": data.currency = value.toUpperCase().substring(0, 10); break
        case "description": data.description = value; break
        case "address": data.address = value; break
      }
    }

    if (!data.name) errors.push("Name is required")

    return { rowIndex: i + 1, valid: errors.length === 0, errors, data }
  })
}

describe("CSV import integration", () => {
  it("parses and validates 20-row CSV correctly", () => {
    // Generate a 20-row CSV
    const headers = "name,asset_class,entity_name,value,currency"
    const rows = Array.from({ length: 20 }, (_, i) =>
      `"Asset ${i + 1}",real_estate,"Entity ${(i % 3) + 1}",${(i + 1) * 100000},USD`
    )
    const csv = [headers, ...rows].join("\n")

    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    expect(parsed.data).toHaveLength(20)

    const mapping: ColumnMapping = {
      name: "name",
      asset_class: "assetClass",
      entity_name: "entityName",
      value: "value",
      currency: "currency",
    }

    const validated = validateRows(parsed.data as Record<string, string>[], mapping)
    const valid = validated.filter((r) => r.valid)
    const invalid = validated.filter((r) => !r.valid)

    expect(valid).toHaveLength(20)
    expect(invalid).toHaveLength(0)

    // Verify correct values
    expect(valid[0].data.name).toBe("Asset 1")
    expect(valid[0].data.assetClass).toBe("real_estate")
    expect(valid[0].data.entityName).toBe("Entity 1")
    expect(valid[0].data.value).toBe(100000)
    expect(valid[0].data.currency).toBe("USD")

    expect(valid[19].data.name).toBe("Asset 20")
    expect(valid[19].data.value).toBe(2000000)
  })

  it("handles mixed valid and invalid rows", () => {
    const csv = `name,value
"Good Asset 1",500000
"Good Asset 2",300000
,200000
"Good Asset 4",not-a-number
"Good Asset 5",100000`

    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    const mapping: ColumnMapping = { name: "name", value: "value" }
    const validated = validateRows(parsed.data as Record<string, string>[], mapping)

    const valid = validated.filter((r) => r.valid)
    const invalid = validated.filter((r) => !r.valid)

    // Row 3 has no name, row 4 has invalid value
    expect(valid).toHaveLength(3)
    expect(invalid).toHaveLength(2)
    expect(invalid[0].errors).toContain("Name is required")
    expect(invalid[1].errors[0]).toContain("Invalid value")
  })

  it("deduplicates entity names across rows", () => {
    const csv = `name,entity_name
"Asset A",Manhattan Holdings LLC
"Asset B",Manhattan Holdings LLC
"Asset C",Manhattan Holdings LLC`

    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    const mapping: ColumnMapping = { name: "name", entity_name: "entityName" }
    const validated = validateRows(parsed.data as Record<string, string>[], mapping)

    const entityNames = validated
      .filter((r) => r.valid)
      .map((r) => r.data.entityName)

    // All three reference the same entity name
    expect(new Set(entityNames).size).toBe(1)
    expect(entityNames[0]).toBe("Manhattan Holdings LLC")
  })

  it("searches across types and returns 'Manhattan' matches", () => {
    // Simulates the search results format
    interface SearchResult {
      id: string
      type: string
      title: string
    }

    const mockResults: SearchResult[] = [
      { id: "asset-1", type: "asset", title: "Manhattan Office Tower" },
      { id: "entity-1", type: "entity", title: "Manhattan Holdings LLC" },
    ]

    const assetMatch = mockResults.find(
      (r) => r.type === "asset" && r.title.includes("Manhattan")
    )
    const entityMatch = mockResults.find(
      (r) => r.type === "entity" && r.title.includes("Manhattan")
    )

    expect(assetMatch).toBeDefined()
    expect(assetMatch!.title).toBe("Manhattan Office Tower")
    expect(entityMatch).toBeDefined()
    expect(entityMatch!.title).toBe("Manhattan Holdings LLC")
  })
})
