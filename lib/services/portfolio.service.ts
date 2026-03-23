"use server"

/**
 * portfolio.service.ts
 *
 * Service layer for the client's personal portfolio holdings.
 * Queries assets + valuations from the DB and maps to PortfolioHolding shape.
 *
 * Architecture position:
 *   Client page -> useClientPortfolio hook -> portfolioService -> Drizzle ORM
 */

import { db } from "@/app/db"
import { assets, valuations } from "@/app/db/schema"
import { eq, desc, isNull } from "drizzle-orm"
import type { PortfolioHolding, AssetClass } from "@/lib/types/mock"

/** Map a DB asset row (with latest valuation) to the PortfolioHolding mock type. */
function toPortfolioHolding(
  asset: typeof assets.$inferSelect,
  latestValuation?: typeof valuations.$inferSelect,
): PortfolioHolding {
  const currentValue = latestValuation
    ? parseFloat(latestValuation.value)
    : parseFloat(asset.currentValue ?? "0")
  const costBasis = parseFloat(asset.acquisitionCost ?? "0")
  const gain = currentValue - costBasis

  return {
    id: asset.id,
    symbol: (asset.metadata as Record<string, unknown>)?.ticker as string ?? asset.name.slice(0, 6).toUpperCase(),
    name: asset.name,
    assetClass: asset.assetClass as AssetClass,
    value: currentValue,
    costBasis,
    shares: ((asset.metadata as Record<string, unknown>)?.shares as number) ?? null,
    price: ((asset.metadata as Record<string, unknown>)?.price as number) ?? null,
    gain,
    gainPercent: costBasis > 0 ? (gain / costBasis) * 100 : 0,
    annualIncome: ((asset.metadata as Record<string, unknown>)?.annualIncome as number) ?? undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations (client portfolio is advisor-managed — no writes via client)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all holdings for the current client.
 * Joins assets with their latest valuation.
 */
export async function getPortfolioHoldings(): Promise<PortfolioHolding[]> {
  const assetRows = await db
    .select()
    .from(assets)
    .where(isNull(assets.deletedAt))

  const holdings: PortfolioHolding[] = []
  for (const asset of assetRows) {
    // Get the latest valuation for each asset
    const latestVal = await db
      .select()
      .from(valuations)
      .where(eq(valuations.assetId, asset.id))
      .orderBy(desc(valuations.asOfDate))
      .limit(1)
    holdings.push(toPortfolioHolding(asset, latestVal[0]))
  }
  return holdings
}

/**
 * Fetch a single holding by ID.
 * Returns undefined if the ID is not found.
 */
export async function getHoldingById(id: string): Promise<PortfolioHolding | undefined> {
  const rows = await db.select().from(assets).where(eq(assets.id, id))
  if (!rows[0]) return undefined
  const latestVal = await db
    .select()
    .from(valuations)
    .where(eq(valuations.assetId, id))
    .orderBy(desc(valuations.asOfDate))
    .limit(1)
  return toPortfolioHolding(rows[0], latestVal[0])
}

/**
 * Fetch holdings filtered by asset class — used for tab filtering in the portfolio page.
 */
export async function getHoldingsByClass(assetClass: AssetClass): Promise<PortfolioHolding[]> {
  const all = await getPortfolioHoldings()
  return all.filter((h) => h.assetClass === assetClass)
}

/**
 * Computed portfolio summary — total value, cost basis, total gain, YTD income.
 */
export async function getPortfolioSummary() {
  const holdings = await getPortfolioHoldings()
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0)
  const totalGain = holdings.reduce((sum, h) => sum + h.gain, 0)
  const totalAnnualIncome = holdings.reduce((sum, h) => sum + (h.annualIncome ?? 0), 0)
  const gainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0

  return {
    totalValue,
    totalCostBasis,
    totalGain,
    gainPercent,
    totalAnnualIncome,
    holdingCount: holdings.length,
  }
}
