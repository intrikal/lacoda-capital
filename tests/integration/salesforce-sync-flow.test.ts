/**
 * ============================================================================
 * TEST FILE: salesforce-sync-flow.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the complete Salesforce integration flow from start
 * to finish. It's an INTEGRATION test — it tests multiple pieces of our
 * code working together with mocked external dependencies.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN INTEGRATION TEST?                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Unit tests test ONE function with fake inputs.                          │
 * │ Integration tests test a WHOLE FLOW with realistic (but mocked)        │
 * │ external dependencies.                                                  │
 * │                                                                         │
 * │ Here we mock:                                                           │
 * │   - The DB (so we don't need a real Postgres database)                 │
 * │   - The Salesforce API (so we don't make real HTTP calls)              │
 * │                                                                         │
 * │ But we let the REAL code run:                                           │
 * │   - lib/integrations/salesforce.ts (all functions)                     │
 * │   - lib/actions/integration.actions.ts                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THE FLOWS WE'RE TESTING                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  Flow 1: Full OAuth                                                     │
 * │    -> Admin clicks "Connect Salesforce"                                │
 * │    -> getAuthorizationUrl() builds OAuth URL                           │
 * │    -> User authorizes -> callback with auth code                       │
 * │    -> exchangeCodeForTokens() gets access + refresh tokens             │
 * │    -> connectSalesforce() stores in DB                                 │
 * │                                                                         │
 * │  Flow 2: Client Sync                                                    │
 * │    -> syncClients() queries Salesforce Contacts via SOQL               │
 * │    -> Cursor-based pagination for large result sets                    │
 * │    -> mapSFContactToClient() maps each record                          │
 * │    -> Results returned for upserting into our clients table            │
 * │                                                                         │
 * │  Flow 3: Deal Sync                                                      │
 * │    -> syncDeals() queries Salesforce Opportunities                     │
 * │    -> mapSFOpportunityToDeal() maps each record                        │
 * │    -> Closed Won / Closed Lost handled correctly                       │
 * │                                                                         │
 * │  Flow 4: Disconnect                                                     │
 * │    -> Revoke token at Salesforce                                       │
 * │    -> Update integration status -> "disconnected"                      │
 * │    -> Preserve synced records (don't delete clients/deals)             │
 * │                                                                         │
 * │  Flow 5: Token refresh during sync                                     │
 * │    -> Mid-sync token expires -> refreshAccessToken() called            │
 * │    -> New token stored in DB -> sync continues                         │
 * │                                                                         │
 * │  Flow 6: Partial sync failure                                           │
 * │    -> Some records fail to map -> others succeed                       │
 * │    -> SyncResult reports synced + skipped + failed counts              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/salesforce.ts          — functions under test
 *   lib/actions/integration.actions.ts    — server actions (thin wrappers)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock: Database ──────────────────────────────────────────────────────────

vi.mock("@/app/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      integrations: {
        findFirst: vi.fn(),
      },
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}))

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const SF_INSTANCE_URL = "https://na1.salesforce.com"
const SF_ACCESS_TOKEN = "00D000000000001!AQ0AQTEST_ACCESS_TOKEN"
const SF_REFRESH_TOKEN = "5Aep000000000001_TEST_REFRESH"
const SF_AUTH_CODE = "aPrxJRaLlOYlqhPJ9u09sCeGrzo0Yy9V"

const ORG_ID = "org_test_001"
const USER_ID = "user_test_001"
const INTEGRATION_ID = "intg_sf_test_001"
const REDIRECT_URI = "https://app.lacoda.com/api/webhooks/salesforce/callback"

// ─── Helper: mock DB for a connected Salesforce integration ─────────────────

async function setupConnectedIntegration(overrides?: Record<string, unknown>) {
  const { db } = await import("@/app/db")

  vi.mocked(db.query.integrations.findFirst).mockResolvedValue({
    id: INTEGRATION_ID,
    orgId: ORG_ID,
    provider: "salesforce",
    name: "Salesforce",
    status: "connected",
    statusMessage: null,
    externalAccountId: SF_INSTANCE_URL,
    externalItemId: null,
    connectedBy: USER_ID,
    connectedAt: new Date(),
    disconnectedAt: null,
    lastSyncAt: null,
    settings: {
      _access_token: SF_ACCESS_TOKEN,
      _refresh_token: SF_REFRESH_TOKEN,
      instance_url: SF_INSTANCE_URL,
      issued_at: String(Date.now()),
      login_url: "https://login.salesforce.com",
      ...overrides,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never)

  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as never)

  vi.mocked(db.insert).mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        { id: INTEGRATION_ID, orgId: ORG_ID, provider: "salesforce", status: "connected" },
      ]),
    }),
  } as never)
}

// ─── Helper: build Salesforce SOQL query response ───────────────────────────

function makeContactQueryResponse(contacts: Record<string, unknown>[], done = true, nextUrl: string | null = null) {
  return {
    totalSize: contacts.length,
    done,
    nextRecordsUrl: nextUrl,
    records: contacts,
  }
}

function makeOpportunityQueryResponse(opps: Record<string, unknown>[], done = true, nextUrl: string | null = null) {
  return {
    totalSize: opps.length,
    done,
    nextRecordsUrl: nextUrl,
    records: opps,
  }
}

// ─── Sample SF records ──────────────────────────────────────────────────────

const SAMPLE_CONTACTS = [
  {
    Id: "003000000000001",
    FirstName: "Alice",
    LastName: "Johnson",
    Email: "alice@example.com",
    Phone: "+1-555-100-0001",
    MailingStreet: "100 Market St",
    MailingCity: "San Francisco",
    MailingState: "CA",
    MailingPostalCode: "94105",
    MailingCountry: "US",
    Title: "CFO",
    Department: "Finance",
    AccountId: "001000000000001",
    IsDeleted: false,
  },
  {
    Id: "003000000000002",
    FirstName: "Bob",
    LastName: "Chen",
    Email: "bob.chen@example.com",
    Phone: null,
    MailingStreet: null,
    MailingCity: null,
    MailingState: null,
    MailingPostalCode: null,
    MailingCountry: null,
    Title: null,
    Department: null,
    AccountId: null,
    IsDeleted: false,
  },
]

const SAMPLE_OPPORTUNITIES = [
  {
    Id: "006000000000001",
    Name: "Acme Corp Wealth Management",
    StageName: "Proposal/Price Quote",
    Amount: 500000,
    CloseDate: "2024-06-30",
    AccountId: "001000000000001",
    Description: "Full-service wealth management",
    Probability: 75,
    IsClosed: false,
    IsWon: false,
    IsDeleted: false,
  },
  {
    Id: "006000000000002",
    Name: "Widgets Inc - Advisory",
    StageName: "Closed Won",
    Amount: 250000,
    CloseDate: "2024-03-15",
    AccountId: "001000000000002",
    Description: null,
    Probability: 100,
    IsClosed: true,
    IsWon: true,
    IsDeleted: false,
  },
]

// ============================================================================
// 1. Full OAuth Flow
// ============================================================================

describe("Full OAuth flow: redirect -> callback -> token exchange -> store", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_consumer_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_consumer_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
    await setupConnectedIntegration()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("Step 1: getAuthorizationUrl builds a valid OAuth URL", async () => {
    const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
    const url = getAuthorizationUrl(REDIRECT_URI, ORG_ID)

    expect(url).toContain("https://login.salesforce.com/services/oauth2/authorize")
    expect(url).toContain("client_id=test_consumer_key")
    expect(url).toContain("response_type=code")
    expect(url).toContain(`state=${ORG_ID}`)
  })

  it("Step 2: exchangeCodeForTokens exchanges auth code for tokens", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: SF_ACCESS_TOKEN,
          refresh_token: SF_REFRESH_TOKEN,
          instance_url: SF_INSTANCE_URL,
          issued_at: "1700000000000",
          id: "https://login.salesforce.com/id/00D000000000001/005000000000001",
        }),
        { status: 200 },
      ),
    )

    const { exchangeCodeForTokens } = await import("@/lib/integrations/salesforce")
    const tokens = await exchangeCodeForTokens(SF_AUTH_CODE, REDIRECT_URI)

    expect(tokens.accessToken).toBe(SF_ACCESS_TOKEN)
    expect(tokens.refreshToken).toBe(SF_REFRESH_TOKEN)
    expect(tokens.instanceUrl).toBe(SF_INSTANCE_URL)
  })

  it("Step 3: connectSalesforce stores tokens in integration record", async () => {
    const { connectSalesforce } = await import("@/lib/integrations/salesforce")
    const id = await connectSalesforce(ORG_ID, USER_ID, {
      accessToken: SF_ACCESS_TOKEN,
      refreshToken: SF_REFRESH_TOKEN,
      instanceUrl: SF_INSTANCE_URL,
      issuedAt: "1700000000000",
    })

    expect(id).toBe(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const insertMock = vi.mocked(db.insert)
    const valuesMock = insertMock.mock.results[0].value.values
    const record = valuesMock.mock.calls[0][0]

    expect(record.provider).toBe("salesforce")
    expect(record.status).toBe("connected")
    expect(record.settings._access_token).toBe(SF_ACCESS_TOKEN)
    expect(record.settings._refresh_token).toBe(SF_REFRESH_TOKEN)
    expect(record.settings.instance_url).toBe(SF_INSTANCE_URL)
  })

  it("Full flow: auth URL -> exchange -> connect (end to end)", async () => {
    // Step 1: Build auth URL
    const { getAuthorizationUrl, exchangeCodeForTokens, connectSalesforce } = await import(
      "@/lib/integrations/salesforce"
    )
    const authUrl = getAuthorizationUrl(REDIRECT_URI, ORG_ID)
    expect(authUrl).toContain("authorize")

    // Step 2: Exchange code (mock Salesforce token endpoint)
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: SF_ACCESS_TOKEN,
          refresh_token: SF_REFRESH_TOKEN,
          instance_url: SF_INSTANCE_URL,
          issued_at: "1700000000000",
        }),
        { status: 200 },
      ),
    )

    const tokens = await exchangeCodeForTokens(SF_AUTH_CODE, REDIRECT_URI)

    // Step 3: Store in DB
    const integrationId = await connectSalesforce(ORG_ID, USER_ID, tokens)
    expect(integrationId).toBe(INTEGRATION_ID)
  })
})

// ============================================================================
// 2. Client Sync — fetch SF Contacts -> map -> return for upserting
// ============================================================================

describe("Client sync: fetch SF Contacts -> map -> upsert (no duplicates)", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
    await setupConnectedIntegration()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("fetches and maps Contacts from Salesforce", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeContactQueryResponse(SAMPLE_CONTACTS)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(2)
    expect(result.synced).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.failed).toBe(0)

    // Verify mapping correctness
    expect(clients[0].firstName).toBe("Alice")
    expect(clients[0].lastName).toBe("Johnson")
    expect(clients[0].email).toBe("alice@example.com")
    expect(clients[1].firstName).toBe("Bob")
  })

  it("skips contacts without email and reports skipped count", async () => {
    const contactsWithNoEmail = [
      ...SAMPLE_CONTACTS,
      {
        Id: "003000000000003",
        FirstName: "NoEmail",
        LastName: "Person",
        Email: null,
        Phone: null, MailingStreet: null, MailingCity: null,
        MailingState: null, MailingPostalCode: null, MailingCountry: null,
        Title: null, Department: null, AccountId: null, IsDeleted: false,
      },
    ]

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeContactQueryResponse(contactsWithNoEmail)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(2)
    expect(result.synced).toBe(2)
    expect(result.skipped).toBe(1) // NoEmail person was skipped
  })

  it("handles pagination across multiple batches", async () => {
    let callCount = 0
    global.fetch = vi.fn(async () => {
      callCount++
      if (callCount === 1) {
        return new Response(
          JSON.stringify(
            makeContactQueryResponse(
              [SAMPLE_CONTACTS[0]],
              false,
              "/services/data/v59.0/query/01gxx00000000001-2000",
            ),
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response(
        JSON.stringify(makeContactQueryResponse([SAMPLE_CONTACTS[1]])),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(2)
    expect(result.synced).toBe(2)
    expect(callCount).toBe(2)
  })

  it("updates lastSyncAt after successful sync", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeContactQueryResponse(SAMPLE_CONTACTS)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    await syncClients(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const updateMock = vi.mocked(db.update)

    // The last update call should set lastSyncAt
    const lastCall = updateMock.mock.results[updateMock.mock.results.length - 1]
    const setCall = lastCall?.value?.set.mock.calls[0]?.[0]
    expect(setCall?.lastSyncAt).toBeInstanceOf(Date)
  })
})

// ============================================================================
// 3. Deal Sync — fetch SF Opportunities -> map -> upsert
// ============================================================================

describe("Deal sync: fetch SF Opportunities -> map -> upsert", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
    await setupConnectedIntegration()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("fetches and maps Opportunities from Salesforce", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeOpportunityQueryResponse(SAMPLE_OPPORTUNITIES)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncDeals } = await import("@/lib/integrations/salesforce")
    const { deals, result } = await syncDeals(INTEGRATION_ID)

    expect(deals).toHaveLength(2)
    expect(result.synced).toBe(2)

    // Verify Closed Won handling
    expect(deals[1].stage).toBe("Closed Won")
    expect(deals[1].isClosed).toBe(true)
    expect(deals[1].isWon).toBe(true)
  })

  it("correctly handles a mix of open and closed deals", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeOpportunityQueryResponse(SAMPLE_OPPORTUNITIES)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncDeals } = await import("@/lib/integrations/salesforce")
    const { deals } = await syncDeals(INTEGRATION_ID)

    const openDeals = deals.filter((d) => !d.isClosed)
    const closedDeals = deals.filter((d) => d.isClosed)

    expect(openDeals).toHaveLength(1)
    expect(closedDeals).toHaveLength(1)
    expect(closedDeals[0].isWon).toBe(true)
  })
})

// ============================================================================
// 4. Disconnect — revoke token -> update status -> preserve synced records
// ============================================================================

describe("Disconnect: revoke token -> update status -> preserve synced records", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
    await setupConnectedIntegration()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("calls Salesforce revoke endpoint and updates DB status", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }))
    global.fetch = mockFetch

    const { disconnectSalesforce } = await import("@/lib/integrations/salesforce")
    await disconnectSalesforce(INTEGRATION_ID)

    // Verify revoke was called
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("/services/oauth2/revoke")

    // Verify DB was updated
    const { db } = await import("@/app/db")
    const updateMock = vi.mocked(db.update)
    const setCall = updateMock.mock.results[0]?.value?.set.mock.calls[0]?.[0]
    expect(setCall.status).toBe("disconnected")
    expect(setCall.disconnectedAt).toBeInstanceOf(Date)
    expect(setCall.settings).toEqual({}) // tokens cleared
  })

  it("does NOT delete synced client/deal records (only changes integration status)", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }))

    const { disconnectSalesforce } = await import("@/lib/integrations/salesforce")
    await disconnectSalesforce(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    // db.delete should NOT have been called — we preserve synced records
    expect(vi.mocked(db.delete)).not.toHaveBeenCalled()
  })

  it("still disconnects even if Salesforce revoke endpoint is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const { disconnectSalesforce } = await import("@/lib/integrations/salesforce")
    // Should not throw
    await expect(disconnectSalesforce(INTEGRATION_ID)).resolves.toBeUndefined()

    const { db } = await import("@/app/db")
    const updateMock = vi.mocked(db.update)
    const setCall = updateMock.mock.results[0]?.value?.set.mock.calls[0]?.[0]
    expect(setCall.status).toBe("disconnected")
  })
})

// ============================================================================
// 5. Token refresh during sync (mid-sync token expiry)
// ============================================================================

describe("Token refresh during sync — mid-sync token expiry", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()

    // Set up a connected integration with an OLD issued_at (triggers refresh)
    await setupConnectedIntegration({
      issued_at: String(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("refreshes token before querying when access token is old", async () => {
    let callCount = 0
    global.fetch = vi.fn(async (url: string) => {
      callCount++
      // First call: token refresh
      if ((url as string).includes("/services/oauth2/token")) {
        return new Response(
          JSON.stringify({
            access_token: "new_access_token_refreshed",
            instance_url: SF_INSTANCE_URL,
            issued_at: String(Date.now()),
          }),
          { status: 200 },
        )
      }
      // Second call: SOQL query
      return new Response(
        JSON.stringify(makeContactQueryResponse(SAMPLE_CONTACTS)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(2)
    // Should have called: 1) token refresh, 2) SOQL query
    expect(callCount).toBe(2)

    // Verify token was updated in DB
    const { db } = await import("@/app/db")
    const updateMock = vi.mocked(db.update)
    // First update: token refresh, second: lastSyncAt
    expect(updateMock).toHaveBeenCalled()
  })
})

// ============================================================================
// 6. Partial sync failure — some records fail, others succeed
// ============================================================================

describe("Partial sync failure — some records fail, others succeed", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
    await setupConnectedIntegration()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("continues processing when individual contacts are skipped (no email)", async () => {
    const mixedContacts = [
      SAMPLE_CONTACTS[0], // valid
      {
        ...SAMPLE_CONTACTS[1],
        Email: null, // will be skipped
      },
      {
        Id: "003000000000003",
        FirstName: "Third",
        LastName: "Valid",
        Email: "third@example.com",
        Phone: null, MailingStreet: null, MailingCity: null,
        MailingState: null, MailingPostalCode: null, MailingCountry: null,
        Title: null, Department: null, AccountId: null, IsDeleted: false,
      },
    ]

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeContactQueryResponse(mixedContacts)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(2) // 2 valid, 1 skipped
    expect(result.synced).toBe(2)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(0)
  })

  it("reports skipped deleted contacts separately", async () => {
    const contactsWithDeleted = [
      SAMPLE_CONTACTS[0], // valid
      {
        ...SAMPLE_CONTACTS[1],
        IsDeleted: true, // will be skipped
      },
    ]

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeContactQueryResponse(contactsWithDeleted)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(1)
    expect(result.synced).toBe(1)
    expect(result.skipped).toBe(1) // deleted contact skipped
  })
})

// ============================================================================
// 7. Empty Salesforce org — zero records
// ============================================================================

describe("Empty Salesforce org — zero records", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
    await setupConnectedIntegration()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("handles zero contacts gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeContactQueryResponse([])),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(0)
    expect(result.synced).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.failed).toBe(0)
  })

  it("handles zero opportunities gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(makeOpportunityQueryResponse([])),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncDeals } = await import("@/lib/integrations/salesforce")
    const { deals, result } = await syncDeals(INTEGRATION_ID)

    expect(deals).toHaveLength(0)
    expect(result.synced).toBe(0)
  })
})
