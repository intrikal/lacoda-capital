/**
 * ============================================================================
 * TEST FILE: salesforce.test.ts
 * ============================================================================
 *
 * Kevin, this file tests everything related to the Salesforce CRM integration —
 * from field mapping to OAuth URL generation to error handling.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Field mapping validation (our client fields -> SF Contact fields)   │
 * │ 2. OAuth URL generation with correct scopes                            │
 * │ 3. Token refresh logic (expired access token -> use refresh token)     │
 * │ 4. Client record mapping: SF Contact -> our Client type               │
 * │    - Contact with all fields populated                                 │
 * │    - Contact with minimal fields                                       │
 * │    - Contact with null email (should skip)                             │
 * │    - Contact with special characters in name                           │
 * │ 5. Deal record mapping: SF Opportunity -> our Deal type               │
 * │    - Opportunity with all stages                                       │
 * │    - Opportunity with custom fields                                    │
 * │    - Closed Won vs Closed Lost handling                                │
 * │    - Opportunity amount = 0 or null                                    │
 * │ 6. Error code handling:                                                │
 * │    - INVALID_SESSION_ID -> mark integration as "error"                 │
 * │    - REQUEST_LIMIT_EXCEEDED -> retry with backoff                      │
 * │    - UNABLE_TO_LOCK_ROW -> retry                                       │
 * │    - ENTITY_IS_DELETED -> skip record                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/salesforce.ts         — Functions being tested
 *   lib/validations/integration.schema.ts  — Zod schemas
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ TESTING APPROACH — PURE UNIT TESTS                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ We use vi.fn() to mock fetch() and the database so these tests:        │
 * │   - Run fast (no real network calls, no real DB)                       │
 * │   - Work offline                                                        │
 * │   - Are deterministic (same result every run)                           │
 * └─────────────────────────────────────────────────────────────────────────┘
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
const SF_ACCESS_TOKEN = "00D000000000001!AQ0AQTEST_ACCESS_TOKEN_FOR_TESTING"
const SF_REFRESH_TOKEN = "5Aep000000000001_TEST_REFRESH_TOKEN"
const SF_ISSUED_AT = String(Date.now())

const ORG_ID = "org_test_001"
const USER_ID = "user_test_001"
const INTEGRATION_ID = "intg_sf_test_001"

// ─── Salesforce API mock helper ─────────────────────────────────────────────

function makeSFFetchMock(responses: Record<string, { status: number; body: unknown }>) {
  return vi.fn(async (url: string) => {
    const urlObj = new URL(url as string)

    // Check for exact path matches or partial matches
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlObj.pathname.includes(pattern) || urlObj.href.includes(pattern)) {
        return new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        })
      }
    }

    return new Response(
      JSON.stringify([{ errorCode: "NOT_FOUND", message: `No mock for ${urlObj.pathname}` }]),
      { status: 404, headers: { "Content-Type": "application/json" } },
    )
  })
}

// ============================================================================
// 1. FIELD MAPPING VALIDATION
// ============================================================================

describe("Field mapping — DEFAULT_CLIENT_FIELD_MAP", () => {
  it("maps all required Salesforce Contact fields to our client fields", async () => {
    const { DEFAULT_CLIENT_FIELD_MAP } = await import("@/lib/integrations/salesforce")

    const sfFields = DEFAULT_CLIENT_FIELD_MAP.map((m) => m.sfField)
    expect(sfFields).toContain("FirstName")
    expect(sfFields).toContain("LastName")
    expect(sfFields).toContain("Email")
    expect(sfFields).toContain("Phone")
  })

  it("maps address fields from Salesforce Mailing* to our address fields", async () => {
    const { DEFAULT_CLIENT_FIELD_MAP } = await import("@/lib/integrations/salesforce")

    const addressMappings = DEFAULT_CLIENT_FIELD_MAP.filter((m) =>
      m.sfField.startsWith("Mailing"),
    )
    expect(addressMappings.length).toBeGreaterThanOrEqual(4)

    const ourFields = addressMappings.map((m) => m.ourField)
    expect(ourFields).toContain("addressLine1")
    expect(ourFields).toContain("city")
    expect(ourFields).toContain("state")
    expect(ourFields).toContain("zip")
  })

  it("includes Title field mapping", async () => {
    const { DEFAULT_CLIENT_FIELD_MAP } = await import("@/lib/integrations/salesforce")

    const titleMapping = DEFAULT_CLIENT_FIELD_MAP.find((m) => m.sfField === "Title")
    expect(titleMapping).toBeDefined()
    expect(titleMapping!.ourField).toBe("title")
  })
})

describe("Field mapping — DEFAULT_DEAL_FIELD_MAP", () => {
  it("maps all required Salesforce Opportunity fields to our deal fields", async () => {
    const { DEFAULT_DEAL_FIELD_MAP } = await import("@/lib/integrations/salesforce")

    const sfFields = DEFAULT_DEAL_FIELD_MAP.map((m) => m.sfField)
    expect(sfFields).toContain("Name")
    expect(sfFields).toContain("StageName")
    expect(sfFields).toContain("Amount")
    expect(sfFields).toContain("CloseDate")
  })

  it("includes Probability and Description fields", async () => {
    const { DEFAULT_DEAL_FIELD_MAP } = await import("@/lib/integrations/salesforce")

    const sfFields = DEFAULT_DEAL_FIELD_MAP.map((m) => m.sfField)
    expect(sfFields).toContain("Probability")
    expect(sfFields).toContain("Description")
  })
})

// ============================================================================
// 2. OAUTH URL GENERATION
// ============================================================================

describe("getAuthorizationUrl()", () => {
  beforeEach(() => {
    process.env.SALESFORCE_CLIENT_ID = "test_consumer_key_abc"
    process.env.SALESFORCE_CLIENT_SECRET = "test_consumer_secret_xyz"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.SALESFORCE_CLIENT_ID
    delete process.env.SALESFORCE_CLIENT_SECRET
    delete process.env.SALESFORCE_LOGIN_URL
  })

  it("builds correct Salesforce OAuth URL with client_id and scopes", async () => {
    const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
    const url = getAuthorizationUrl("https://app.lacoda.com/callback", "state_123")

    expect(url).toContain("https://login.salesforce.com/services/oauth2/authorize")
    expect(url).toContain("client_id=test_consumer_key_abc")
    expect(url).toContain("response_type=code")
  })

  it("includes api, refresh_token, and id scopes", async () => {
    const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
    const url = getAuthorizationUrl("https://app.lacoda.com/callback", "state_123")

    // URL-encoded scopes: "api refresh_token id" -> "api+refresh_token+id" or "api%20refresh_token%20id"
    expect(url).toMatch(/scope=api[\+%20]refresh_token[\+%20]id/)
  })

  it("includes the redirect_uri parameter", async () => {
    const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
    const redirectUri = "https://app.lacoda.com/api/webhooks/salesforce/callback"
    const url = getAuthorizationUrl(redirectUri, "state_123")

    expect(url).toContain(encodeURIComponent(redirectUri))
  })

  it("includes the state parameter for CSRF protection", async () => {
    const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
    const url = getAuthorizationUrl("https://app.lacoda.com/callback", "org_abc123")

    expect(url).toContain("state=org_abc123")
  })

  it("uses sandbox URL when SALESFORCE_LOGIN_URL is test.salesforce.com", async () => {
    process.env.SALESFORCE_LOGIN_URL = "https://test.salesforce.com"
    vi.resetModules()

    const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
    const url = getAuthorizationUrl("https://app.lacoda.com/callback", "state_123")

    expect(url).toContain("https://test.salesforce.com/services/oauth2/authorize")
  })
})

// ============================================================================
// 3. TOKEN REFRESH LOGIC
// ============================================================================

describe("refreshAccessToken()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_consumer_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_consumer_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("sends refresh_token grant to Salesforce token endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new_access_token_abc",
          instance_url: SF_INSTANCE_URL,
          issued_at: String(Date.now()),
        }),
        { status: 200 },
      ),
    )
    global.fetch = mockFetch

    const { refreshAccessToken } = await import("@/lib/integrations/salesforce")
    await refreshAccessToken(SF_REFRESH_TOKEN)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("/services/oauth2/token")
    expect(options.body).toContain("grant_type=refresh_token")
    expect(options.body).toContain(`refresh_token=${encodeURIComponent(SF_REFRESH_TOKEN)}`)
  })

  it("returns new access token and instance URL", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "refreshed_token_xyz",
          instance_url: "https://na5.salesforce.com",
          issued_at: "1700000000000",
        }),
        { status: 200 },
      ),
    )

    const { refreshAccessToken } = await import("@/lib/integrations/salesforce")
    const result = await refreshAccessToken(SF_REFRESH_TOKEN)

    expect(result.accessToken).toBe("refreshed_token_xyz")
    expect(result.instanceUrl).toBe("https://na5.salesforce.com")
    expect(result.issuedAt).toBe("1700000000000")
  })

  it("throws when Salesforce returns an error (revoked token)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "expired access/refresh token" }),
        { status: 400 },
      ),
    )

    const { refreshAccessToken } = await import("@/lib/integrations/salesforce")
    await expect(refreshAccessToken("revoked_token")).rejects.toThrow("Salesforce token refresh failed")
  })
})

// ============================================================================
// 4. CLIENT RECORD MAPPING — SF Contact -> our Client type
// ============================================================================

describe("mapSFContactToClient()", () => {
  it("maps a fully populated SF Contact to our client schema", async () => {
    const { mapSFContactToClient } = await import("@/lib/integrations/salesforce")

    const contact = {
      Id: "003000000000001",
      FirstName: "John",
      LastName: "Smith",
      Email: "john.smith@example.com",
      Phone: "+1-555-123-4567",
      MailingStreet: "123 Main St",
      MailingCity: "San Francisco",
      MailingState: "CA",
      MailingPostalCode: "94105",
      MailingCountry: "US",
      Title: "CEO",
      Department: "Executive",
      AccountId: "001000000000001",
    }

    const result = mapSFContactToClient(contact)

    expect(result).not.toBeNull()
    expect(result!.sfContactId).toBe("003000000000001")
    expect(result!.firstName).toBe("John")
    expect(result!.lastName).toBe("Smith")
    expect(result!.email).toBe("john.smith@example.com")
    expect(result!.phone).toBe("+1-555-123-4567")
    expect(result!.addressLine1).toBe("123 Main St")
    expect(result!.city).toBe("San Francisco")
    expect(result!.state).toBe("CA")
    expect(result!.zip).toBe("94105")
    expect(result!.country).toBe("US")
    expect(result!.title).toBe("CEO")
  })

  it("maps a Contact with minimal fields (only LastName + Email)", async () => {
    const { mapSFContactToClient } = await import("@/lib/integrations/salesforce")

    const contact = {
      Id: "003000000000002",
      FirstName: null,
      LastName: "Doe",
      Email: "doe@example.com",
      Phone: null,
      MailingStreet: null,
      MailingCity: null,
      MailingState: null,
      MailingPostalCode: null,
      MailingCountry: null,
      Title: null,
      Department: null,
      AccountId: null,
    }

    const result = mapSFContactToClient(contact)

    expect(result).not.toBeNull()
    expect(result!.firstName).toBe("")
    expect(result!.lastName).toBe("Doe")
    expect(result!.email).toBe("doe@example.com")
    expect(result!.phone).toBeNull()
    expect(result!.addressLine1).toBeNull()
  })

  it("returns null for Contact with null email (skip — we require email)", async () => {
    const { mapSFContactToClient } = await import("@/lib/integrations/salesforce")

    const contact = {
      Id: "003000000000003",
      FirstName: "NoEmail",
      LastName: "Person",
      Email: null,
      Phone: "+1-555-000-0000",
      MailingStreet: null,
      MailingCity: null,
      MailingState: null,
      MailingPostalCode: null,
      MailingCountry: null,
      Title: null,
      Department: null,
      AccountId: null,
    }

    const result = mapSFContactToClient(contact)
    expect(result).toBeNull()
  })

  it("handles Contact with special characters in name (accents, apostrophes)", async () => {
    const { mapSFContactToClient } = await import("@/lib/integrations/salesforce")

    const contact = {
      Id: "003000000000004",
      FirstName: "Jean-Pierre",
      LastName: "O'Brien-Müller",
      Email: "jp@example.com",
      Phone: null,
      MailingStreet: null,
      MailingCity: null,
      MailingState: null,
      MailingPostalCode: null,
      MailingCountry: null,
      Title: null,
      Department: null,
      AccountId: null,
    }

    const result = mapSFContactToClient(contact)

    expect(result).not.toBeNull()
    expect(result!.firstName).toBe("Jean-Pierre")
    expect(result!.lastName).toBe("O'Brien-Müller")
  })

  it("returns null for deleted Contacts (IsDeleted = true)", async () => {
    const { mapSFContactToClient } = await import("@/lib/integrations/salesforce")

    const contact = {
      Id: "003000000000005",
      FirstName: "Deleted",
      LastName: "User",
      Email: "deleted@example.com",
      Phone: null,
      MailingStreet: null,
      MailingCity: null,
      MailingState: null,
      MailingPostalCode: null,
      MailingCountry: null,
      Title: null,
      Department: null,
      AccountId: null,
      IsDeleted: true,
    }

    const result = mapSFContactToClient(contact)
    expect(result).toBeNull()
  })
})

// ============================================================================
// 5. DEAL RECORD MAPPING — SF Opportunity -> our Deal type
// ============================================================================

describe("mapSFOpportunityToDeal()", () => {
  it("maps a fully populated SF Opportunity to our deal schema", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const opportunity = {
      Id: "006000000000001",
      Name: "Acme Corp - Wealth Management",
      StageName: "Proposal/Price Quote",
      Amount: 500000,
      CloseDate: "2024-06-30",
      AccountId: "001000000000001",
      Description: "Full-service wealth management for Acme Corp executives",
      Probability: 75,
      IsClosed: false,
      IsWon: false,
    }

    const result = mapSFOpportunityToDeal(opportunity)

    expect(result).not.toBeNull()
    expect(result!.sfOpportunityId).toBe("006000000000001")
    expect(result!.name).toBe("Acme Corp - Wealth Management")
    expect(result!.stage).toBe("Proposal/Price Quote")
    expect(result!.amount).toBe(500000)
    expect(result!.closeDate).toBe("2024-06-30")
    expect(result!.probability).toBe(75)
    expect(result!.isClosed).toBe(false)
    expect(result!.isWon).toBe(false)
  })

  it("handles Closed Won opportunity (isClosed=true, isWon=true)", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const opportunity = {
      Id: "006000000000002",
      Name: "Big Deal - Won",
      StageName: "Closed Won",
      Amount: 1000000,
      CloseDate: "2024-03-15",
      AccountId: "001000000000002",
      Description: null,
      Probability: 100,
      IsClosed: true,
      IsWon: true,
    }

    const result = mapSFOpportunityToDeal(opportunity)

    expect(result).not.toBeNull()
    expect(result!.isClosed).toBe(true)
    expect(result!.isWon).toBe(true)
    expect(result!.stage).toBe("Closed Won")
    expect(result!.probability).toBe(100)
  })

  it("handles Closed Lost opportunity (isClosed=true, isWon=false)", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const opportunity = {
      Id: "006000000000003",
      Name: "Lost Deal",
      StageName: "Closed Lost",
      Amount: 250000,
      CloseDate: "2024-02-28",
      AccountId: null,
      Description: "Client chose competitor",
      Probability: 0,
      IsClosed: true,
      IsWon: false,
    }

    const result = mapSFOpportunityToDeal(opportunity)

    expect(result).not.toBeNull()
    expect(result!.isClosed).toBe(true)
    expect(result!.isWon).toBe(false)
    expect(result!.stage).toBe("Closed Lost")
  })

  it("handles Opportunity with amount = 0", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const opportunity = {
      Id: "006000000000004",
      Name: "Pro Bono Engagement",
      StageName: "Negotiation",
      Amount: 0,
      CloseDate: "2024-07-01",
      AccountId: null,
      Description: null,
      Probability: 50,
      IsClosed: false,
      IsWon: false,
    }

    const result = mapSFOpportunityToDeal(opportunity)

    expect(result).not.toBeNull()
    expect(result!.amount).toBe(0)
  })

  it("handles Opportunity with null amount", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const opportunity = {
      Id: "006000000000005",
      Name: "Early Stage - No Amount",
      StageName: "Qualification",
      Amount: null,
      CloseDate: "2024-12-31",
      AccountId: null,
      Description: null,
      Probability: 10,
      IsClosed: false,
      IsWon: false,
    }

    const result = mapSFOpportunityToDeal(opportunity)

    expect(result).not.toBeNull()
    expect(result!.amount).toBeNull()
  })

  it("returns null for deleted Opportunities (IsDeleted = true)", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const opportunity = {
      Id: "006000000000006",
      Name: "Deleted Deal",
      StageName: "Prospecting",
      Amount: 100000,
      CloseDate: "2024-01-01",
      AccountId: null,
      Description: null,
      Probability: 20,
      IsClosed: false,
      IsWon: false,
      IsDeleted: true,
    }

    const result = mapSFOpportunityToDeal(opportunity)
    expect(result).toBeNull()
  })

  it("maps all standard Salesforce Opportunity stages", async () => {
    const { mapSFOpportunityToDeal } = await import("@/lib/integrations/salesforce")

    const stages = [
      "Prospecting",
      "Qualification",
      "Needs Analysis",
      "Value Proposition",
      "Id. Decision Makers",
      "Perception Analysis",
      "Proposal/Price Quote",
      "Negotiation/Review",
      "Closed Won",
      "Closed Lost",
    ]

    for (const stage of stages) {
      const opp = {
        Id: `006_${stage.replace(/\s/g, "_")}`,
        Name: `Test - ${stage}`,
        StageName: stage,
        Amount: 100000,
        CloseDate: "2024-12-31",
        AccountId: null,
        Description: null,
        Probability: 50,
        IsClosed: stage.startsWith("Closed"),
        IsWon: stage === "Closed Won",
      }
      const result = mapSFOpportunityToDeal(opp)
      expect(result).not.toBeNull()
      expect(result!.stage).toBe(stage)
    }
  })
})

// ============================================================================
// 6. ERROR CODE HANDLING
// ============================================================================

describe("SalesforceApiError handling", () => {
  it("SalesforceApiError captures errorCode and statusCode", async () => {
    const { SalesforceApiError } = await import("@/lib/integrations/salesforce")

    const error = new SalesforceApiError(
      "Session expired",
      "INVALID_SESSION_ID",
      401,
    )

    expect(error.message).toBe("Session expired")
    expect(error.errorCode).toBe("INVALID_SESSION_ID")
    expect(error.statusCode).toBe(401)
    expect(error.name).toBe("SalesforceApiError")
    expect(error).toBeInstanceOf(Error)
  })
})

describe("Error handling — INVALID_SESSION_ID", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()

    const { db } = await import("@/app/db")
    // Mock getAccessToken path: integration found, token still valid
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
        issued_at: String(Date.now()), // fresh token
        login_url: "https://login.salesforce.com",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    // Mock db.update chain
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("marks integration as 'error' when Salesforce returns INVALID_SESSION_ID", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ errorCode: "INVALID_SESSION_ID", message: "Session expired or invalid" }]),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { db } = await import("@/app/db")

    await expect(syncClients(INTEGRATION_ID)).rejects.toThrow()

    // Verify db.update was called to set status to "error"
    const updateMock = vi.mocked(db.update)
    expect(updateMock).toHaveBeenCalled()

    const setMock = updateMock.mock.results[0]?.value?.set
    if (setMock) {
      const setCall = setMock.mock.calls[0]?.[0]
      expect(setCall?.status).toBe("error")
      expect(setCall?.statusMessage).toContain("reconnect")
    }
  })
})

describe("Error handling — REQUEST_LIMIT_EXCEEDED (retry with backoff)", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()

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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("retries on REQUEST_LIMIT_EXCEEDED then succeeds", async () => {
    let callCount = 0
    global.fetch = vi.fn(async () => {
      callCount++
      if (callCount <= 1) {
        return new Response(
          JSON.stringify([{ errorCode: "REQUEST_LIMIT_EXCEEDED", message: "Rate limit" }]),
          { status: 403, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response(
        JSON.stringify({
          totalSize: 1,
          done: true,
          nextRecordsUrl: null,
          records: [
            {
              Id: "003000000000001",
              FirstName: "Test",
              LastName: "User",
              Email: "test@example.com",
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
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(1)
    expect(result.synced).toBe(1)
    // fetch called at least twice (first fails, second succeeds)
    expect(callCount).toBeGreaterThanOrEqual(2)
  }, 15000)

  it("retries on UNABLE_TO_LOCK_ROW then succeeds", async () => {
    let callCount = 0
    global.fetch = vi.fn(async () => {
      callCount++
      if (callCount <= 1) {
        return new Response(
          JSON.stringify([{ errorCode: "UNABLE_TO_LOCK_ROW", message: "Record locked" }]),
          { status: 500, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response(
        JSON.stringify({
          totalSize: 0,
          done: true,
          nextRecordsUrl: null,
          records: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(0)
    expect(callCount).toBeGreaterThanOrEqual(2)
  }, 15000)
})

// ============================================================================
// 7. isSalesforceConfigured() — feature flag check
// ============================================================================

describe("isSalesforceConfigured()", () => {
  afterEach(() => {
    delete process.env.SALESFORCE_CLIENT_ID
    delete process.env.SALESFORCE_CLIENT_SECRET
    vi.resetModules()
  })

  it("returns true when both env vars are set", async () => {
    process.env.SALESFORCE_CLIENT_ID = "consumer_key_123"
    process.env.SALESFORCE_CLIENT_SECRET = "consumer_secret_abc"
    vi.resetModules()
    const { isSalesforceConfigured } = await import("@/lib/integrations/salesforce")
    expect(isSalesforceConfigured()).toBe(true)
  })

  it("returns false when SALESFORCE_CLIENT_ID is missing", async () => {
    delete process.env.SALESFORCE_CLIENT_ID
    process.env.SALESFORCE_CLIENT_SECRET = "consumer_secret_abc"
    vi.resetModules()
    const { isSalesforceConfigured } = await import("@/lib/integrations/salesforce")
    expect(isSalesforceConfigured()).toBe(false)
  })

  it("returns false when SALESFORCE_CLIENT_SECRET is missing", async () => {
    process.env.SALESFORCE_CLIENT_ID = "consumer_key_123"
    delete process.env.SALESFORCE_CLIENT_SECRET
    vi.resetModules()
    const { isSalesforceConfigured } = await import("@/lib/integrations/salesforce")
    expect(isSalesforceConfigured()).toBe(false)
  })

  it("returns false when both are missing", async () => {
    delete process.env.SALESFORCE_CLIENT_ID
    delete process.env.SALESFORCE_CLIENT_SECRET
    vi.resetModules()
    const { isSalesforceConfigured } = await import("@/lib/integrations/salesforce")
    expect(isSalesforceConfigured()).toBe(false)
  })
})

// ============================================================================
// 8. connectSalesforce — settings shape
// ============================================================================

describe("connectSalesforce() — stored integration record", () => {
  beforeEach(async () => {
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()

    const { db } = await import("@/app/db")
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: INTEGRATION_ID,
            orgId: ORG_ID,
            provider: "salesforce",
            name: "Salesforce",
            status: "connected",
          },
        ]),
      }),
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("creates integration record with provider 'salesforce' and status 'connected'", async () => {
    const { connectSalesforce } = await import("@/lib/integrations/salesforce")
    const id = await connectSalesforce(ORG_ID, USER_ID, {
      accessToken: SF_ACCESS_TOKEN,
      refreshToken: SF_REFRESH_TOKEN,
      instanceUrl: SF_INSTANCE_URL,
      issuedAt: SF_ISSUED_AT,
    })

    expect(id).toBe(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    const insertedRecord = valuesMock.mock.calls[0][0]

    expect(insertedRecord.provider).toBe("salesforce")
    expect(insertedRecord.status).toBe("connected")
    expect(insertedRecord.orgId).toBe(ORG_ID)
    expect(insertedRecord.connectedBy).toBe(USER_ID)
  })

  it("stores instance_url in settings", async () => {
    const { connectSalesforce } = await import("@/lib/integrations/salesforce")
    await connectSalesforce(ORG_ID, USER_ID, {
      accessToken: SF_ACCESS_TOKEN,
      refreshToken: SF_REFRESH_TOKEN,
      instanceUrl: SF_INSTANCE_URL,
      issuedAt: SF_ISSUED_AT,
    })

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    const settings = valuesMock.mock.calls[0][0].settings

    expect(settings.instance_url).toBe(SF_INSTANCE_URL)
    expect(settings._access_token).toBe(SF_ACCESS_TOKEN)
    expect(settings._refresh_token).toBe(SF_REFRESH_TOKEN)
    expect(settings.login_url).toBe("https://login.salesforce.com")
  })

  it("sets externalAccountId to the instance URL", async () => {
    const { connectSalesforce } = await import("@/lib/integrations/salesforce")
    await connectSalesforce(ORG_ID, USER_ID, {
      accessToken: SF_ACCESS_TOKEN,
      refreshToken: SF_REFRESH_TOKEN,
      instanceUrl: SF_INSTANCE_URL,
      issuedAt: SF_ISSUED_AT,
    })

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    expect(valuesMock.mock.calls[0][0].externalAccountId).toBe(SF_INSTANCE_URL)
  })
})

// ============================================================================
// 9. exchangeCodeForTokens — token exchange
// ============================================================================

describe("exchangeCodeForTokens()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_consumer_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_consumer_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("exchanges auth code and returns tokens + instance URL", async () => {
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

    const { exchangeCodeForTokens } = await import("@/lib/integrations/salesforce")
    const result = await exchangeCodeForTokens("auth_code_abc", "https://app.lacoda.com/callback")

    expect(result.accessToken).toBe(SF_ACCESS_TOKEN)
    expect(result.refreshToken).toBe(SF_REFRESH_TOKEN)
    expect(result.instanceUrl).toBe(SF_INSTANCE_URL)
    expect(result.issuedAt).toBe("1700000000000")
  })

  it("sends correct parameters to Salesforce token endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "tok",
          refresh_token: "ref",
          instance_url: SF_INSTANCE_URL,
          issued_at: "123",
        }),
        { status: 200 },
      ),
    )
    global.fetch = mockFetch

    const { exchangeCodeForTokens } = await import("@/lib/integrations/salesforce")
    await exchangeCodeForTokens("auth_code_xyz", "https://app.lacoda.com/callback")

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("/services/oauth2/token")
    expect(options.method).toBe("POST")
    expect(options.body).toContain("grant_type=authorization_code")
    expect(options.body).toContain("code=auth_code_xyz")
    expect(options.body).toContain("client_id=test_consumer_key")
    expect(options.body).toContain("client_secret=test_consumer_secret")
  })

  it("throws when Salesforce returns an error", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "authorization code expired" }),
        { status: 400 },
      ),
    )

    const { exchangeCodeForTokens } = await import("@/lib/integrations/salesforce")
    await expect(
      exchangeCodeForTokens("expired_code", "https://app.lacoda.com/callback"),
    ).rejects.toThrow("Salesforce token exchange failed")
  })
})

// ============================================================================
// 10. EDGE CASES
// ============================================================================

describe("Edge cases — pagination handling", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_CLIENT_ID = "test_key"
    process.env.SALESFORCE_CLIENT_SECRET = "test_secret"
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()

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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("follows nextRecordsUrl for cursor-based pagination", async () => {
    let callCount = 0
    global.fetch = vi.fn(async (url: string) => {
      callCount++
      if (callCount === 1) {
        // First page
        return new Response(
          JSON.stringify({
            totalSize: 2,
            done: false,
            nextRecordsUrl: "/services/data/v59.0/query/01gxx00000000001-2000",
            records: [
              {
                Id: "003000000000001",
                FirstName: "First",
                LastName: "Page",
                Email: "first@example.com",
                Phone: null, MailingStreet: null, MailingCity: null,
                MailingState: null, MailingPostalCode: null, MailingCountry: null,
                Title: null, Department: null, AccountId: null, IsDeleted: false,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      // Second page (final)
      return new Response(
        JSON.stringify({
          totalSize: 2,
          done: true,
          nextRecordsUrl: null,
          records: [
            {
              Id: "003000000000002",
              FirstName: "Second",
              LastName: "Page",
              Email: "second@example.com",
              Phone: null, MailingStreet: null, MailingCity: null,
              MailingState: null, MailingPostalCode: null, MailingCountry: null,
              Title: null, Department: null, AccountId: null, IsDeleted: false,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(2)
    expect(result.synced).toBe(2)
    expect(callCount).toBe(2)
  })

  it("skips contacts without email and increments skipped count", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          totalSize: 2,
          done: true,
          nextRecordsUrl: null,
          records: [
            {
              Id: "003000000000001",
              FirstName: "Has",
              LastName: "Email",
              Email: "has@example.com",
              Phone: null, MailingStreet: null, MailingCity: null,
              MailingState: null, MailingPostalCode: null, MailingCountry: null,
              Title: null, Department: null, AccountId: null, IsDeleted: false,
            },
            {
              Id: "003000000000002",
              FirstName: "No",
              LastName: "Email",
              Email: null,
              Phone: null, MailingStreet: null, MailingCity: null,
              MailingState: null, MailingPostalCode: null, MailingCountry: null,
              Title: null, Department: null, AccountId: null, IsDeleted: false,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const { syncClients } = await import("@/lib/integrations/salesforce")
    const { clients, result } = await syncClients(INTEGRATION_ID)

    expect(clients).toHaveLength(1)
    expect(result.synced).toBe(1)
    expect(result.skipped).toBe(1)
  })
})

describe("Edge cases — disconnectSalesforce", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.com"
    vi.resetModules()

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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("revokes token and sets status to 'disconnected'", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }))

    const { disconnectSalesforce } = await import("@/lib/integrations/salesforce")
    await disconnectSalesforce(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const updateMock = vi.mocked(db.update)
    expect(updateMock).toHaveBeenCalled()

    const setMock = updateMock.mock.results[0]?.value?.set
    const setCall = setMock.mock.calls[0]?.[0]
    expect(setCall.status).toBe("disconnected")
    expect(setCall.settings).toEqual({})
  })

  it("still disconnects even if token revocation fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const { disconnectSalesforce } = await import("@/lib/integrations/salesforce")
    await disconnectSalesforce(INTEGRATION_ID)

    const { db } = await import("@/app/db")
    const updateMock = vi.mocked(db.update)
    const setMock = updateMock.mock.results[0]?.value?.set
    const setCall = setMock.mock.calls[0]?.[0]
    expect(setCall.status).toBe("disconnected")
  })
})
