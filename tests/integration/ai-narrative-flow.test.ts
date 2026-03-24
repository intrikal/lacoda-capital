import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration tests for the AI report narrative flow.
 *
 * Tests: Generate narrative for a portfolio → verify numbers in text match DB aggregation.
 */

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => ({
    userId: "user-1",
    email: "admin@test.com",
    role: "admin",
    orgId: "org-1",
    memberId: "member-1",
  })),
}))

// Mock database with realistic multi-asset portfolio
const mockAssets = [
  { id: "a1", entityId: "e1", name: "123 Main St", assetClass: "real_estate", currentValue: "2500000" },
  { id: "a2", entityId: "e1", name: "Vanguard S&P 500", assetClass: "equities", currentValue: "1500000" },
  { id: "a3", entityId: "e2", name: "Treasury Bonds", assetClass: "fixed_income", currentValue: "800000" },
  { id: "a4", entityId: "e2", name: "Cash Reserve", assetClass: "cash", currentValue: "500000" },
  { id: "a5", entityId: "e3", name: "Bitcoin Holdings", assetClass: "crypto", currentValue: "300000" },
  { id: "a6", entityId: "e3", name: "Gold Bars", assetClass: "commodities", currentValue: "200000" },
  { id: "a7", entityId: "e1", name: "Office Building", assetClass: "real_estate", currentValue: "3000000" },
  { id: "a8", entityId: "e2", name: "Private Fund I", assetClass: "private_equity", currentValue: "1000000" },
  { id: "a9", entityId: "e3", name: "Apple Stock", assetClass: "equities", currentValue: "750000" },
  { id: "a10", entityId: "e1", name: "Rental Property", assetClass: "real_estate", currentValue: "450000" },
]

vi.mock("@/app/db", () => ({
  db: {
    query: {
      reports: {
        findFirst: vi.fn(async () => ({
          id: "report-1",
          orgId: "org-1",
          clientId: "client-1",
          reportType: "portfolio_summary",
          currentVersionNumber: 0,
        })),
      },
      clients: {
        findFirst: vi.fn(async () => ({
          id: "client-1",
          displayName: "Smith Family Portfolio",
        })),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => [
            { id: "e1" }, { id: "e2" }, { id: "e3" },
          ]),
        })),
        where: vi.fn(() => {
          // Return a chainable object that eventually resolves to data
          const chainable = {
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => []),
            })),
            then: (resolve: (v: unknown) => void) => resolve(mockAssets),
          }
          return chainable
        }),
        orderBy: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "version-1" }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  },
}))

vi.mock("@/app/db/schema", () => ({
  reports: { id: "id", orgId: "org_id" },
  reportVersions: {},
  assets: { id: "id", entityId: "entity_id", currentValue: "current_value" },
  valuations: { assetId: "asset_id", createdAt: "created_at" },
  ledgerEvents: { orgId: "org_id", createdAt: "created_at" },
  clients: { id: "id", orgId: "org_id" },
  entities: { id: "id", clientId: "client_id" },
}))

vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: vi.fn(),
}))

// Mock the narrative agent to return text that includes the actual AUM
vi.mock("@/lib/agents/narrative", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    narrativeAgent: {
      run: vi.fn(async (prompt: string) => {
        // Extract the AUM from the prompt and include it in the response
        const aumMatch = prompt.match(/Total AUM: \$([\d,]+\.\d+)/)
        const aum = aumMatch ? aumMatch[1] : "unknown"

        return {
          success: true,
          data: {
            summary: `The Smith Family Portfolio maintained strong performance this quarter with total assets under management of $${aum}. The real estate allocation comprising three properties represents the largest holding at approximately 56% of the portfolio. Equity positions including the Vanguard S&P 500 index fund and individual Apple stock contributed to balanced growth across asset classes.`,
            key_highlights: [
              `Total AUM of $${aum}`,
              "Real estate represents 56% of portfolio",
              "10 assets across 6 asset classes",
            ],
            generated_by: "ai" as const,
          },
          latencyMs: 3000,
          logId: "log-1",
        }
      }),
    },
  }
})

describe("AI narrative generation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates narrative for a 10-asset portfolio with correct AUM", async () => {
    const { generateReportNarrative } = await import("@/lib/actions/ai-narrative.actions")

    const result = await generateReportNarrative("report-1")

    expect(result.success).toBe(true)
    if (result.success) {
      // The total AUM of all 10 assets = $11,000,000
      const expectedAUM = mockAssets.reduce((sum, a) => sum + parseFloat(a.currentValue), 0)
      expect(expectedAUM).toBe(11000000)

      // The narrative should contain the actual AUM, not a hallucinated number
      expect(result.data.summary).toContain("11,000,000")
    }
  })
})
