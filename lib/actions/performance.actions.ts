"use server"

import { eq, and, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, valuations, entities, clients } from "@/app/db/schema"
import { requireAuth } from "@/lib/auth"
import {
  calculatePeriodReturns,
  buildTWRTimeSeries,
  calculateTWR,
} from "@/lib/calculations/performance"
import type { Valuation, PeriodReturns, TWRDataPoint } from "@/lib/calculations/performance"
import { captureServerEvent } from "@/lib/analytics/server"

// ============================================================================
// Performance Server Actions
// ============================================================================

/**
 * Get performance metrics (YTD, 1Y, Since Inception) for a single asset.
 */
export async function getAssetPerformance(
  assetId: string
): Promise<PeriodReturns & { hasData: boolean }> {
  await requireAuth()

  const vals = await db
    .select({ value: valuations.value, date: valuations.asOfDate })
    .from(valuations)
    .where(eq(valuations.assetId, assetId))
    .orderBy(valuations.asOfDate)

  if (vals.length < 2) {
    return { ytd: null, oneYear: null, sinceInception: null, hasData: false }
  }

  const mapped: Valuation[] = vals.map((v) => ({
    date: new Date(v.date),
    value: parseFloat(v.value),
  }))

  const returns = calculatePeriodReturns(mapped)
  captureServerEvent(session.userId, "performance.calculated", { metric_type: "asset_period_returns" })
  return { ...returns, hasData: true }
}

/**
 * Get TWR time series for charting on asset detail.
 */
export async function getAssetTWRTimeSeries(
  assetId: string
): Promise<TWRDataPoint[]> {
  await requireAuth()

  const vals = await db
    .select({ value: valuations.value, date: valuations.asOfDate })
    .from(valuations)
    .where(eq(valuations.assetId, assetId))
    .orderBy(valuations.asOfDate)

  if (vals.length < 2) return []

  const mapped: Valuation[] = vals.map((v) => ({
    date: new Date(v.date),
    value: parseFloat(v.value),
  }))

  return buildTWRTimeSeries(mapped)
}

/**
 * Get portfolio-level TWR across all active assets for the org.
 */
export async function getPortfolioPerformance(): Promise<
  PeriodReturns & { hasData: boolean }
> {
  const session = await requireAuth()

  // Get all active asset IDs for this org
  const orgAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .innerJoin(entities, eq(assets.entityId, entities.id))
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(
      and(
        eq(clients.orgId, session.orgId!),
        eq(assets.status, "active"),
        isNull(assets.deletedAt)
      )
    )

  const assetIds = orgAssets.map((a) => a.id)
  if (assetIds.length === 0) {
    return { ytd: null, oneYear: null, sinceInception: null, hasData: false }
  }

  // Get all valuations, grouped by date, summed
  // This creates a synthetic "portfolio valuation" time series
  const portfolioVals = await db
    .select({
      date: valuations.asOfDate,
      totalValue: sql<string>`SUM(CAST(${valuations.value} AS DOUBLE PRECISION))`,
    })
    .from(valuations)
    .where(sql`${valuations.assetId} = ANY(${assetIds})`)
    .groupBy(valuations.asOfDate)
    .orderBy(valuations.asOfDate)

  if (portfolioVals.length < 2) {
    return { ytd: null, oneYear: null, sinceInception: null, hasData: false }
  }

  const mapped: Valuation[] = portfolioVals.map((v) => ({
    date: new Date(v.date),
    value: parseFloat(v.totalValue),
  }))

  const returns = calculatePeriodReturns(mapped)
  captureServerEvent(session.userId, "performance.calculated", { metric_type: "portfolio_period_returns" })
  return { ...returns, hasData: true }
}

/**
 * Get performance data for all assets (for the sortable asset list column).
 * Returns a map of assetId → sinceInception return.
 */
export async function getAllAssetReturns(): Promise<
  Record<string, { sinceInception: number | null; hasData: boolean }>
> {
  const session = await requireAuth()

  // Get all assets for the org
  const orgAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .innerJoin(entities, eq(assets.entityId, entities.id))
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(
      and(
        eq(clients.orgId, session.orgId!),
        isNull(assets.deletedAt)
      )
    )

  const result: Record<string, { sinceInception: number | null; hasData: boolean }> = {}

  for (const asset of orgAssets) {
    const vals = await db
      .select({ value: valuations.value, date: valuations.asOfDate })
      .from(valuations)
      .where(eq(valuations.assetId, asset.id))
      .orderBy(valuations.asOfDate)

    if (vals.length < 2) {
      result[asset.id] = { sinceInception: null, hasData: false }
      continue
    }

    const mapped: Valuation[] = vals.map((v) => ({
      date: new Date(v.date),
      value: parseFloat(v.value),
    }))

    const twr = calculateTWR(mapped)
    result[asset.id] = { sinceInception: twr.twr, hasData: true }
  }

  return result
}
