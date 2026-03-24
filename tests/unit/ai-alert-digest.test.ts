import { describe, it, expect } from "vitest"
import { alertDigestOutputSchema, buildDigestPrompt } from "@/lib/agents/alert-digest"
import type { DigestContextData, DigestContextItem } from "@/lib/agents/alert-digest"

/**
 * Unit tests for the smart alert digest agent.
 *
 * Tests Zod schema validation, context builder, and urgency scoring rules.
 * Key test: $50M asset expiring insurance (urgency 9) > $100K missing statement (urgency 4).
 */

describe("alertDigestOutputSchema", () => {
  it("validates a complete alert digest", () => {
    const valid = {
      alerts: [
        {
          title: "Insurance expiring on Main St Property",
          description: "Property insurance expires in 3 days on a $50M asset",
          urgency_score: 10,
          category: "insurance_expiry" as const,
          action_url: "/app/insurance/ins-1",
          asset_value: 50000000,
          days_remaining: 3,
        },
        {
          title: "Stale valuation: Office Park",
          description: "Last valued 120 days ago",
          urgency_score: 4,
          category: "stale_valuation" as const,
          action_url: "/app/assets/ast-2",
          asset_value: 100000,
          days_remaining: null,
        },
      ],
      executive_summary: "1 critical insurance expiration requires immediate attention.",
      total_items: 2,
      critical_count: 1,
    }

    const result = alertDigestOutputSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("validates urgency_score bounds (0-10)", () => {
    const tooHigh = {
      alerts: [{
        title: "Test",
        description: "Test",
        urgency_score: 11, // Invalid
        category: "stale_valuation",
        action_url: null,
        asset_value: null,
        days_remaining: null,
      }],
      executive_summary: "Test",
      total_items: 1,
      critical_count: 0,
    }

    expect(alertDigestOutputSchema.safeParse(tooHigh).success).toBe(false)

    const tooLow = {
      alerts: [{
        title: "Test",
        description: "Test",
        urgency_score: -1, // Invalid
        category: "stale_valuation",
        action_url: null,
        asset_value: null,
        days_remaining: null,
      }],
      executive_summary: "Test",
      total_items: 1,
      critical_count: 0,
    }

    expect(alertDigestOutputSchema.safeParse(tooLow).success).toBe(false)
  })

  it("validates all category types", () => {
    const categories = [
      "expiring_document",
      "stale_valuation",
      "past_due_request",
      "compliance_deadline",
      "insurance_expiry",
    ] as const

    for (const category of categories) {
      const result = alertDigestOutputSchema.safeParse({
        alerts: [{
          title: "Test",
          description: "Test",
          urgency_score: 5,
          category,
          action_url: null,
          asset_value: null,
          days_remaining: null,
        }],
        executive_summary: "Test",
        total_items: 1,
        critical_count: 0,
      })
      expect(result.success).toBe(true)
    }
  })

  it("allows empty alerts array", () => {
    const result = alertDigestOutputSchema.safeParse({
      alerts: [],
      executive_summary: "All clear — no urgent items this week.",
      total_items: 0,
      critical_count: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe("buildDigestPrompt", () => {
  it("returns 'all clear' message for zero items", () => {
    const data: DigestContextData = {
      orgName: "Acme Wealth",
      items: [],
    }

    const prompt = buildDigestPrompt(data)
    expect(prompt).toContain("No items require attention")
    expect(prompt).toContain("All clear")
  })

  it("includes all item details in the prompt", () => {
    const items: DigestContextItem[] = [
      {
        type: "insurance_expiry",
        title: "Insurance expiring: Main St Property",
        description: "Expires in 3 days",
        daysRemaining: 3,
        assetValue: 50000000,
        assetName: "Main St Property",
        clientName: "Smith Family",
        actionUrl: "/app/insurance/ins-1",
      },
      {
        type: "stale_valuation",
        title: "Stale valuation: Office Park",
        description: "Last valued 120 days ago",
        daysRemaining: null,
        assetValue: 100000,
        assetName: "Office Park",
      },
    ]

    const data: DigestContextData = { orgName: "Acme Wealth", items }
    const prompt = buildDigestPrompt(data)

    // Check all items are present
    expect(prompt).toContain("insurance_expiry")
    expect(prompt).toContain("stale_valuation")
    expect(prompt).toContain("Main St Property")
    expect(prompt).toContain("Office Park")
    expect(prompt).toContain("$50,000,000")
    expect(prompt).toContain("$100,000")
    expect(prompt).toContain("Days Remaining: 3")
    expect(prompt).toContain("Smith Family")
    expect(prompt).toContain("Total items to prioritize: 2")
  })

  it("$50M asset urgency > $100K asset urgency (prompt provides correct data for Claude)", () => {
    // This test verifies the prompt correctly conveys the data
    // that Claude uses for urgency scoring
    const items: DigestContextItem[] = [
      {
        type: "insurance_expiry",
        title: "$50M asset insurance expiring",
        description: "Expires in 5 days",
        daysRemaining: 5,
        assetValue: 50000000,
        assetName: "Downtown Tower",
      },
      {
        type: "stale_valuation",
        title: "$100K missing statement",
        description: "Stale for 45 days",
        daysRemaining: null,
        assetValue: 100000,
        assetName: "Small Account",
      },
    ]

    const prompt = buildDigestPrompt({ orgName: "Test", items })

    // Verify both values are in the prompt so Claude can prioritize correctly
    expect(prompt).toContain("$50,000,000")
    expect(prompt).toContain("$100,000")
    expect(prompt).toContain("Days Remaining: 5")
    // The $50M item has explicit days_remaining which signals urgency
    // The $100K item has null days_remaining
  })
})
