/**
 * ============================================================================
 * TEST FILE: plaid-vault-encryption.test.ts
 * ============================================================================
 *
 * Kevin, this file tests everything around how we store and protect Plaid's
 * access tokens. This is one of the most security-critical parts of the app.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY ACCESS TOKEN SECURITY MATTERS                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ A Plaid access_token is like a permanent key to someone's bank account. │
 * │ If it leaks:                                                            │
 * │   - Anyone with it can read that person's account balances              │
 * │   - Anyone with it can read their transaction history                  │
 * │   - In some cases, initiate transfers                                   │
 * │                                                                         │
 * │ We MUST never:                                                          │
 * │   - Send the access_token to the browser/client                        │
 * │   - Log it to console                                                   │
 * │   - Store it in plain text in a readable column                        │
 * │   - Include it in API responses                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW WE STORE TOKENS                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Current implementation (plaid.ts):                                      │
 * │   - Stored in the JSONB "settings" column as settings._access_token     │
 * │   - The underscore prefix (_) marks it as secret                       │
 * │   - stripSecrets() in integration.actions.ts removes all _ keys        │
 * │     before sending data to the client                                   │
 * │                                                                         │
 * │ Planned implementation (TODO in plaid.ts):                             │
 * │   - Store in Supabase Vault (encrypted at rest, access controlled)     │
 * │   - Only store vault_secret_id in the integrations table               │
 * │   - Retrieve from Vault only on the server when needed                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/actions/integration.actions.ts — stripSecrets() helper
 *   lib/integrations/plaid.ts          — stores _access_token in settings
 *
 * TESTING APPROACH:
 *   These are pure-function unit tests. We test the stripSecrets() logic
 *   and the token-redaction behavior in isolation — no DB or network calls.
 */

import { describe, it, expect } from "vitest"

// ─── The function under test ──────────────────────────────────────────────
//
// stripSecrets() lives in lib/actions/integration.actions.ts.
// We replicate it here to test in isolation. When you add tests that
// import from the actual module, replace this definition with an import.

/**
 * Remove keys starting with "_" from a settings object.
 * These keys hold secrets (access tokens, refresh tokens, etc.)
 * that must never be sent to the browser.
 *
 * @param settings - The raw JSONB settings from the DB (may be null)
 * @returns A clean copy with all secret keys removed, or null if input is null
 */
function stripSecrets(
  settings: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (settings === null || settings === undefined) return null

  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith("_")) {
      clean[key] = value
    }
  }
  return clean
}

// ─── Token format validators ──────────────────────────────────────────────

/**
 * Check if a string looks like a Plaid access token.
 * Used to detect accidental token leaks.
 */
function looksLikePlaidAccessToken(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("access-")
}

/**
 * Scan an object (recursively) for anything that looks like a Plaid token.
 * Used to audit API responses before sending to client.
 */
function containsPlaidToken(obj: unknown): boolean {
  if (looksLikePlaidAccessToken(obj)) return true
  if (typeof obj !== "object" || obj === null) return false

  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (containsPlaidToken(value)) return true
  }
  return false
}

// ============================================================================
// 1. stripSecrets() — core behavior
// ============================================================================

describe("stripSecrets() — removes underscore-prefixed keys", () => {
  it("removes a single _access_token key", () => {
    const settings = {
      environment: "sandbox",
      _access_token: "access-sandbox-abc123def456",
    }
    const clean = stripSecrets(settings)

    expect(clean).not.toHaveProperty("_access_token")
    expect(clean).toHaveProperty("environment", "sandbox")
  })

  it("removes _refresh_token key", () => {
    const settings = {
      syncFrequency: "daily",
      _refresh_token: "refresh-token-xyz789",
    }
    const clean = stripSecrets(settings)
    expect(clean).not.toHaveProperty("_refresh_token")
    expect(clean).toHaveProperty("syncFrequency", "daily")
  })

  it("removes multiple _ prefixed keys at once", () => {
    const settings = {
      environment: "production",
      _access_token: "access-production-abc",
      _item_id: "item_private_id",
      _webhook_secret: "wh_secret_xyz",
      displayName: "Chase Bank",
    }
    const clean = stripSecrets(settings)

    expect(clean).not.toHaveProperty("_access_token")
    expect(clean).not.toHaveProperty("_item_id")
    expect(clean).not.toHaveProperty("_webhook_secret")
    expect(clean).toHaveProperty("environment", "production")
    expect(clean).toHaveProperty("displayName", "Chase Bank")
  })

  it("returns an empty object when all keys are secrets", () => {
    const settings = {
      _access_token: "access-sandbox-abc",
      _refresh_token: "refresh-xyz",
    }
    const clean = stripSecrets(settings)
    expect(clean).toEqual({})
  })

  it("returns all keys intact when none start with _", () => {
    const settings = {
      environment: "sandbox",
      products: ["auth", "transactions"],
      syncFrequency: "daily",
    }
    const clean = stripSecrets(settings)
    expect(clean).toEqual(settings)
  })

  it("returns null when settings is null", () => {
    expect(stripSecrets(null)).toBeNull()
  })

  it("returns empty object when settings is empty", () => {
    expect(stripSecrets({})).toEqual({})
  })

  it("preserves non-underscore keys that CONTAIN underscores (not prefix)", () => {
    // "sync_frequency" is fine — only LEADING underscore is secret marker
    const settings = {
      sync_frequency: "daily",
      account_ids: ["acct_001", "acct_002"],
      _access_token: "access-sandbox-abc",
    }
    const clean = stripSecrets(settings)

    expect(clean).toHaveProperty("sync_frequency", "daily")
    expect(clean).toHaveProperty("account_ids")
    expect(clean).not.toHaveProperty("_access_token")
  })

  it("does not mutate the original settings object", () => {
    const original = {
      environment: "sandbox",
      _access_token: "access-sandbox-abc",
    }
    const originalCopy = { ...original }
    stripSecrets(original)

    // Original should be unchanged
    expect(original).toEqual(originalCopy)
  })
})

