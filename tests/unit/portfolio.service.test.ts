/**
 * ============================================================================
 * TEST FILE: portfolio.service.test.ts
 * ============================================================================
 *
 * Kevin, the portfolio service has the most complex DB interaction of all
 * the services: it loops over every asset and fires a SECOND query to fetch
 * the latest valuation for that asset. So `db.select()` is called multiple
 * times per service call.
 *
 * Query chain patterns:
 *
 *   getPortfolioHoldings (per call):
 *     1st  → db.select().from(assets).where(isNull)           terminal: where
 *     2nd+ → db.select().from(valuations).where().orderBy().limit(1)  terminal: limit
 *
 *   getHoldingById:
 *     1st  → db.select().from(assets).where(eq id)            terminal: where
 *     2nd  → db.select().from(valuations).where().orderBy().limit(1)  terminal: limit
 *
 *   getHoldingsByClass  → calls getPortfolioHoldings() then filters in JS
 *   getPortfolioSummary → calls getPortfolioHoldings() then aggregates in JS
 *
 * RELATED FILES:
 *   lib/services/portfolio.service.ts  — service under test
 *   app/db/schema/assets.ts            — assets table
 *   app/db/schema/valuations.ts        — valuations table
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getPortfolioHoldings,
  getHoldingById,
  getHoldingsByClass,
  getPortfolioSummary,
} from "@/lib/services/portfolio.service"

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a mock chain where `terminal` resolves and all others return `this`.
 */
function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeAssetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-001",
    name: "Manhattan Tower",
    assetClass: "real_estate",
    currentValue: "5000000.00",
    acquisitionCost: "4000000.00",
    metadata: { ticker: "MANH", shares: null, price: null, annualIncome: 120000 },
    deletedAt: null,
    ...overrides,
  }
}

function makeValuationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "val-001",
    assetId: "asset-001",
    value: "5200000.00",
    asOfDate: "2024-01-15",
    ...overrides,
  }
}

/**
 * Set up db.select() to return:
 *   - `assets` chain first (terminal: where → resolves to assetRows)
 *   - then one `valuations` chain per asset (terminal: limit → resolves to [valRow] or [])
 */
function mockAssetsWithValuations(
  assetRows: ReturnType<typeof makeAssetRow>[],
  valuationsByAsset: (ReturnType<typeof makeValuationRow> | null)[] = [],
) {
  const calls: ReturnType<typeof makeChain>[] = [
    makeChain("where", assetRows), // assets query
    ...assetRows.map((_, i) =>
      makeChain("limit", valuationsByAsset[i] ? [valuationsByAsset[i]] : []),
    ),
  ]
  let callIndex = 0
  vi.mocked(db.select).mockImplementation(() => {
    const chain = calls[callIndex] ?? makeChain("limit", [])
    callIndex++
    return chain as never
  })
}

// ============================================================================
// 1. toPortfolioHolding — DB row mapping (tested via getPortfolioHoldings)
// ============================================================================

