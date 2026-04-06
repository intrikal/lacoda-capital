/**
 * ============================================================================
 * TEST FILE: plaid.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the Zod validation schemas used in the Plaid
 * integration — the rules that check whether the data flowing in and out
 * of our Plaid functions is shaped correctly.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS ZOD?                                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Zod is a library that validates data at runtime. You describe the       │
 * │ shape you expect ("provider must be a string from this list, name       │
 * │ must be at least 1 character"), and Zod checks incoming data against   │
 * │ that description.                                                       │
 * │                                                                         │
 * │ .safeParse() — tries to validate, returns { success: true/false }      │
 * │   → If success, result.data holds the validated (possibly coerced)     │
 * │     version of the input.                                               │
 * │   → If failure, result.error describes what went wrong.                │
 * │   → Unlike .parse(), it does NOT throw — it always returns an object.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The Plaid integration reuses integration.schema.ts because there is    │
 * │ no separate plaid.schema.ts yet. We test:                              │
 * │                                                                         │
 * │ 1. createIntegrationSchema — validates a new integration record        │
 * │    - provider (enum: plaid, stripe, docusign, …)                       │
 * │    - name (non-empty string, max 255 chars)                            │
 * │    - status (enum: connected, disconnected, error, pending)            │
 * │    - externalAccountId (optional string — Plaid's item_id)             │
 * │    - externalItemId (optional string — Plaid's account_id)             │
 * │    - settings (optional JSONB — Plaid-specific config)                 │
 * │                                                                         │
 * │ 2. updateIntegrationSchema — validates updates to an existing record   │
 * │    - All fields optional (partial update)                              │
 * │    - statusMessage up to 500 chars                                     │
 * │                                                                         │
 * │ 3. Plaid-specific payload shapes — what we'd add in plaid.schema.ts:  │
 * │    - Public token format validation (public-sandbox-xxx)               │
 * │    - Account type mapping                                              │
 * │    - Balance payload shapes                                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/validations/integration.schema.ts — Zod schemas being tested
 *   lib/integrations/plaid.ts             — Uses these schemas
 *
 * See ledger-event.schema.test.ts for a full explanation of Vitest,
 * describe/it/expect, and testing fundamentals.
 */

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  integrationProviderEnum,
  integrationStatusEnum,
} from "@/lib/validations/integration.schema"

// ============================================================================
// 1. integrationProviderEnum
// ============================================================================