// ============================================================================
// 2. Token format detection
// ============================================================================

describe("looksLikePlaidAccessToken() — token format detection", () => {
  it("detects a sandbox access token", () => {
    expect(looksLikePlaidAccessToken("access-sandbox-abc123def")).toBe(true)
  })

  it("detects a production access token", () => {
    expect(looksLikePlaidAccessToken("access-production-abc123def")).toBe(true)
  })

  it("does NOT flag a public token (different prefix)", () => {
    expect(looksLikePlaidAccessToken("public-sandbox-abc123def")).toBe(false)
  })

  it("does NOT flag a normal string", () => {
    expect(looksLikePlaidAccessToken("Chase Checking Account")).toBe(false)
  })

  it("does NOT flag a number", () => {
    expect(looksLikePlaidAccessToken(12345)).toBe(false)
  })

  it("does NOT flag null", () => {
    expect(looksLikePlaidAccessToken(null)).toBe(false)
  })

  it("does NOT flag undefined", () => {
    expect(looksLikePlaidAccessToken(undefined)).toBe(false)
  })

  it("does NOT flag empty string", () => {
    expect(looksLikePlaidAccessToken("")).toBe(false)
  })
})

// ============================================================================
// 3. containsPlaidToken() — deep scan for leaked tokens
// ============================================================================

describe("containsPlaidToken() — scan for accidentally included tokens", () => {
  it("detects a token directly in a string", () => {
    expect(containsPlaidToken("access-sandbox-abc123")).toBe(true)
  })

  it("detects a token nested in an object", () => {
    const obj = {
      id: "intg_001",
      settings: {
        environment: "sandbox",
        token: "access-sandbox-abc123",
      },
    }
    expect(containsPlaidToken(obj)).toBe(true)
  })

  it("returns false when no token present", () => {
    const obj = {
      id: "intg_001",
      provider: "plaid",
      status: "connected",
      settings: {
        environment: "sandbox",
        products: ["auth", "transactions"],
      },
    }
    expect(containsPlaidToken(obj)).toBe(false)
  })

  it("returns false for null", () => {
    expect(containsPlaidToken(null)).toBe(false)
  })

  it("returns false for a clean stripped response", () => {
    // Simulates what getIntegration() returns after stripSecrets()
    const clientSafeRecord = {
      id: "intg_001",
      provider: "plaid",
      name: "Chase Bank",
      status: "connected",
      settings: {
        environment: "sandbox",
        products: ["auth", "transactions"],
      },
    }
    expect(containsPlaidToken(clientSafeRecord)).toBe(false)
  })
})

// ============================================================================
// 4. stripSecrets() + token audit — combined safety check
// ============================================================================

describe("stripSecrets() + containsPlaidToken() safety audit", () => {
  it("stripped settings never contain a Plaid access token", () => {
    const rawSettings = {
      environment: "production",
      products: ["auth", "investments"],
      _access_token: "access-production-abc123def456",
      _item_id: "item_private_xyz",
    }

    const clean = stripSecrets(rawSettings)
    expect(containsPlaidToken(clean)).toBe(false)
  })

  it("a full integration record stripped of secrets passes the audit", () => {
    // Simulates the full record as returned from DB before being sent to client
    const rawRecord = {
      id: "intg_001",
      orgId: "org_abc",
      provider: "plaid",
      name: "Chase Bank",
      status: "connected",
      settings: {
        environment: "sandbox",
        products: ["auth", "transactions"],
        _access_token: "access-sandbox-abc123def456",
      },
    }

    const clientRecord = {
      ...rawRecord,
      settings: stripSecrets(rawRecord.settings),
    }

    expect(containsPlaidToken(clientRecord)).toBe(false)
    expect(clientRecord.settings).toHaveProperty("environment")
    expect(clientRecord.settings).not.toHaveProperty("_access_token")
  })
})