describe("toPortfolioHolding — DB row to PortfolioHolding mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields from asset row", async () => {
    mockAssetsWithValuations([makeAssetRow()], [null])

    const holdings = await getPortfolioHoldings()
    const h = holdings[0]

    expect(h.id).toBe("asset-001")
    expect(h.name).toBe("Manhattan Tower")
    expect(h.assetClass).toBe("real_estate")
  })

  it("uses latest valuation value when available", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ currentValue: "5000000.00" })],
      [makeValuationRow({ value: "5200000.00" })],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].value).toBeCloseTo(5_200_000)
  })

  it("falls back to asset.currentValue when no valuation exists", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ currentValue: "5000000.00" })],
      [null],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].value).toBeCloseTo(5_000_000)
  })

  it("calculates gain as currentValue minus costBasis", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ acquisitionCost: "4000000.00" })],
      [makeValuationRow({ value: "5200000.00" })],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].gain).toBeCloseTo(1_200_000)
  })

  it("calculates gainPercent correctly", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ acquisitionCost: "4000000.00" })],
      [makeValuationRow({ value: "5000000.00" })],
    )

    const holdings = await getPortfolioHoldings()
    // gain = 1_000_000; costBasis = 4_000_000 → gainPercent = 25%
    expect(holdings[0].gainPercent).toBeCloseTo(25)
  })

  it("gainPercent is 0 when costBasis is 0 (avoids div-by-zero)", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ acquisitionCost: "0" })],
      [makeValuationRow({ value: "100000.00" })],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].gainPercent).toBe(0)
  })

  it("reads annualIncome from asset metadata", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ metadata: { annualIncome: 120_000 } })],
      [null],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].annualIncome).toBe(120_000)
  })

  it("annualIncome is undefined when not in metadata", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ metadata: {} })],
      [null],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].annualIncome).toBeUndefined()
  })

  it("symbol comes from metadata.ticker when present", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ name: "Quantum Computing", metadata: { ticker: "QCTK" } })],
      [null],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].symbol).toBe("QCTK")
  })

  it("symbol falls back to first 6 chars of name when no ticker", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ name: "SomeLong Asset Name", metadata: {} })],
      [null],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings[0].symbol).toBe("SOMELO")
  })
})

// ============================================================================
// 2. getPortfolioHoldings
// ============================================================================

describe("getPortfolioHoldings", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no assets exist", async () => {
    mockAssetsWithValuations([], [])

    const holdings = await getPortfolioHoldings()
    expect(holdings).toEqual([])
  })

  it("returns one holding per asset", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ id: "a1" }), makeAssetRow({ id: "a2" })],
      [null, null],
    )

    const holdings = await getPortfolioHoldings()
    expect(holdings).toHaveLength(2)
  })

  it("fires one valuation query per asset", async () => {
    const assets = [
      makeAssetRow({ id: "a1" }),
      makeAssetRow({ id: "a2" }),
      makeAssetRow({ id: "a3" }),
    ]
    mockAssetsWithValuations(assets, [null, null, null])

    await getPortfolioHoldings()
    // 1 assets query + 3 valuation queries = 4 select() calls
    expect(vi.mocked(db.select)).toHaveBeenCalledTimes(4)
  })

  it("applies deletedAt IS NULL filter on assets query", async () => {
    const assetChain = makeChain("where", [])
    vi.mocked(db.select).mockReturnValue(assetChain as never)

    await getPortfolioHoldings()
    expect(assetChain.where).toHaveBeenCalled()
  })

  it("propagates DB errors from the assets query", async () => {
    const chain = makeChain("where", [])
    chain.where.mockRejectedValue(new Error("DB unavailable"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getPortfolioHoldings()).rejects.toThrow("DB unavailable")
  })
})

// ============================================================================
// 3. getHoldingById
// ============================================================================

describe("getHoldingById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns mapped PortfolioHolding when asset is found", async () => {
    const assetRow = makeAssetRow({ id: "asset-007" })
    const valRow = makeValuationRow({ assetId: "asset-007", value: "6000000.00" })

    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [assetRow]) as never)
      .mockReturnValueOnce(makeChain("limit", [valRow]) as never)

    const holding = await getHoldingById("asset-007")
    expect(holding).toBeDefined()
    expect(holding!.id).toBe("asset-007")
  })

  it("returns undefined when asset is not found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const holding = await getHoldingById("no-such-asset")
    expect(holding).toBeUndefined()
  })

  it("returns holding with value from valuation row", async () => {
    const assetRow = makeAssetRow({ currentValue: "4000000.00" })
    const valRow = makeValuationRow({ value: "4800000.00" })

    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [assetRow]) as never)
      .mockReturnValueOnce(makeChain("limit", [valRow]) as never)

    const holding = await getHoldingById("asset-001")
    expect(holding!.value).toBeCloseTo(4_800_000)
  })

  it("uses asset.currentValue when no valuation exists", async () => {
    const assetRow = makeAssetRow({ currentValue: "3000000.00" })

    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", [assetRow]) as never)
      .mockReturnValueOnce(makeChain("limit", []) as never)

    const holding = await getHoldingById("asset-001")
    expect(holding!.value).toBeCloseTo(3_000_000)
  })
})

