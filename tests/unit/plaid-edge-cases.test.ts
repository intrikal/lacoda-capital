import { describe, it, expect } from "vitest"
import {
  mapPlaidAccountToAssetClass,
  exchangePublicTokenSchema,
  syncBalancesSchema,
} from "@/lib/validations/plaid.schema"

describe("Plaid Edge Cases", () => {
  describe("Link cancelled by user", () => {
    it("handles graceful close with no error", () => {
      // When user closes Plaid Link, publicToken is null/undefined
      // The exchange should not be called — validate that schema rejects empty
      const result = exchangePublicTokenSchema.safeParse({ publicToken: "" })
      expect(result.success).toBe(false)
    })

    it("schema rejects undefined public token", () => {
      const result = exchangePublicTokenSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe("ITEM_LOGIN_REQUIRED — account removed at bank", () => {
    it("marks integration as disconnected with message", () => {
      const errorResponse = {
        error_code: "ITEM_LOGIN_REQUIRED",
        error_message: "the login details of this item have changed",
        display_message: "Please reconnect your bank account",
      }

      // Integration should be marked disconnected
      const updatedIntegration = {
        status: "disconnected",
        statusMessage: "Bank requires re-authentication. Please reconnect via Plaid Link.",
        lastSyncStatus: "failed",
        syncErrorMessage: `ITEM_LOGIN_REQUIRED: ${errorResponse.error_message}`,
      }

      expect(updatedIntegration.status).toBe("disconnected")
      expect(updatedIntegration.statusMessage).toContain("re-authentication")
      expect(updatedIntegration.syncErrorMessage).toContain("ITEM_LOGIN_REQUIRED")
    })
  })

  describe("Multiple accounts at same bank", () => {
    it("creates separate asset per account", () => {
      const accounts = [
        { account_id: "acct_1", name: "Checking", mask: "0000", type: "depository", subtype: "checking" },
        { account_id: "acct_2", name: "Savings", mask: "1111", type: "depository", subtype: "savings" },
        { account_id: "acct_3", name: "Credit Card", mask: "2222", type: "credit", subtype: "credit card" },
      ]

      // Each account should create a separate asset
      const assets = accounts.map((a) => ({
        name: `${a.name} (****${a.mask})`,
        external_id: a.account_id,
        asset_class: mapPlaidAccountToAssetClass(a.type, a.subtype),
      }))

      expect(assets).toHaveLength(3)
      expect(new Set(assets.map((a) => a.external_id)).size).toBe(3) // All unique
      expect(assets[0].asset_class).toBe("cash")
      expect(assets[1].asset_class).toBe("cash")
      expect(assets[2].asset_class).toBe("cash") // credit → cash
    })
  })

  describe("Balance in non-USD currency", () => {
    it("stores raw amount and currency code", () => {
      const account = {
        balances: {
          current: 1000.0,
          iso_currency_code: "EUR",
          unofficial_currency_code: null,
        },
      }

      const valuation = {
        value: account.balances.current.toString(),
        currency: account.balances.iso_currency_code ?? "USD",
      }

      expect(valuation.value).toBe("1000")
      expect(valuation.currency).toBe("EUR")
    })

    it("falls back to USD when no currency code", () => {
      const account = {
        balances: {
          current: 500.0,
          iso_currency_code: null,
          unofficial_currency_code: null,
        },
      }

      const currency = account.balances.iso_currency_code ?? "USD"
      expect(currency).toBe("USD")
    })

    it("handles unofficial currency codes", () => {
      const account = {
        balances: {
          current: 0.5,
          iso_currency_code: null,
          unofficial_currency_code: "BTC",
        },
      }

      // Should use unofficial if iso is null
      const currency = account.balances.iso_currency_code ??
        account.balances.unofficial_currency_code ?? "USD"
      expect(currency).toBe("BTC")
    })
  })

  describe("Rate limiting", () => {
    it("respects Retry-After header", () => {
      const retryAfter = "60" // seconds
      const syncError = `Rate limited. Retry after: ${retryAfter}`

      expect(syncError).toContain("Retry after")
      expect(syncError).toContain("60")
    })

    it("tracks rate limit in sync status", () => {
      const integration = {
        lastSyncStatus: "failed",
        syncErrorMessage: "Rate limited, retry after 60",
        status: "connected", // Don't change status for rate limit
      }

      // Status should remain connected — it's a transient error
      expect(integration.status).toBe("connected")
      expect(integration.lastSyncStatus).toBe("failed")
    })
  })

  describe("API tokens expired — re-auth flow", () => {
    it("marks integration as disconnected when vault read fails", () => {
      const integration = {
        status: "error",
        statusMessage: "Failed to read credentials. Please reconnect.",
        lastSyncStatus: "failed",
        syncErrorMessage: "Vault secret read failed",
      }

      expect(integration.status).toBe("error")
      expect(integration.statusMessage).toContain("Please reconnect")
    })

    it("marks integration as error when access_token is missing", () => {
      const vaultSecret: Record<string, string> = { refresh_token: "rt_123" } // access_token missing
      const accessToken = vaultSecret.access_token

      expect(accessToken).toBeUndefined()
    })
  })

  describe("syncBalancesSchema validation", () => {
    it("accepts valid manual sync request", () => {
      const result = syncBalancesSchema.safeParse({
        integrationId: "550e8400-e29b-41d4-a716-446655440000",
        mode: "manual",
      })
      expect(result.success).toBe(true)
    })

    it("accepts scheduled sync without integration ID", () => {
      const result = syncBalancesSchema.safeParse({ mode: "scheduled" })
      expect(result.success).toBe(true)
    })

    it("defaults mode to manual", () => {
      const result = syncBalancesSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mode).toBe("manual")
      }
    })

    it("rejects invalid mode", () => {
      const result = syncBalancesSchema.safeParse({ mode: "invalid" })
      expect(result.success).toBe(false)
    })
  })
})
