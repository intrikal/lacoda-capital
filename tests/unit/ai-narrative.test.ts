import { describe, it, expect } from "vitest"
import { narrativeOutputSchema, buildNarrativePrompt } from "@/lib/agents/narrative"
import type { NarrativeContextData } from "@/lib/agents/narrative"

/**
 * Unit tests for the report narrative agent.
 *
 * Tests Zod schema validation and the context builder.
 * Key test: output must contain actual AUM value from test data, not hallucinated.
 */

describe("narrativeOutputSchema", () => {
  it("validates a correct narrative output", () => {
    const valid = {
      summary: "The portfolio performed well this quarter with total AUM of $12.3M.",
      key_highlights: [
        "Total AUM grew 4.2% to $12.3M",
        "Real estate allocation increased to 45%",
        "Three new assets added",
      ],
      generated_by: "ai" as const,
    }

    const result = narrativeOutputSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("rejects empty summary", () => {
    const invalid = {
      summary: "",
      key_highlights: ["Highlight"],
      generated_by: "ai",
    }

    const result = narrativeOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects empty key_highlights array", () => {
    const invalid = {
      summary: "A valid summary paragraph.",
      key_highlights: [],
      generated_by: "ai",
    }

    const result = narrativeOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe("buildNarrativePrompt", () => {
  const testData: NarrativeContextData = {
    clientName: "Smith Family",
    reportType: "portfolio_summary",
    period: "Jan 1 – Mar 31, 2024",
    totalAUM: 12300000,
    previousAUM: 11800000,
    assetAllocation: [
      { assetClass: "real estate", value: 5535000, percentage: 45 },
      { assetClass: "equities", value: 3690000, percentage: 30 },
      { assetClass: "fixed income", value: 1845000, percentage: 15 },
      { assetClass: "cash", value: 1230000, percentage: 10 },
    ],
    recentValuations: [
      { assetName: "123 Main St", value: 2500000, previousValue: 2300000, date: "2024-03-15" },
      { assetName: "Vanguard S&P 500", value: 1500000, date: "2024-03-20" },
    ],
    notableEvents: [
      { action: "created", description: "New asset: 456 Oak Ave", date: "2024-02-10" },
    ],
  }

  it("includes actual AUM value from test data", () => {
    const prompt = buildNarrativePrompt(testData)
    expect(prompt).toContain("12,300,000")
  })

  it("includes previous period AUM and change percentage", () => {
    const prompt = buildNarrativePrompt(testData)
    expect(prompt).toContain("11,800,000")
    expect(prompt).toContain("+4.2%")
  })

  it("includes all asset allocation classes", () => {
    const prompt = buildNarrativePrompt(testData)
    expect(prompt).toContain("real estate")
    expect(prompt).toContain("equities")
    expect(prompt).toContain("fixed income")
    expect(prompt).toContain("cash")
    expect(prompt).toContain("45.0%")
    expect(prompt).toContain("30.0%")
  })

  it("includes recent valuation details", () => {
    const prompt = buildNarrativePrompt(testData)
    expect(prompt).toContain("123 Main St")
    expect(prompt).toContain("2,500,000")
    expect(prompt).toContain("Vanguard S&P 500")
  })

  it("includes notable events", () => {
    const prompt = buildNarrativePrompt(testData)
    expect(prompt).toContain("New asset: 456 Oak Ave")
    expect(prompt).toContain("2024-02-10")
  })

  it("includes client name and period", () => {
    const prompt = buildNarrativePrompt(testData)
    expect(prompt).toContain("Smith Family")
    expect(prompt).toContain("Jan 1 – Mar 31, 2024")
  })

  it("handles missing previousAUM gracefully", () => {
    const dataNoComparison = { ...testData, previousAUM: undefined }
    const prompt = buildNarrativePrompt(dataNoComparison)
    expect(prompt).toContain("12,300,000")
    expect(prompt).not.toContain("Previous Period")
  })

  it("handles empty valuations and events", () => {
    const emptyData: NarrativeContextData = {
      ...testData,
      recentValuations: [],
      notableEvents: [],
    }
    const prompt = buildNarrativePrompt(emptyData)
    expect(prompt).toContain("12,300,000")
    expect(prompt).not.toContain("RECENT VALUATIONS")
    expect(prompt).not.toContain("NOTABLE EVENTS")
  })
})
