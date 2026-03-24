import { describe, it, expect } from "vitest"
import Papa from "papaparse"

/**
 * CSV parsing unit tests.
 *
 * Tests PapaParse behavior for edge cases we rely on:
 * - Quoted fields with commas
 * - UTF-8 BOM handling
 * - Empty files
 */

describe("CSV parsing", () => {
  it("parses quoted fields with commas as a single field", () => {
    const csv = `name,address,value
"Manhattan Tower","New York, NY",5000000
"Bayfront Office","San Francisco, CA",3000000`

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true })

    expect(result.data).toHaveLength(2)
    expect((result.data[0] as Record<string, string>).address).toBe("New York, NY")
    expect((result.data[1] as Record<string, string>).address).toBe("San Francisco, CA")
  })

  it("handles UTF-8 BOM", () => {
    // UTF-8 BOM is \uFEFF prepended to the file
    const csv = `\uFEFFname,value
Tower,1000000`

    const result = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.replace(/^\uFEFF/, "").trim(),
    })

    expect(result.data).toHaveLength(1)
    expect(result.meta.fields).toContain("name")
    expect((result.data[0] as Record<string, string>).name).toBe("Tower")
  })

  it("returns empty data for headers-only CSV", () => {
    const csv = `name,address,value`

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true })

    expect(result.data).toHaveLength(0)
  })

  it("handles fields with line breaks in quotes", () => {
    const csv = `name,description
"Tower","A building in\nNew York"`

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true })

    expect(result.data).toHaveLength(1)
    expect((result.data[0] as Record<string, string>).description).toBe("A building in\nNew York")
  })

  it("handles large numbers without scientific notation", () => {
    const csv = `name,value
"Fund",99999999999.99`

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true })
    const value = (result.data[0] as Record<string, string>).value

    expect(value).toBe("99999999999.99")
    expect(parseFloat(value)).toBe(99999999999.99)
  })

  it("handles empty values as empty strings", () => {
    const csv = `name,value,description
"Tower",,`

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true })

    expect(result.data).toHaveLength(1)
    expect((result.data[0] as Record<string, string>).value).toBe("")
    expect((result.data[0] as Record<string, string>).description).toBe("")
  })
})
