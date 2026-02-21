/**
 * portfolio.service.ts
 *
 * Service layer for the client's personal portfolio holdings.
 * All functions are async to mirror the real database call signature.
 *
 * Architecture position:
 *   Client page → useClientPortfolio hook → portfolioService → (mock data today, Drizzle tomorrow)
 *
 * tRPC swap path:
 *   Each function body is replaced by a tRPC router procedure:
 *   `const holdings = await ctx.db.select().from(portfolioHoldings).where(eq(portfolioHoldings.clientId, ctx.session.user.id))`
 */

import { mockPortfolioHoldings } from "@/lib/mock/data"
import type { PortfolioHolding, AssetClass } from "@/lib/mock/types"

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations (client portfolio is advisor-managed — no writes via client)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all holdings for the current client.
 * Simulates network latency for realistic loading-state behaviour.
 */
export async function getPortfolioHoldings(): Promise<PortfolioHolding[]> {
  return Promise.resolve([...mockPortfolioHoldings])
}

/**
 * Fetch a single holding by ID.
 * Returns undefined if the ID is not found.
 */
export async function getHoldingById(id: string): Promise<PortfolioHolding | undefined> {
  return Promise.resolve(mockPortfolioHoldings.find((h) => h.id === id))
}

/**
 * Fetch holdings filtered by asset class — used for tab filtering in the portfolio page.
 */
export async function getHoldingsByClass(assetClass: AssetClass): Promise<PortfolioHolding[]> {
  return Promise.resolve(mockPortfolioHoldings.filter((h) => h.assetClass === assetClass))
}

/**
 * Computed portfolio summary — total value, cost basis, total gain, YTD income.
 * On the real backend this would be a single aggregating SQL query.
 */
export async function getPortfolioSummary() {
  const holdings = mockPortfolioHoldings
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0)
  const totalGain = holdings.reduce((sum, h) => sum + h.gain, 0)
  const totalAnnualIncome = holdings.reduce((sum, h) => sum + (h.annualIncome ?? 0), 0)
  const gainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0

  return Promise.resolve({
    totalValue,
    totalCostBasis,
    totalGain,
    gainPercent,
    totalAnnualIncome,
    holdingCount: holdings.length,
  })
}