describe("integrationProviderEnum — valid values", () => {
  /**
   * TEST: Every declared provider value is accepted.
   *
   * WHY: If someone adds a new provider to the DB enum but forgets to add
   * it to the Zod enum, validation will silently reject it. This test
   * catches that drift early.
   */
  const validProviders = [
    "stripe",
    "plaid",
    "docusign",
    "quickbooks",
    "google_drive",
    "google_calendar",
    "dropbox",
    "salesforce",
    "other",
  ] as const

  for (const provider of validProviders) {
    it(`accepts provider "${provider}"`, () => {
      const result = integrationProviderEnum.safeParse(provider)
      expect(result.success).toBe(true)
    })
  }

  it("rejects an unknown provider string", () => {
    const result = integrationProviderEnum.safeParse("xero")
    expect(result.success).toBe(false)
  })

  it("rejects empty string", () => {
    const result = integrationProviderEnum.safeParse("")
    expect(result.success).toBe(false)
  })

  it("rejects null", () => {
    const result = integrationProviderEnum.safeParse(null)
    expect(result.success).toBe(false)
  })

  it("rejects undefined", () => {
    const result = integrationProviderEnum.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it("is case-sensitive — rejects 'Plaid' (capital P)", () => {
    const result = integrationProviderEnum.safeParse("Plaid")
    expect(result.success).toBe(false)
  })

  it("is case-sensitive — rejects 'PLAID' (all caps)", () => {
    const result = integrationProviderEnum.safeParse("PLAID")
    expect(result.success).toBe(false)
  })

  it("rejects a number", () => {
    const result = integrationProviderEnum.safeParse(1)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 2. integrationStatusEnum
// ============================================================================

describe("integrationStatusEnum — valid values", () => {
  const validStatuses = ["connected", "disconnected", "error", "pending"] as const

  for (const status of validStatuses) {
    it(`accepts status "${status}"`, () => {
      const result = integrationStatusEnum.safeParse(status)
      expect(result.success).toBe(true)
    })
  }

  it("rejects 'active' (not in enum)", () => {
    const result = integrationStatusEnum.safeParse("active")
    expect(result.success).toBe(false)
  })

  it("rejects 'inactive' (not in enum)", () => {
    const result = integrationStatusEnum.safeParse("inactive")
    expect(result.success).toBe(false)
  })

  it("rejects null", () => {
    const result = integrationStatusEnum.safeParse(null)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 3. createIntegrationSchema — MINIMAL VALID PAYLOAD
// ============================================================================

describe("createIntegrationSchema — minimal valid payload", () => {
  /**
   * The smallest valid payload: just provider + name. Everything else
   * has defaults or is optional.
   */
  it("accepts minimal payload with provider + name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Main Bank Connection",
    })
    expect(result.success).toBe(true)
  })

  it("defaults status to 'disconnected' when omitted", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Main Bank Connection",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("disconnected")
    }
  })
})

// ============================================================================
// 4. createIntegrationSchema — FULL VALID PAYLOAD
// ============================================================================

describe("createIntegrationSchema — full valid payload", () => {
  it("accepts a fully populated Plaid integration payload", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Chase — Main Checking",
      status: "connected",
      externalAccountId: "item_abc123def456",
      externalItemId: "acc_xyz789",
      settings: {
        environment: "sandbox",
        products: ["auth", "transactions", "investments"],
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid statuses in a full payload", () => {
    for (const status of ["connected", "disconnected", "error", "pending"] as const) {
      const result = createIntegrationSchema.safeParse({
        provider: "plaid",
        name: "Test Integration",
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts null for externalAccountId", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Bank Account",
      externalAccountId: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts null for externalItemId", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Bank Account",
      externalItemId: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts settings with Plaid-specific nested structure", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Bank Account",
      settings: {
        environment: "production",
        products: ["auth", "investments"],
        accountIds: ["acct_001", "acct_002"],
        webhookUrl: "https://example.com/webhooks/plaid",
      },
    })
    expect(result.success).toBe(true)
  })

  it("trims whitespace from name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "  Main Bank  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Main Bank")
    }
  })
})

// ============================================================================
// 5. createIntegrationSchema — MISSING REQUIRED FIELDS
// ============================================================================

describe("createIntegrationSchema — missing required fields", () => {
  /**
   * TEST: Each required field is removed one at a time.
   *
   * Required fields: provider, name
   * Everything else is optional (has defaults or is nullable).
   */

  it("rejects missing provider", () => {
    const result = createIntegrationSchema.safeParse({
      name: "Main Bank Connection",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects completely empty object", () => {
    const result = createIntegrationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects null as the entire payload", () => {
    const result = createIntegrationSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 6. createIntegrationSchema — INVALID FIELD VALUES
// ============================================================================

describe("createIntegrationSchema — invalid field values", () => {
  it("rejects invalid provider enum value", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "yodlee",
      name: "Bank Connection",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status enum value", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Bank Connection",
      status: "active",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string for name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects whitespace-only name (trims to empty string)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "   ",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 255 characters", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "A".repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it("accepts name of exactly 255 characters (boundary)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "A".repeat(255),
    })
    expect(result.success).toBe(true)
  })

  it("rejects number as name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: 42,
    })
    expect(result.success).toBe(false)
  })

  it("rejects number as provider", () => {
    const result = createIntegrationSchema.safeParse({
      provider: 1,
      name: "Bank Account",
    })
    expect(result.success).toBe(false)
  })

  it("rejects externalAccountId exceeding 255 characters", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Bank Account",
      externalAccountId: "x".repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it("accepts externalAccountId of exactly 255 characters (boundary)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "plaid",
      name: "Bank Account",
      externalAccountId: "x".repeat(255),
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 7. updateIntegrationSchema — VALID PAYLOADS
// ============================================================================

describe("updateIntegrationSchema — valid payloads", () => {
  /**
   * updateIntegrationSchema is a PARTIAL update — all fields are optional.
   * You can send any subset of fields.
   */

  it("accepts an empty object (no-op update)", () => {
    const result = updateIntegrationSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts status-only update (marking as error)", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "error",
    })
    expect(result.success).toBe(true)
  })

  it("accepts statusMessage with error explanation", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: "ITEM_LOGIN_REQUIRED: Bank login needs to be re-verified",
    })
    expect(result.success).toBe(true)
  })

  it("accepts null statusMessage (clears previous error message)", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "connected",
      statusMessage: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts full update payload with all fields", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "Updated Bank Name",
      status: "connected",
      statusMessage: null,
      externalAccountId: "item_new_abc123",
      externalItemId: "acc_new_xyz",
      settings: { environment: "production", lastSync: "2024-01-15" },
    })
    expect(result.success).toBe(true)
  })

  it("trims whitespace from name on update", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "  Trimmed Name  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Trimmed Name")
    }
  })
})

