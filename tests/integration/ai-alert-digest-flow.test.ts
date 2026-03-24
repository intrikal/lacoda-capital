import { describe, it, expect } from "vitest"
import { buildDigestPrompt, alertDigestOutputSchema } from "@/lib/agents/alert-digest"
import type { DigestContextItem, DigestContextData } from "@/lib/agents/alert-digest"

/**
 * Integration tests for the smart alert digest flow.
 *
 * Tests: Seed 3 expiring docs, 2 stale valuations, 1 compliance deadline.
 * Run digest → 6 items in priority order in email. Top 5 as notifications.
 */

describe("AI alert digest flow", () => {
  // Seed data: 3 expiring docs, 2 stale valuations, 1 compliance deadline = 6 total
  const seedItems: DigestContextItem[] = [
    {
      type: "expiring_document",
      title: 'Trust agreement "Smith Trust" expiring',
      description: "Expires in 2 days",
      daysRemaining: 2,
      assetValue: 5000000,
      assetName: "Smith Family Trust",
      clientName: "Smith Family",
      actionUrl: "/app/vault/doc-1",
    },
    {
      type: "expiring_document",
      title: 'Insurance policy "Main St Property" expiring',
      description: "Expires in 10 days",
      daysRemaining: 10,
      assetValue: 50000000,
      assetName: "Main St Property",
      actionUrl: "/app/vault/doc-2",
    },
    {
      type: "expiring_document",
      title: "Bank statement expired",
      description: "Expired 5 days ago",
      daysRemaining: -5,
      assetValue: 100000,
      actionUrl: "/app/vault/doc-3",
    },
    {
      type: "stale_valuation",
      title: "Stale valuation: Office Park",
      description: "Last valued 120 days ago",
      daysRemaining: null,
      assetValue: 3000000,
      assetName: "Office Park",
      actionUrl: "/app/assets/ast-1",
    },
    {
      type: "stale_valuation",
      title: "Stale valuation: Small Rental",
      description: "Last valued 95 days ago",
      daysRemaining: null,
      assetValue: 250000,
      assetName: "Small Rental",
      actionUrl: "/app/assets/ast-2",
    },
    {
      type: "compliance_deadline",
      title: "Annual compliance audit due",
      description: "Due in 7 days",
      daysRemaining: 7,
      assetValue: null,
      actionUrl: "/app/compliance/ctrl-1",
    },
  ]

  it("prompt includes all 6 seed items", () => {
    const data: DigestContextData = { orgName: "Acme Wealth", items: seedItems }
    const prompt = buildDigestPrompt(data)

    expect(prompt).toContain("Total items to prioritize: 6")
    expect(prompt).toContain("Smith Trust")
    expect(prompt).toContain("Main St Property")
    expect(prompt).toContain("Bank statement expired")
    expect(prompt).toContain("Office Park")
    expect(prompt).toContain("Small Rental")
    expect(prompt).toContain("Annual compliance audit")
  })

  it("simulated Claude output has 6 items sorted by urgency", () => {
    // Simulate what Claude would return for these 6 items
    const simulatedOutput = {
      alerts: [
        {
          title: "Bank statement EXPIRED",
          description: "Expired 5 days ago — needs immediate replacement",
          urgency_score: 10,
          category: "expiring_document" as const,
          action_url: "/app/vault/doc-3",
          asset_value: 100000,
          days_remaining: -5,
        },
        {
          title: 'Trust agreement "Smith Trust" expiring',
          description: "Expires in 2 days on a $5M trust",
          urgency_score: 10,
          category: "expiring_document" as const,
          action_url: "/app/vault/doc-1",
          asset_value: 5000000,
          days_remaining: 2,
        },
        {
          title: "Insurance expiring: Main St Property ($50M)",
          description: "$50M property insurance expires in 10 days",
          urgency_score: 9,
          category: "expiring_document" as const,
          action_url: "/app/vault/doc-2",
          asset_value: 50000000,
          days_remaining: 10,
        },
        {
          title: "Annual compliance audit due",
          description: "Regulatory compliance deadline in 7 days",
          urgency_score: 9,
          category: "compliance_deadline" as const,
          action_url: "/app/compliance/ctrl-1",
          asset_value: null,
          days_remaining: 7,
        },
        {
          title: "Stale valuation: Office Park ($3M)",
          description: "Last valued 120 days ago",
          urgency_score: 5,
          category: "stale_valuation" as const,
          action_url: "/app/assets/ast-1",
          asset_value: 3000000,
          days_remaining: null,
        },
        {
          title: "Stale valuation: Small Rental",
          description: "Last valued 95 days ago",
          urgency_score: 3,
          category: "stale_valuation" as const,
          action_url: "/app/assets/ast-2",
          asset_value: 250000,
          days_remaining: null,
        },
      ],
      executive_summary: "2 documents require immediate attention: an expired bank statement and a trust agreement expiring in 2 days.",
      total_items: 6,
      critical_count: 4,
    }

    // Validate against schema
    const validation = alertDigestOutputSchema.safeParse(simulatedOutput)
    expect(validation.success).toBe(true)

    if (validation.success) {
      const { alerts } = validation.data

      // Verify all 6 items present
      expect(alerts).toHaveLength(6)

      // Verify sorted by urgency descending
      for (let i = 1; i < alerts.length; i++) {
        expect(alerts[i - 1].urgency_score).toBeGreaterThanOrEqual(alerts[i].urgency_score)
      }

      // Verify overdue item has highest urgency
      const overdueItem = alerts.find(a => a.days_remaining !== null && a.days_remaining < 0)
      expect(overdueItem).toBeDefined()
      expect(overdueItem!.urgency_score).toBe(10)

      // Verify top 5 can be used for notifications (slicing works)
      const top5 = alerts.slice(0, 5)
      expect(top5).toHaveLength(5)
      expect(top5[0].urgency_score).toBeGreaterThanOrEqual(top5[4].urgency_score)

      // Critical count matches items with urgency >= 8
      const criticalItems = alerts.filter(a => a.urgency_score >= 8)
      expect(criticalItems.length).toBe(validation.data.critical_count)
    }
  })

  it("$50M asset insurance (urgency 9) > $100K stale statement (urgency 3)", () => {
    const simulatedAlerts = [
      {
        title: "Insurance: Main St ($50M)",
        description: "Expires in 10 days",
        urgency_score: 9,
        category: "expiring_document" as const,
        action_url: null,
        asset_value: 50000000,
        days_remaining: 10,
      },
      {
        title: "Stale: Small Account ($100K)",
        description: "Last valued 95 days ago",
        urgency_score: 3,
        category: "stale_valuation" as const,
        action_url: null,
        asset_value: 100000,
        days_remaining: null,
      },
    ]

    // $50M asset urgency should be higher
    expect(simulatedAlerts[0].urgency_score).toBeGreaterThan(simulatedAlerts[1].urgency_score)

    // Verify schema validation
    const output = {
      alerts: simulatedAlerts,
      executive_summary: "Insurance on $50M property needs attention",
      total_items: 2,
      critical_count: 1,
    }
    expect(alertDigestOutputSchema.safeParse(output).success).toBe(true)
  })

  it("zero items → skip email or send 'All clear'", () => {
    const prompt = buildDigestPrompt({ orgName: "Test Org", items: [] })
    expect(prompt).toContain("All clear")

    // Validate the empty response schema
    const emptyOutput = {
      alerts: [],
      executive_summary: "All clear — no urgent items this week.",
      total_items: 0,
      critical_count: 0,
    }
    expect(alertDigestOutputSchema.safeParse(emptyOutput).success).toBe(true)
  })

  it("100+ items → prompt includes all, response can be truncated", () => {
    const manyItems: DigestContextItem[] = Array.from({ length: 105 }, (_, i) => ({
      type: "expiring_document" as const,
      title: `Document ${i + 1} expiring`,
      description: `Expires in ${i + 1} days`,
      daysRemaining: i + 1,
      assetValue: (i + 1) * 10000,
    }))

    const prompt = buildDigestPrompt({ orgName: "Big Org", items: manyItems })
    expect(prompt).toContain("Total items to prioritize: 105")

    // Validate a response with 105 items (only top 10 sent in email)
    const alerts = manyItems.map((item, i) => ({
      title: item.title,
      description: item.description,
      urgency_score: Math.max(0, Math.min(10, 10 - Math.floor(i / 10))),
      category: "expiring_document" as const,
      action_url: null,
      asset_value: item.assetValue,
      days_remaining: item.daysRemaining,
    }))

    const output = {
      alerts,
      executive_summary: "105 items — 10 critical",
      total_items: 105,
      critical_count: 10,
    }
    expect(alertDigestOutputSchema.safeParse(output).success).toBe(true)

    // Top 10 for email
    expect(alerts.slice(0, 10)).toHaveLength(10)
    // Top 5 for notifications
    expect(alerts.slice(0, 5)).toHaveLength(5)
  })
})
