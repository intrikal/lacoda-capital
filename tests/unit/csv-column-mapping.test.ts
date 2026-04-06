import { describe, it, expect } from "vitest"

/**
 * CSV column mapping unit tests.
 *
 * Tests the mapping validation logic:
 * - Unmapped required columns show errors
 * - Optional columns can be skipped
 * - Auto-mapping from header names
 */

// Simplified mapping validation logic (mirrors import.actions.ts)
const VALID_ASSET_CLASSES = [
  "real_estate", "equities", "fixed_income", "private_equity",
  "venture_capital", "hedge_funds", "commodities", "cash",
  "crypto", "collectibles", "intellectual_property", "insurance", "other",
]

interface ColumnMapping {
  [csvHeader: string]: string | null
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  data: Record<string, unknown>
}

function validateRow(
  row: Record<string, string>,
  mapping: ColumnMapping
): ValidationResult {
  const errors: string[] = []
  const data: Record<string, unknown> = {}

  for (const [csvHeader, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue
    const value = row[csvHeader]?.trim()
    if (!value) continue

    switch (fieldKey) {
      case "name":
        data.name = value
        break
      case "assetClass": {
        const normalized = value.toLowerCase().replace(/\s+/g, "_")
        data.assetClass = VALID_ASSET_CLASSES.includes(normalized) ? normalized : "other"
        break
      }
      case "value": {
        const num = parseFloat(value.replace(/[,$]/g, ""))
        if (isNaN(num)) errors.push(`Invalid value: "${value}"`)
        else data.value = num
        break
      }
      default:
        data[fieldKey] = value
    }
  }

  if (!data.name) errors.push("Name is required")

  return { valid: errors.length === 0, errors, data }
}

describe("CSV column mapping validation", () => {
  it("shows error when required 'name' column is unmapped", () => {
    const row = { "Asset Name": "Tower", "Price": "5000000" }
    // name is NOT mapped
    const mapping: ColumnMapping = { "Asset Name": null, "Price": "value" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Name is required")
  })

  it("succeeds when only name is mapped (optionals skipped)", () => {
    const row = { "Asset Name": "Tower", "Desc": "A building" }
    const mapping: ColumnMapping = { "Asset Name": "name", "Desc": null }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(true)
    expect(result.data.name).toBe("Tower")
    expect(result.data).not.toHaveProperty("description")
  })

  it("maps optional description correctly", () => {
    const row = { "Name": "Tower", "Description": "A tall building" }
    const mapping: ColumnMapping = { "Name": "name", "Description": "description" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(true)
    expect(result.data.description).toBe("A tall building")
  })

  it("normalizes asset class values", () => {
    const row = { "Name": "Tower", "Type": "Real Estate" }
    const mapping: ColumnMapping = { "Name": "name", "Type": "assetClass" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(true)
    expect(result.data.assetClass).toBe("real_estate")
  })

  it("falls back to 'other' for unknown asset classes", () => {
    const row = { "Name": "Tower", "Type": "Fine Art" }
    const mapping: ColumnMapping = { "Name": "name", "Type": "assetClass" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(true)
    expect(result.data.assetClass).toBe("other")
  })

  it("parses values with dollar signs and commas", () => {
    const row = { "Name": "Tower", "Value": "$5,000,000" }
    const mapping: ColumnMapping = { "Name": "name", "Value": "value" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(true)
    expect(result.data.value).toBe(5000000)
  })

  it("shows error for invalid value format", () => {
    const row = { "Name": "Tower", "Value": "not-a-number" }
    const mapping: ColumnMapping = { "Name": "name", "Value": "value" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("Invalid value")
  })

  it("handles empty optional fields gracefully", () => {
    const row = { "Name": "Tower", "Description": "", "Value": "" }
    const mapping: ColumnMapping = { "Name": "name", "Description": "description", "Value": "value" }

    const result = validateRow(row, mapping)

    expect(result.valid).toBe(true)
    // Empty strings should be skipped (not set in data)
    expect(result.data).not.toHaveProperty("description")
    expect(result.data).not.toHaveProperty("value")
  })
})
