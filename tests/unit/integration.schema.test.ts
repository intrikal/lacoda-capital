import { describe, it, expect } from "vitest"
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  integrationProviderEnum,
  integrationStatusEnum,
} from "@/lib/validations/integration.schema"

// ============================================================================
// createIntegrationSchema
// ============================================================================

describe("createIntegrationSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Plaid Bank Connection",
      status: "connected",
      externalAccountId: "acct_abc123",
      externalItemId: "item_xyz789",
      settings: { webhook_url: "https://example.com/webhooks/plaid" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (only required fields)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "stripe",
      name: "Stripe Payments",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid providers", () => {
    const providers = [
      "stripe",
      "plaid",
      "docusign",
      "quickbooks",
      "google_drive",
      "google_calendar",
      "dropbox",
      "salesforce",
      "other",
    ]
    for (const provider of providers) {
      const result = createIntegrationSchema.safeParse({
        provider,
        name: `${provider} integration`,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts all valid statuses", () => {
    const statuses = ["connected", "disconnected", "error", "pending"]
    for (const status of statuses) {
      const result = createIntegrationSchema.safeParse({
        provider: "plaid",
        name: "Test Integration",
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing provider", () => {
    const result = createIntegrationSchema.safeParse({
      name: "Plaid Connection",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects invalid provider", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "twitter",
      name: "Twitter Integration",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Plaid Connection",
      status: "active",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-string name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: 42,
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects empty string name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name over 255 characters", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "A".repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "  Plaid Connection  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Plaid Connection")
    }
  })

  it("defaults status to disconnected", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Plaid Connection",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("disconnected")
    }
  })

  it("allows null externalAccountId", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Plaid Connection",
      externalAccountId: null,
    })
    expect(result.success).toBe(true)
  })

  it("allows null externalItemId", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Plaid Connection",
      externalItemId: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts settings as a record of unknown values", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "quickbooks",
      name: "QuickBooks Sync",
      settings: {
        realmId: "1234567890",
        syncFrequency: "daily",
        includeExpenses: true,
      },
    })
    expect(result.success).toBe(true)
  })

  it("optional fields can be omitted", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "docusign",
      name: "DocuSign eSignature",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.externalAccountId).toBeUndefined()
      expect(result.data.externalItemId).toBeUndefined()
      expect(result.data.settings).toBeUndefined()
    }
  })
})

// ============================================================================
// updateIntegrationSchema
// ============================================================================

describe("updateIntegrationSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts an empty object (all fields optional)", () => {
    const result = updateIntegrationSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with name only", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "Updated Integration Name",
    })
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status only", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "error",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a complete update payload", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "Updated Plaid",
      status: "connected",
      statusMessage: "Reconnected successfully",
      externalAccountId: "acct_new123",
      externalItemId: "item_new456",
      settings: { updated: true },
    })
    expect(result.success).toBe(true)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects invalid status", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "broken",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string name", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name over 255 characters", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "A".repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it("rejects statusMessage over 500 characters", () => {
    const result = updateIntegrationSchema.safeParse({
      statusMessage: "A".repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it("allows null statusMessage", () => {
    const result = updateIntegrationSchema.safeParse({
      statusMessage: null,
    })
    expect(result.success).toBe(true)
  })

  it("allows null externalAccountId and externalItemId", () => {
    const result = updateIntegrationSchema.safeParse({
      externalAccountId: null,
      externalItemId: null,
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Enum validators
// ============================================================================

describe("integrationProviderEnum", () => {
  it("accepts all valid providers", () => {
    const providers = [
      "stripe", "plaid", "docusign", "quickbooks",
      "google_drive", "google_calendar", "dropbox", "salesforce", "other",
    ]
    for (const provider of providers) {
      expect(integrationProviderEnum.safeParse(provider).success).toBe(true)
    }
  })

  it("rejects unknown provider", () => {
    expect(integrationProviderEnum.safeParse("venmo").success).toBe(false)
  })
})

describe("integrationStatusEnum", () => {
  it("accepts all valid statuses", () => {
    const statuses = ["connected", "disconnected", "error", "pending"]
    for (const status of statuses) {
      expect(integrationStatusEnum.safeParse(status).success).toBe(true)
    }
  })

  it("rejects unknown status", () => {
    expect(integrationStatusEnum.safeParse("active").success).toBe(false)
  })
})
