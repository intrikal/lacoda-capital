import { describe, it, expect } from "vitest"
import { extractionOutputSchema, getExtractionFlaggedFields } from "@/lib/agents/extraction"
import type { ExtractionOutput } from "@/lib/agents/extraction"

/**
 * Unit tests for the document extraction agent.
 *
 * Tests Zod schema validation and confidence flagging logic.
 */

describe("extractionOutputSchema", () => {
  it("validates a complete valid extraction result", () => {
    const validOutput = {
      property_address: "123 Main St, Springfield, IL 62704",
      valuation_amount: 450000,
      valuation_date: "2024-06-15",
      appraiser_name: "John Smith, MAI",
      document_type: "appraisal",
      asset_name: "123 Main St Property",
      asset_class: "real_estate",
      confidence: {
        property_address: 0.95,
        valuation_amount: 0.92,
        valuation_date: 0.88,
        appraiser_name: 0.90,
        document_type: 0.99,
        asset_name: 0.85,
        asset_class: 0.95,
      },
    }

    const result = extractionOutputSchema.safeParse(validOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.property_address).toBe("123 Main St, Springfield, IL 62704")
      expect(result.data.valuation_amount).toBe(450000)
    }
  })

  it("allows null fields for missing information", () => {
    const partialOutput = {
      property_address: null,
      valuation_amount: null,
      valuation_date: null,
      appraiser_name: null,
      document_type: "bank_statement",
      asset_name: null,
      asset_class: null,
      confidence: {
        property_address: 0,
        valuation_amount: 0,
        valuation_date: 0,
        appraiser_name: 0,
        document_type: 0.9,
        asset_name: 0,
        asset_class: 0,
      },
    }

    const result = extractionOutputSchema.safeParse(partialOutput)
    expect(result.success).toBe(true)
  })

  it("every confidence field must be between 0 and 1", () => {
    const invalidConfidence = {
      property_address: "123 Main St",
      valuation_amount: 500000,
      valuation_date: "2024-01-01",
      appraiser_name: "Jane Doe",
      document_type: "appraisal",
      asset_name: "Test",
      asset_class: "real_estate",
      confidence: {
        property_address: 1.5, // Invalid: > 1
        valuation_amount: -0.1, // Invalid: < 0
        valuation_date: 0.8,
        appraiser_name: 0.9,
        document_type: 0.95,
        asset_name: 0.7,
        asset_class: 0.85,
      },
    }

    const result = extractionOutputSchema.safeParse(invalidConfidence)
    expect(result.success).toBe(false)
  })

  it("rejects missing confidence object", () => {
    const noConfidence = {
      property_address: "123 Main St",
      valuation_amount: 500000,
      valuation_date: "2024-01-01",
      appraiser_name: "Jane Doe",
      document_type: "appraisal",
      asset_name: "Test",
      asset_class: "real_estate",
      // Missing confidence
    }

    const result = extractionOutputSchema.safeParse(noConfidence)
    expect(result.success).toBe(false)
  })
})

describe("getExtractionFlaggedFields", () => {
  it("flags fields with confidence < 0.8", () => {
    const data: ExtractionOutput = {
      property_address: "123 Main St",
      valuation_amount: 450000,
      valuation_date: "2024-06-15",
      appraiser_name: "Blurry Name",
      document_type: "appraisal",
      asset_name: "Main St Property",
      asset_class: "real_estate",
      confidence: {
        property_address: 0.95,
        valuation_amount: 0.92,
        valuation_date: 0.6,  // Below threshold
        appraiser_name: 0.45, // Below threshold
        document_type: 0.99,
        asset_name: 0.85,
        asset_class: 0.75,    // Below threshold
      },
    }

    const flagged = getExtractionFlaggedFields(data)
    expect(flagged).toContain("valuation_date")
    expect(flagged).toContain("appraiser_name")
    expect(flagged).toContain("asset_class")
    expect(flagged).not.toContain("property_address")
    expect(flagged).not.toContain("valuation_amount")
    expect(flagged).not.toContain("document_type")
    expect(flagged).not.toContain("asset_name")
  })

  it("confidence >= 0.8 → field NOT flagged", () => {
    const data: ExtractionOutput = {
      property_address: "456 Oak Ave",
      valuation_amount: 750000,
      valuation_date: "2024-03-01",
      appraiser_name: "Expert Appraiser",
      document_type: "appraisal",
      asset_name: "Oak Ave Home",
      asset_class: "real_estate",
      confidence: {
        property_address: 0.8,
        valuation_amount: 0.8,
        valuation_date: 0.8,
        appraiser_name: 0.8,
        document_type: 0.8,
        asset_name: 0.8,
        asset_class: 0.8,
      },
    }

    const flagged = getExtractionFlaggedFields(data)
    expect(flagged).toHaveLength(0)
  })
})
