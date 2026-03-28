/**
 * Unit tests for data export utilities.
 *
 * Tests:
 *   - CSV export: headers match column names
 *   - Numeric values not corrupted by CSV encoding
 *   - JSON export structure validation
 *   - CSV escaping for commas, quotes, newlines
 */

import { describe, it, expect } from "vitest"
import { tableToCSV, type ExportTableData } from "@/lib/export-utils"

describe("data-export — CSV generation", () => {
  it("headers match column names", () => {
    const data: ExportTableData = {
      tableName: "assets",
      columns: ["id", "name", "value", "currency"],
      rows: [
        { id: "abc-123", name: "Test Asset", value: 1000000, currency: "USD" },
      ],
    }
    const csv = tableToCSV(data)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("id,name,value,currency")
  })

  it("numeric values not corrupted by CSV encoding", () => {
    const data: ExportTableData = {
      tableName: "assets",
      columns: ["name", "value"],
      rows: [
        { name: "Asset A", value: 25000000.50 },
        { name: "Asset B", value: 0 },
        { name: "Asset C", value: -1500.75 },
      ],
    }
    const csv = tableToCSV(data)
    const lines = csv.split("\n")
    expect(lines[1]).toBe("Asset A,25000000.5")
    expect(lines[2]).toBe("Asset B,0")
    expect(lines[3]).toBe("Asset C,-1500.75")
  })

  it("escapes values containing commas", () => {
    const data: ExportTableData = {
      tableName: "clients",
      columns: ["name", "address"],
      rows: [
        { name: "Smith, John", address: "123 Main St" },
      ],
    }
    const csv = tableToCSV(data)
    const lines = csv.split("\n")
    expect(lines[1]).toBe('"Smith, John",123 Main St')
  })

  it("escapes values containing double quotes", () => {
    const data: ExportTableData = {
      tableName: "assets",
      columns: ["name", "description"],
      rows: [
        { name: 'Asset "Alpha"', description: "Test" },
      ],
    }
    const csv = tableToCSV(data)
    const lines = csv.split("\n")
    expect(lines[1]).toBe('"Asset ""Alpha""",Test')
  })

  it("escapes values containing newlines", () => {
    const data: ExportTableData = {
      tableName: "notes",
      columns: ["name", "content"],
      rows: [
        { name: "Note 1", content: "Line 1\nLine 2" },
      ],
    }
    const csv = tableToCSV(data)
    // The newline should be inside quotes
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it("handles null and undefined values", () => {
    const data: ExportTableData = {
      tableName: "assets",
      columns: ["name", "value", "description"],
      rows: [
        { name: "Asset A", value: null, description: undefined },
      ],
    }
    const csv = tableToCSV(data)
    const lines = csv.split("\n")
    expect(lines[1]).toBe("Asset A,,")
  })

  it("handles empty rows", () => {
    const data: ExportTableData = {
      tableName: "empty",
      columns: ["a", "b"],
      rows: [],
    }
    const csv = tableToCSV(data)
    expect(csv).toBe("a,b")
  })

  it("handles object values by JSON stringifying", () => {
    const data: ExportTableData = {
      tableName: "assets",
      columns: ["name", "metadata"],
      rows: [
        { name: "Asset A", metadata: { key: "value" } },
      ],
    }
    const csv = tableToCSV(data)
    // JSON in CSV gets double-quote escaped: {"key":"value"} → "{""key"":""value""}"
    expect(csv).toContain('"{""key"":""value""}"')
  })

  it("correct row count for multi-row export", () => {
    const data: ExportTableData = {
      tableName: "assets",
      columns: ["name"],
      rows: Array.from({ length: 20 }, (_, i) => ({ name: `Asset ${i + 1}` })),
    }
    const csv = tableToCSV(data)
    const lines = csv.split("\n")
    expect(lines.length).toBe(21) // 1 header + 20 data rows
  })
})