// ============================================================================
// 5. Vault secret ID tracking
// ============================================================================
//
// When we migrate to Supabase Vault (the TODO in plaid.ts), the integration
// record will have a vault_secret_id instead of _access_token in settings.
// These tests define what that transition should look like.

describe("vault_secret_id — planned migration behavior", () => {
  it("a vault-based integration record has vault_secret_id set", () => {
    // Once migrated: the access_token is NOT in settings, only vault_secret_id on the record
    const vaultBasedRecord = {
      id: "intg_001",
      provider: "plaid",
      name: "Chase Bank",
      status: "connected",
      vault_secret_id: "vault/org_abc/plaid/intg_001",
      settings: {
        environment: "production",
        products: ["auth", "investments"],
        // No _access_token here — it's in Vault
      },
    }

    expect(vaultBasedRecord.vault_secret_id).toBeTruthy()
    expect(vaultBasedRecord.settings).not.toHaveProperty("_access_token")
    expect(containsPlaidToken(vaultBasedRecord)).toBe(false)
  })

  it("a legacy settings-based record (pre-Vault) has _access_token in settings", () => {
    const legacyRecord = {
      id: "intg_001",
      provider: "plaid",
      name: "Chase Bank",
      status: "connected",
      vault_secret_id: null, // Not yet migrated
      settings: {
        environment: "sandbox",
        _access_token: "access-sandbox-abc123",
      },
    }

    expect(legacyRecord.vault_secret_id).toBeNull()
    // The raw record has the token — it should be stripped before sending to client
    expect(containsPlaidToken(legacyRecord.settings)).toBe(true)
    // After stripping, it's safe
    expect(containsPlaidToken(stripSecrets(legacyRecord.settings))).toBe(false)
  })

  it("vault secret ID follows a predictable naming pattern", () => {
    // vault_secret_id should encode org + provider + integration for auditability
    const orgId = "org_abc123"
    const integrationId = "intg_xyz789"
    const vaultSecretId = `plaid/${orgId}/${integrationId}`

    // Pattern: provider/orgId/integrationId
    expect(vaultSecretId).toMatch(/^plaid\/org_/)
    expect(vaultSecretId).toContain(orgId)
    expect(vaultSecretId).toContain(integrationId)
  })
})

// ============================================================================
// 6. Access token retrieval — server-only guard
// ============================================================================

describe("access token retrieval — server guard patterns", () => {
  /**
   * The getAccessToken() pattern used in plaid.ts reads the token from
   * settings._access_token. It must ONLY be called server-side and should
   * throw (not return undefined) when the token is missing.
   */

  function getAccessTokenFromSettings(
    settings: Record<string, unknown> | null,
  ): string {
    if (!settings) throw new Error("No settings found for integration")
    const token = settings._access_token
    if (!token || typeof token !== "string") {
      throw new Error("No access token found for this integration")
    }
    return token
  }

  it("returns the access token when present", () => {
    const settings = { _access_token: "access-sandbox-abc123" }
    expect(getAccessTokenFromSettings(settings)).toBe("access-sandbox-abc123")
  })

  it("throws when _access_token is missing from settings", () => {
    const settings = { environment: "sandbox" }
    expect(() => getAccessTokenFromSettings(settings)).toThrow("No access token")
  })

  it("throws when settings is null", () => {
    expect(() => getAccessTokenFromSettings(null)).toThrow()
  })

  it("throws when _access_token is empty string", () => {
    const settings = { _access_token: "" }
    expect(() => getAccessTokenFromSettings(settings)).toThrow()
  })

  it("throws when _access_token is not a string (corrupted data)", () => {
    const settings = { _access_token: 12345 }
    expect(() => getAccessTokenFromSettings(settings)).toThrow()
  })

  it("throws when _access_token is null", () => {
    const settings = { _access_token: null }
    expect(() => getAccessTokenFromSettings(settings)).toThrow()
  })
})

// ============================================================================
// 7. Settings object shapes — what safe vs unsafe looks like
// ============================================================================

describe("settings object shapes — safe vs unsafe patterns", () => {
  it("a SAFE settings object (ready to send to client) has no _ keys", () => {
    const safe = {
      environment: "production",
      products: ["auth", "investments"],
      syncFrequency: "daily",
      accountIds: ["acct_001"],
    }
    const hasSecretKeys = Object.keys(safe).some((k) => k.startsWith("_"))
    expect(hasSecretKeys).toBe(false)
  })

  it("an UNSAFE settings object (raw from DB) may have _ keys", () => {
    const unsafe = {
      environment: "production",
      _access_token: "access-production-abc123",
    }
    const hasSecretKeys = Object.keys(unsafe).some((k) => k.startsWith("_"))
    expect(hasSecretKeys).toBe(true)
  })

  it("stripping an already-clean settings object is a no-op", () => {
    const clean = {
      environment: "sandbox",
      products: ["auth"],
    }
    expect(stripSecrets(clean)).toEqual(clean)
  })
})
