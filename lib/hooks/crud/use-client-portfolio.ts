/**
 * use-client-portfolio.ts
 *
 * Read-only hook for the client's personal investment portfolio.
 * Portfolio holdings are managed by the advisor; the client only views them.
 *
 * Architecture position:
 *   Portfolio page → useClientPortfolio() → portfolioService.getPortfolioHoldings() → mock data
 *
 * tRPC swap path:
 *   Replace the `useEffect` fetch with:
 *   `const { data: holdings } = trpc.client.portfolio.holdings.useQuery()`
 *   `const { data: summary } = trpc.client.portfolio.summary.useQuery()`
 *   The return shape stays identical — consuming components need zero changes.
 *
 * @example
 * ```tsx
 * const { holdings, summary, isLoading } = useClientPortfolio()
 * ```
 */

"use client"

import * as React from "react"
import {
  getPortfolioHoldings,
  getPortfolioSummary,
} from "@/lib/services/portfolio.service"
import type { PortfolioHolding, AssetClass } from "@/lib/types/mock"

// ─────────────────────────────────────────────────────────────────────────────
// Shape of computed portfolio stats returned by the hook
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioStats {
  /** Current market value of all holdings combined */
  totalValue: number
  /** Original purchase cost of all holdings combined */
  totalCostBasis: number
  /** Dollar gain vs cost basis */
  totalGain: number
  /** Percentage gain vs cost basis */
  gainPercent: number
  /** Total expected annual income (dividends + distributions) */
  totalAnnualIncome: number
  /** Number of discrete holding positions */
  holdingCount: number
  /** Allocation breakdown by asset class as percentage of total value */
  allocationByClass: Record<AssetClass, number>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseClientPortfolioReturn {
  /** All portfolio holdings, loaded from the service layer */
  holdings: PortfolioHolding[]
  /** Computed summary statistics */
  stats: PortfolioStats
  /** True while the initial fetch is in progress */
  isLoading: boolean
  /**
   * Returns holdings filtered by asset class.
   * Computed client-side from the in-memory list.
   */
  getHoldingsByClass: (assetClass: AssetClass) => PortfolioHolding[]
}

const EMPTY_STATS: PortfolioStats = {
  totalValue: 0,
  totalCostBasis: 0,
  totalGain: 0,
  gainPercent: 0,
  totalAnnualIncome: 0,
  holdingCount: 0,
  allocationByClass: {} as Record<AssetClass, number>,
}

export function useClientPortfolio(): UseClientPortfolioReturn {
  const [holdings, setHoldings] = React.useState<PortfolioHolding[]>([])
  const [stats, setStats] = React.useState<PortfolioStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = React.useState(true)

  // Guard against React 19 StrictMode double-invocation
  const hasFetched = React.useRef(false)

  React.useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    Promise.all([getPortfolioHoldings(), getPortfolioSummary()]).then(
      ([fetchedHoldings, fetchedSummary]) => {
        setHoldings(fetchedHoldings)

        // Compute allocation breakdown as % of total value per asset class
        const allocationByClass = fetchedHoldings.reduce(
          (acc, h) => {
            acc[h.assetClass] = (acc[h.assetClass] ?? 0) + h.value
            return acc
          },
          {} as Record<AssetClass, number>
        )
        if (fetchedSummary.totalValue > 0) {
          for (const cls in allocationByClass) {
            allocationByClass[cls as AssetClass] =
              (allocationByClass[cls as AssetClass] / fetchedSummary.totalValue) * 100
          }
        }

        setStats({ ...fetchedSummary, allocationByClass })
        setIsLoading(false)
      }
    )
  }, [])

  /** Filter holdings by asset class without a service round-trip */
  const getHoldingsByClass = React.useCallback(
    (assetClass: AssetClass) => holdings.filter((h) => h.assetClass === assetClass),
    [holdings]
  )

  return { holdings, stats, isLoading, getHoldingsByClass }
}