// ============================================================================
// 4. getHoldingsByClass
// ============================================================================

describe("getHoldingsByClass", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns only holdings in the requested asset class", async () => {
    mockAssetsWithValuations(
      [
        makeAssetRow({ id: "a1", assetClass: "equities" }),
        makeAssetRow({ id: "a2", assetClass: "real_estate" }),
        makeAssetRow({ id: "a3", assetClass: "equities" }),
      ],
      [null, null, null],
    )

    const holdings = await getHoldingsByClass("equities")
    expect(holdings).toHaveLength(2)
    for (const h of holdings) {
      expect(h.assetClass).toBe("equities")
    }
  })

  it("returns empty array when no holdings match the class", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ assetClass: "real_estate" })],
      [null],
    )

    const holdings = await getHoldingsByClass("crypto")
    expect(holdings).toEqual([])
  })
})

// ============================================================================
// 5. getPortfolioSummary
// ============================================================================

describe("getPortfolioSummary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all-zero summary when no holdings exist", async () => {
    mockAssetsWithValuations([], [])

    const summary = await getPortfolioSummary()
    expect(summary.totalValue).toBe(0)
    expect(summary.totalCostBasis).toBe(0)
    expect(summary.totalGain).toBe(0)
    expect(summary.gainPercent).toBe(0)
    expect(summary.totalAnnualIncome).toBe(0)
    expect(summary.holdingCount).toBe(0)
  })

  it("calculates totalValue as sum of all holding values", async () => {
    mockAssetsWithValuations(
      [
        makeAssetRow({ id: "a1", acquisitionCost: "1000000.00" }),
        makeAssetRow({ id: "a2", acquisitionCost: "2000000.00" }),
      ],
      [
        makeValuationRow({ assetId: "a1", value: "1500000.00" }),
        makeValuationRow({ assetId: "a2", value: "2500000.00" }),
      ],
    )

    const summary = await getPortfolioSummary()
    expect(summary.totalValue).toBeCloseTo(4_000_000)
  })

  it("calculates totalGain as totalValue minus totalCostBasis", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ id: "a1", acquisitionCost: "4000000.00" })],
      [makeValuationRow({ assetId: "a1", value: "5000000.00" })],
    )

    const summary = await getPortfolioSummary()
    expect(summary.totalGain).toBeCloseTo(1_000_000)
  })

  it("calculates gainPercent as totalGain / totalCostBasis * 100", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ id: "a1", acquisitionCost: "4000000.00" })],
      [makeValuationRow({ assetId: "a1", value: "5000000.00" })],
    )

    const summary = await getPortfolioSummary()
    expect(summary.gainPercent).toBeCloseTo(25)
  })

  it("gainPercent is 0 when totalCostBasis is 0 (avoids div-by-zero)", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ id: "a1", acquisitionCost: "0" })],
      [makeValuationRow({ assetId: "a1", value: "100000.00" })],
    )

    const summary = await getPortfolioSummary()
    expect(summary.gainPercent).toBe(0)
  })

  it("sums totalAnnualIncome from metadata across holdings", async () => {
    mockAssetsWithValuations(
      [
        makeAssetRow({ id: "a1", metadata: { annualIncome: 50_000 } }),
        makeAssetRow({ id: "a2", metadata: { annualIncome: 30_000 } }),
      ],
      [null, null],
    )

    const summary = await getPortfolioSummary()
    expect(summary.totalAnnualIncome).toBe(80_000)
  })

  it("holdingCount matches number of assets", async () => {
    mockAssetsWithValuations(
      [makeAssetRow({ id: "a1" }), makeAssetRow({ id: "a2" }), makeAssetRow({ id: "a3" })],
      [null, null, null],
    )

    const summary = await getPortfolioSummary()
    expect(summary.holdingCount).toBe(3)
  })
})
