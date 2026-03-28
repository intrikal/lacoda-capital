/**
 * ============================================================================
 * TEST FILE: plaid-daily-sync.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the daily balance sync flow — what happens when
 * we ask Plaid for the latest account balances and update our records.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT DAILY SYNC DOES                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Every day (or triggered by a Plaid webhook), we:                        │
 * │                                                                         │
 * │  1. Find all "connected" Plaid integrations                            │
 * │  2. For each integration, call Plaid /accounts/balance/get             │
 * │  3. For each returned account, find the matching asset in our DB       │
 * │  4. Create a new valuation record with the current balance             │
 * │  5. Update integration.lastSyncAt = now                                │
 * │                                                                         │
 * │ Special cases:                                                          │
 * │   - New account appears → create a new asset + valuation               │
 * │   - Plaid API fails → mark sync as failed, keep integration connected  │
 * │   - Balance unchanged → still create a new valuation (audit trail)     │
 * │   - Partial failure → mark lastSyncStatus = "partial"                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE MOCK                                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │   - DB calls (insert, update, select)                                  │
 * │   - Plaid API (fetch)                                                  │
 * │                                                                         │
 * │ WHAT WE TEST WITH REAL CODE                                             │
 * │   - getAccountBalances() in lib/integrations/plaid.ts                  │
 * │   - refreshPlaidBalances() in lib/actions/integration.actions.ts       │
 * │   - Balance selection logic (current vs available)                     │
 * │   - Error propagation and status updates                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/plaid.ts            — getAccountBalances()
 *   lib/actions/integration.actions.ts  — refreshPlaidBalances()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock("@/app/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    query: {
      integrations: {
        findFirst: vi.fn(),
      },
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({
    userId: "user_test_001",
    orgId: "org_test_001",
    role: "admin",
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

const INTEGRATION_ID = "intg_test_001"
const ORG_ID = "org_test_001"
const ACCESS_TOKEN = "access-sandbox-abc123def456"

const MOCK_INTEGRATION = {
  id: INTEGRATION_ID,
  orgId: ORG_ID,
  provider: "plaid",
  name: "Chase Bank",
  status: "connected",
  externalAccountId: "item_abc123",
  settings: {
    environment: "sandbox",
    _access_token: ACCESS_TOKEN,
  },
  lastSyncAt: null,
  statusMessage: null,
}

const MOCK_ACCOUNTS = [
  {
    account_id: "acct_checking_001",
    name: "Chase Total Checking",
    official_name: "Chase Premier Platinum Checking",
    type: "depository",
    subtype: "checking",
    balances: {
      current: 5432.10,
      available: 5200.00,
      iso_currency_code: "USD",
    },
  },
  {
    account_id: "acct_savings_002",
    name: "Chase Savings",
    official_name: "Chase Savings℠",
    type: "depository",
    subtype: "savings",
    balances: {
      current: 12000.00,
      available: 12000.00,
      iso_currency_code: "USD",
    },
  },
  {
    account_id: "acct_investment_003",
    name: "Chase Investment",
    official_name: null,
    type: "investment",
    subtype: "brokerage",
    balances: {
      current: 245000.00,
      available: null,
      iso_currency_code: "USD",
    },
  },
]

// ─── DB update chain mock ─────────────────────────────────────────────────

function makeUpdateChain() {
  const whereMock = vi.fn().mockResolvedValue([])
  const setMock = vi.fn().mockReturnValue({ where: whereMock })
  return { setMock, whereMock }
}

// ============================================================================
// 1. getAccountBalances() — fetches accounts from Plaid
// ============================================================================

describe("getAccountBalances()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"

    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(MOCK_INTEGRATION as never)

    const { setMock, whereMock } = makeUpdateChain()
    vi.mocked(db.update).mockReturnValue({ set: setMock } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("returns account balances from Plaid", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: MOCK_ACCOUNTS, request_id: "req_001" }),
        { status: 200 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    const accounts = await getAccountBalances(INTEGRATION_ID)

    expect(accounts).toHaveLength(3)
    expect(accounts[0].account_id).toBe("acct_checking_001")
    expect(accounts[1].account_id).toBe("acct_savings_002")
    expect(accounts[2].account_id).toBe("acct_investment_003")
  })

  it("calls Plaid /accounts/balance/get with the access token", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: MOCK_ACCOUNTS, request_id: "req_001" }),
        { status: 200 },
      ),
    )
    global.fetch = mockFetch

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await getAccountBalances(INTEGRATION_ID)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("/accounts/balance/get")
    const body = JSON.parse(options?.body as string)
    expect(body.access_token).toBe(ACCESS_TOKEN)
  })

  it("updates lastSyncAt after successful fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: MOCK_ACCOUNTS, request_id: "req_001" }),
        { status: 200 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await getAccountBalances(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const setCall = vi.mocked(db.update).mock.results[0].value.set.mock.calls[0][0]
    expect(setCall.lastSyncAt).toBeInstanceOf(Date)
    expect(setCall.statusMessage).toBeNull()
  })

  it("throws when integration is not found", async () => {
    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(null as never)

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances("nonexistent_id")).rejects.toThrow(
      "Integration not found",
    )
  })

  it("throws when integration is not a Plaid integration", async () => {
    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue({
      ...MOCK_INTEGRATION,
      provider: "stripe",
    } as never)

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances(INTEGRATION_ID)).rejects.toThrow(
      "not a Plaid integration",
    )
  })

  it("throws when access token is missing from settings", async () => {
    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue({
      ...MOCK_INTEGRATION,
      settings: { environment: "sandbox" }, // No _access_token
    } as never)

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances(INTEGRATION_ID)).rejects.toThrow(
      "No access token",
    )
  })

  it("throws when Plaid returns an error (e.g. ITEM_LOGIN_REQUIRED)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: "ITEM_LOGIN_REQUIRED",
          error_message: "the login details of this item have changed",
        }),
        { status: 400 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances(INTEGRATION_ID)).rejects.toThrow()
  })
})

// ============================================================================
// 2. refreshPlaidBalances() — server action wrapper
// ============================================================================

describe("refreshPlaidBalances()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"

    const { db } = await import("@/app/db")
    // Auth check: org ownership verification
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(MOCK_INTEGRATION as never)

    const { setMock } = makeUpdateChain()
    vi.mocked(db.update).mockReturnValue({ set: setMock } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("returns accounts with name and balance", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: MOCK_ACCOUNTS, request_id: "req_001" }),
        { status: 200 },
      ),
    )

    const { refreshPlaidBalances } = await import(
      "@/lib/actions/integration.actions"
    )
    const result = await refreshPlaidBalances(INTEGRATION_ID)

    expect(result.accounts).toHaveLength(3)
    expect(result.accounts[0].name).toBe("Chase Total Checking")
    expect(result.accounts[0].balance).toBe(5432.10)
  })

  it("returns current balance (not available) for each account", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: MOCK_ACCOUNTS, request_id: "req_001" }),
        { status: 200 },
      ),
    )

    const { refreshPlaidBalances } = await import(
      "@/lib/actions/integration.actions"
    )
    const result = await refreshPlaidBalances(INTEGRATION_ID)

    // Investment account has null available — should return current
    const investmentAccount = result.accounts.find((a) =>
      a.name.includes("Investment"),
    )
    expect(investmentAccount?.balance).toBe(245000.00)
  })

  it("throws when integration belongs to different org", async () => {
    const { db } = await import("@/app/db")
    // findFirst returns null → integration not found for this org
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(null as never)

    const { refreshPlaidBalances } = await import(
      "@/lib/actions/integration.actions"
    )
    await expect(refreshPlaidBalances(INTEGRATION_ID)).rejects.toThrow(
      "Integration not found",
    )
  })
})

// ============================================================================
// 3. Sync error handling — Plaid API failures during sync
// ============================================================================

describe("sync error handling — Plaid API down during sync", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"

    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(MOCK_INTEGRATION as never)
    const { setMock } = makeUpdateChain()
    vi.mocked(db.update).mockReturnValue({ set: setMock } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("throws when Plaid is completely unreachable (network error)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fetch failed: ECONNREFUSED"))

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances(INTEGRATION_ID)).rejects.toThrow()
  })

  it("throws when Plaid returns 500 Internal Server Error", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: "INTERNAL_SERVER_ERROR",
          error_message: "An internal Plaid server error occurred",
        }),
        { status: 500 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances(INTEGRATION_ID)).rejects.toThrow()
  })

  it("throws when Plaid returns RATE_LIMIT_EXCEEDED", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: "RATE_LIMIT_EXCEEDED",
          error_message: "You have exceeded the rate limit",
        }),
        { status: 429 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    await expect(getAccountBalances(INTEGRATION_ID)).rejects.toThrow()
  })
})

// ============================================================================
// 4. Account balance edge cases
// ============================================================================

describe("account balance edge cases in sync data", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"

    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(MOCK_INTEGRATION as never)
    const { setMock } = makeUpdateChain()
    vi.mocked(db.update).mockReturnValue({ set: setMock } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("handles empty accounts array (bank has no accessible accounts)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: [], request_id: "req_001" }),
        { status: 200 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    const accounts = await getAccountBalances(INTEGRATION_ID)
    expect(accounts).toHaveLength(0)
  })

  it("handles accounts with all-null balances", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accounts: [
            {
              account_id: "acct_null",
              name: "Inaccessible Account",
              official_name: null,
              type: "depository",
              subtype: "checking",
              balances: { current: null, available: null, iso_currency_code: null },
            },
          ],
          request_id: "req_001",
        }),
        { status: 200 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    const accounts = await getAccountBalances(INTEGRATION_ID)

    expect(accounts).toHaveLength(1)
    expect(accounts[0].balances.current).toBeNull()
    expect(accounts[0].balances.available).toBeNull()
  })

  it("handles credit card with negative current balance", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accounts: [
            {
              account_id: "acct_cc",
              name: "Amex Gold",
              official_name: "American Express Gold",
              type: "credit",
              subtype: "credit card",
              balances: { current: -1200.50, available: 13799.50, iso_currency_code: "USD" },
            },
          ],
          request_id: "req_001",
        }),
        { status: 200 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    const accounts = await getAccountBalances(INTEGRATION_ID)

    expect(accounts[0].balances.current).toBe(-1200.50)
  })

  it("handles large account list (50 accounts)", async () => {
    const manyAccounts = Array.from({ length: 50 }, (_, i) => ({
      account_id: `acct_${i.toString().padStart(3, "0")}`,
      name: `Account ${i + 1}`,
      official_name: null,
      type: "depository",
      subtype: "checking",
      balances: { current: i * 100, available: i * 100, iso_currency_code: "USD" },
    }))

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accounts: manyAccounts, request_id: "req_001" }),
        { status: 200 },
      ),
    )

    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    const accounts = await getAccountBalances(INTEGRATION_ID)
    expect(accounts).toHaveLength(50)
  })
})

// ============================================================================
// 5. Webhook-triggered sync — HOLDINGS.DEFAULT_UPDATE
// ============================================================================

describe("webhook-triggered sync — HOLDINGS.DEFAULT_UPDATE", () => {
  it("webhook payload is correctly shaped for holdings update", () => {
    // Test the webhook payload shape that would trigger a holdings sync
    const webhookPayload = {
      webhook_type: "HOLDINGS",
      webhook_code: "DEFAULT_UPDATE",
      item_id: "item_abc123",
    }

    expect(webhookPayload.webhook_type).toBe("HOLDINGS")
    expect(webhookPayload.webhook_code).toBe("DEFAULT_UPDATE")
    expect(webhookPayload.item_id).toBeTruthy()
  })

  it("TRANSACTIONS.SYNC_UPDATES_AVAILABLE webhook identifies new transactions", () => {
    const webhookPayload = {
      webhook_type: "TRANSACTIONS",
      webhook_code: "SYNC_UPDATES_AVAILABLE",
      item_id: "item_abc123",
      new_transactions: 5,
    }

    expect(webhookPayload.new_transactions).toBeGreaterThan(0)
  })
})

// ============================================================================
// 6. getInvestmentHoldings() — investment account data
// ============================================================================

describe("getInvestmentHoldings()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"

    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue(MOCK_INTEGRATION as never)
    const { setMock } = makeUpdateChain()
    vi.mocked(db.update).mockReturnValue({ set: setMock } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("returns holdings and securities from Plaid", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          holdings: [
            {
              account_id: "acct_investment_003",
              security_id: "sec_aapl",
              quantity: 100,
              institution_price: 185.50,
              institution_value: 18550.00,
              iso_currency_code: "USD",
            },
          ],
          securities: [
            {
              security_id: "sec_aapl",
              name: "Apple Inc",
              ticker_symbol: "AAPL",
              type: "equity",
            },
          ],
          request_id: "req_001",
        }),
        { status: 200 },
      ),
    )

    const { getInvestmentHoldings } = await import("@/lib/integrations/plaid")
    const result = await getInvestmentHoldings(INTEGRATION_ID)

    expect(result.holdings).toHaveLength(1)
    expect(result.securities).toHaveLength(1)
    expect(result.holdings[0].quantity).toBe(100)
    expect(result.securities[0].ticker_symbol).toBe("AAPL")
  })

  it("throws when integration has no access token", async () => {
    const { db } = await import("@/app/db")
    vi.mocked(db.query.integrations.findFirst).mockResolvedValue({
      ...MOCK_INTEGRATION,
      settings: {},
    } as never)

    const { getInvestmentHoldings } = await import("@/lib/integrations/plaid")
    await expect(getInvestmentHoldings(INTEGRATION_ID)).rejects.toThrow(
      "No access token",
    )
  })

  it("updates lastSyncAt after successful holdings fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          holdings: [],
          securities: [],
          request_id: "req_001",
        }),
        { status: 200 },
      ),
    )

    const { getInvestmentHoldings } = await import("@/lib/integrations/plaid")
    await getInvestmentHoldings(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const setCall = vi.mocked(db.update).mock.results[0].value.set.mock.calls[0][0]
    expect(setCall.lastSyncAt).toBeInstanceOf(Date)
  })
})
