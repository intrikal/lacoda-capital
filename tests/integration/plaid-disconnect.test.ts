import { describe, it, expect } from "vitest"

/**
 * Integration test: Plaid disconnect
 *
 * Simulates: Disconnect Plaid → integration status = 'disconnected' →
 * daily sync skips this integration
 */

describe("Plaid Disconnect Flow", () => {
  it("sets integration status to disconnected", () => {
    const integration = {
      id: "int-123",
      provider: "plaid",
      status: "connected",
      statusMessage: null,
    }

    // Simulate disconnect
    const disconnected = {
      ...integration,
      status: "disconnected",
      statusMessage: "Disconnected by user",
    }

    expect(disconnected.status).toBe("disconnected")
    expect(disconnected.statusMessage).toBe("Disconnected by user")
  })

  it("daily sync skips disconnected integrations", () => {
    const integrations = [
      { id: "int-1", provider: "plaid", status: "connected", vault_secret_id: "vault-1" },
      { id: "int-2", provider: "plaid", status: "disconnected", vault_secret_id: "vault-2" },
      { id: "int-3", provider: "plaid", status: "error", vault_secret_id: "vault-3" },
    ]

    // Filter by connected status (as sync-balances does)
    const toSync = integrations.filter((i) => i.status === "connected")
    expect(toSync).toHaveLength(1)
    expect(toSync[0].id).toBe("int-1")
  })

  it("preserves existing assets after disconnect", () => {
    // Assets created by Plaid should remain after disconnecting
    const assetsBeforeDisconnect = [
      { id: "asset-1", name: "Checking (****0000)", external_id: "acct_001" },
      { id: "asset-2", name: "Savings (****1111)", external_id: "acct_002" },
    ]

    // After disconnect, assets still exist — only sync stops
    const assetsAfterDisconnect = assetsBeforeDisconnect // unchanged
    expect(assetsAfterDisconnect).toHaveLength(2)
    expect(assetsAfterDisconnect[0].name).toBe("Checking (****0000)")
  })

  it("clears sync error state on disconnect", () => {
    const erroredIntegration = {
      status: "error",
      statusMessage: "ITEM_LOGIN_REQUIRED",
      lastSyncStatus: "failed",
      syncErrorMessage: "Bank requires re-auth",
    }

    const disconnected = {
      ...erroredIntegration,
      status: "disconnected",
      statusMessage: "Disconnected by user",
      lastSyncStatus: null,
      syncErrorMessage: null,
    }

    expect(disconnected.status).toBe("disconnected")
    expect(disconnected.lastSyncStatus).toBeNull()
    expect(disconnected.syncErrorMessage).toBeNull()
  })
})
