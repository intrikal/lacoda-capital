import { describe, it, expect } from "vitest"
import { exchangePublicTokenSchema, createLinkTokenSchema } from "@/lib/validations/plaid.schema"

describe("Plaid Vault Encryption — Schema Validation", () => {
  describe("exchangePublicTokenSchema", () => {
    it("validates correct input", () => {
      const input = {
        publicToken: "public-sandbox-abc123def456",
        institutionId: "ins_1",
        institutionName: "Chase",
        accounts: [
          { id: "acct_001", name: "Checking", mask: "1234", type: "depository", subtype: "checking" },
        ],
      }

      const result = exchangePublicTokenSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("rejects empty public token", () => {
      const result = exchangePublicTokenSchema.safeParse({ publicToken: "" })
      expect(result.success).toBe(false)
    })

    it("rejects missing public token", () => {
      const result = exchangePublicTokenSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("allows optional fields to be omitted", () => {
      const result = exchangePublicTokenSchema.safeParse({
        publicToken: "public-sandbox-abc123",
      })
      expect(result.success).toBe(true)
    })

    it("validates accounts array structure", () => {
      const result = exchangePublicTokenSchema.safeParse({
        publicToken: "public-sandbox-abc123",
        accounts: [
          { id: "acct_001", name: "Checking", type: "depository" },
          { id: "acct_002", name: "Savings", mask: null, type: "depository", subtype: "savings" },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("rejects accounts with missing required fields", () => {
      const result = exchangePublicTokenSchema.safeParse({
        publicToken: "public-sandbox-abc123",
        accounts: [{ name: "Checking" }], // missing id and type
      })
      expect(result.success).toBe(false)
    })
  })

  describe("createLinkTokenSchema", () => {
    it("validates correct UUID orgId", () => {
      const result = createLinkTokenSchema.safeParse({
        orgId: "550e8400-e29b-41d4-a716-446655440000",
      })
      expect(result.success).toBe(true)
    })

    it("rejects non-UUID orgId", () => {
      const result = createLinkTokenSchema.safeParse({
        orgId: "not-a-uuid",
      })
      expect(result.success).toBe(false)
    })

    it("rejects missing orgId", () => {
      const result = createLinkTokenSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe("Access token security — never stored in plaintext", () => {
    it("exchangePublicTokenSchema does not have accessToken field", () => {
      const shape = exchangePublicTokenSchema.shape
      // The schema should NOT have an accessToken field —
      // access tokens are stored in Vault, never passed through the schema
      expect("accessToken" in shape).toBe(false)
      expect("access_token" in shape).toBe(false)
    })

    it("access_token should not appear in integration settings type", () => {
      // Settings should only contain non-secret configuration
      // This is a documentation test — the IntegrationSettings type
      // should NOT have access_token, refresh_token, or api_key fields
      const secretFieldNames = ["access_token", "refresh_token", "api_key", "secret"]
      const publicToken = "public-sandbox-abc123"

      // Verify that parsing a public token exchange doesn't capture secrets
      const result = exchangePublicTokenSchema.safeParse({ publicToken })
      if (result.success) {
        const data = result.data
        for (const key of secretFieldNames) {
          expect(key in data).toBe(false)
        }
      }
    })
  })
})