// ============================================================================
// 8. updateIntegrationSchema — INVALID FIELD VALUES
// ============================================================================

describe("updateIntegrationSchema — invalid field values", () => {
  it("rejects empty string for name", () => {
    const result = updateIntegrationSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status enum on update", () => {
    const result = updateIntegrationSchema.safeParse({ status: "broken" })
    expect(result.success).toBe(false)
  })

  it("rejects statusMessage exceeding 500 characters", () => {
    const result = updateIntegrationSchema.safeParse({
      statusMessage: "E".repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it("accepts statusMessage of exactly 500 characters (boundary)", () => {
    const result = updateIntegrationSchema.safeParse({
      statusMessage: "E".repeat(500),
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 9. Plaid-specific: public_token format validation
// ============================================================================
//
// Plaid public_tokens always start with "public-{env}-".
// We write an inline schema here to represent what plaid.schema.ts
// would export. These tests serve as the spec for that future file.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ PLAID TOKEN FORMATS:                                                    │
// │   Sandbox:     public-sandbox-{uuid}                                   │
// │   Development: public-development-{uuid}                               │
// │   Production:  public-production-{uuid}                                │
// │                                                                         │
// │ access_tokens (server-side only, never sent to client):                │
// │   access-sandbox-{uuid}                                                │
// │   access-production-{uuid}                                             │
// └─────────────────────────────────────────────────────────────────────────┘

const publicTokenSchema = z
  .string()
  .min(1, "Token cannot be empty")
  .startsWith("public-", "Plaid public tokens must start with 'public-'")
  .refine((t) => !t.includes(" "), "Token cannot contain whitespace")

describe("Plaid public_token format validation", () => {
  it("accepts a sandbox public token", () => {
    const result = publicTokenSchema.safeParse(
      "public-sandbox-abc123def456-7890abcdef12",
    )
    expect(result.success).toBe(true)
  })

  it("accepts a development public token", () => {
    const result = publicTokenSchema.safeParse(
      "public-development-abc123def456-7890abcdef12",
    )
    expect(result.success).toBe(true)
  })

  it("accepts a production public token", () => {
    const result = publicTokenSchema.safeParse(
      "public-production-abc123def456-7890abcdef12",
    )
    expect(result.success).toBe(true)
  })

  it("rejects a token not starting with 'public-'", () => {
    const result = publicTokenSchema.safeParse("access-sandbox-abc123")
    expect(result.success).toBe(false)
  })

  it("rejects an empty string", () => {
    const result = publicTokenSchema.safeParse("")
    expect(result.success).toBe(false)
  })

  it("rejects a token with leading whitespace", () => {
    const result = publicTokenSchema.safeParse(" public-sandbox-abc123")
    expect(result.success).toBe(false)
  })

  it("rejects a token with internal whitespace", () => {
    const result = publicTokenSchema.safeParse("public-sandbox-abc 123")
    expect(result.success).toBe(false)
  })

  it("rejects null", () => {
    const result = publicTokenSchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it("rejects undefined", () => {
    const result = publicTokenSchema.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it("rejects a random non-Plaid string", () => {
    const result = publicTokenSchema.safeParse("not-a-plaid-token")
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 10. Plaid balance payload shape
// ============================================================================
//
// Defines the shape of account data returned by Plaid's /accounts/balance/get.
// We write an inline schema to document the expected shape — this would
// live in plaid.schema.ts when created.

const plaidBalanceSchema = z.object({
  account_id: z.string().min(1),
  name: z.string().min(1),
  official_name: z.string().nullable(),
  type: z.enum(["depository", "credit", "loan", "investment", "other"]),
  subtype: z.string().nullable(),
  balances: z.object({
    current: z.number().nullable(),
    available: z.number().nullable(),
    iso_currency_code: z.string().nullable(),
  }),
})

describe("Plaid account balance payload shape", () => {
  it("accepts a valid depository (checking) account", () => {
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_abc123",
      name: "Chase Checking",
      official_name: "Chase Premier Platinum Checking",
      type: "depository",
      subtype: "checking",
      balances: {
        current: 5432.10,
        available: 5200.00,
        iso_currency_code: "USD",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts a credit card account with negative available balance", () => {
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_cc789",
      name: "Chase Sapphire",
      official_name: "Chase Sapphire Reserve",
      type: "credit",
      subtype: "credit card",
      balances: {
        current: -1200.50,
        available: 13799.50,
        iso_currency_code: "USD",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts an investment account with null available balance", () => {
    // Investment accounts often have no 'available' balance
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_inv001",
      name: "Fidelity Brokerage",
      official_name: null,
      type: "investment",
      subtype: "brokerage",
      balances: {
        current: 125000.00,
        available: null,
        iso_currency_code: "USD",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts an account with all-null balance fields", () => {
    // Plaid sometimes returns null for balances on accounts it can't access
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_unknown",
      name: "Unknown Account",
      official_name: null,
      type: "other",
      subtype: null,
      balances: {
        current: null,
        available: null,
        iso_currency_code: null,
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts zero balance", () => {
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_zero",
      name: "Empty Savings",
      official_name: null,
      type: "depository",
      subtype: "savings",
      balances: {
        current: 0,
        available: 0,
        iso_currency_code: "USD",
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing account_id", () => {
    const result = plaidBalanceSchema.safeParse({
      name: "Chase Checking",
      official_name: null,
      type: "depository",
      subtype: "checking",
      balances: { current: 1000, available: 1000, iso_currency_code: "USD" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid account type", () => {
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_abc",
      name: "Mystery Account",
      official_name: null,
      type: "crypto",
      subtype: null,
      balances: { current: 100, available: 100, iso_currency_code: "USD" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing balances object entirely", () => {
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_abc",
      name: "Chase Checking",
      official_name: null,
      type: "depository",
      subtype: "checking",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-USD currency code (still valid schema — just a string)", () => {
    // iso_currency_code is just a string — the schema doesn't restrict to USD
    const result = plaidBalanceSchema.safeParse({
      account_id: "acct_eur",
      name: "Euro Account",
      official_name: null,
      type: "depository",
      subtype: "checking",
      balances: { current: 5000.00, available: 4800.00, iso_currency_code: "EUR" },
    })
    // Should succeed — currency code validation is a business rule, not schema rule
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 11. Plaid webhook payload shape
// ============================================================================
//
// Documents the shape of Plaid webhook events so tests serve as living
// documentation of the webhook contract.

const plaidWebhookSchema = z.object({
  webhook_type: z.enum(["TRANSACTIONS", "HOLDINGS", "ITEM", "ASSETS", "LIABILITIES"]),
  webhook_code: z.string().min(1),
  item_id: z.string().min(1),
  error: z
    .object({
      error_code: z.string(),
      error_message: z.string(),
    })
    .nullable()
    .optional(),
})

describe("Plaid webhook payload shape", () => {
  it("accepts a TRANSACTIONS.SYNC_UPDATES_AVAILABLE event", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "TRANSACTIONS",
      webhook_code: "SYNC_UPDATES_AVAILABLE",
      item_id: "item_abc123",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an ITEM.ERROR event with error details", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "ITEM",
      webhook_code: "ERROR",
      item_id: "item_abc123",
      error: {
        error_code: "ITEM_LOGIN_REQUIRED",
        error_message: "the login details of this item have changed",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts a HOLDINGS.DEFAULT_UPDATE event", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "HOLDINGS",
      webhook_code: "DEFAULT_UPDATE",
      item_id: "item_inv001",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an ITEM.PENDING_EXPIRATION event (no error field)", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "ITEM",
      webhook_code: "PENDING_EXPIRATION",
      item_id: "item_abc123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing item_id", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "TRANSACTIONS",
      webhook_code: "SYNC_UPDATES_AVAILABLE",
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown webhook_type", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "PAYMENTS",
      webhook_code: "PAYMENT_COMPLETE",
      item_id: "item_abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string for item_id", () => {
    const result = plaidWebhookSchema.safeParse({
      webhook_type: "ITEM",
      webhook_code: "ERROR",
      item_id: "",
      error: { error_code: "ITEM_LOGIN_REQUIRED", error_message: "re-auth required" },
    })
    expect(result.success).toBe(false)
  })
})
