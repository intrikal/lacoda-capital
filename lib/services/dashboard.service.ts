"use server"

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SERVICE
// ─────────────────────────────────────────────────────────────────────────────
// Aggregates data from real tables where possible.
// Performance data is kept static (needs time-series infrastructure).
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { assets, clients, ledgerEvents } from "@/app/db/schema"
import { count, sum, desc, isNull, sql } from "drizzle-orm"
import type {
  KPIData,
  AllocationData,
  PerformanceData,
  ActivityItem,
  DashboardSummary,
} from "@/lib/types/mock"

export async function getDashboardSummary(
  orgCurrency?: string
): Promise<DashboardSummary> {
  // Aggregate total portfolio value from assets.currentValue
  // When orgCurrency is provided, values are summed in their original currency
  // (currency conversion happens at the caller level for mixed-currency portfolios)
  const [assetAgg] = await db
    .select({
      totalValue: sql<number>`COALESCE(SUM(CAST(${assets.currentValue} AS DOUBLE PRECISION)), 0)`,
    })
    .from(assets)
    .where(isNull(assets.deletedAt))

  const totalPortfolioValue = Number(assetAgg?.totalValue ?? 0)

  // Count active alerts (no alerts table — hardcode for now)
  const activeAlerts = 3

  return {
    totalPortfolioValue,
    monthlyChange: 0,
    monthlyChangePercent: 0,
    ytdReturn: 0,
    netWorth: totalPortfolioValue,
    activeAlerts,
  }
}

export async function getKPIs(): Promise<KPIData[]> {
  // Aggregate AUM from assets
  const [assetAgg] = await db
    .select({
      totalValue: sql<number>`COALESCE(SUM(CAST(${assets.currentValue} AS DOUBLE PRECISION)), 0)`,
    })
    .from(assets)
    .where(isNull(assets.deletedAt))

  const aum = Number(assetAgg?.totalValue ?? 0)

  // Count clients
  const [clientAgg] = await db
    .select({ value: count() })
    .from(clients)
    .where(isNull(clients.deletedAt))

  return [
    {
      label: "Assets Under Management",
      value: aum,
      previousValue: 0,
      format: "currency",
      trend: "neutral",
    },
    {
      label: "Total Clients",
      value: clientAgg?.value ?? 0,
      previousValue: 0,
      format: "number",
      trend: "neutral",
    },
  ]
}

export async function getAllocationData(): Promise<AllocationData[]> {
  // Group assets by asset_class and sum currentValue
  const rows = await db
    .select({
      assetClass: assets.assetClass,
      totalValue: sql<number>`COALESCE(SUM(CAST(${assets.currentValue} AS DOUBLE PRECISION)), 0)`,
    })
    .from(assets)
    .where(isNull(assets.deletedAt))
    .groupBy(assets.assetClass)

  const colorMap: Record<string, string> = {
    real_estate: "#0d9488",
    equities: "#0891b2",
    fixed_income: "#06b6d4",
    private_equity: "#22d3d1",
    cash: "#5eead4",
    alternatives: "#2dd4bf",
    intellectual_property: "#14b8a6",
    venture_capital: "#0e7490",
    hedge_funds: "#115e59",
    commodities: "#134e4a",
    crypto: "#0f766e",
    collectibles: "#155e75",
    insurance: "#164e63",
    other: "#1e3a5f",
  }

  const nameMap: Record<string, string> = {
    real_estate: "Real Estate",
    equities: "Equities",
    fixed_income: "Fixed Income",
    private_equity: "Private Equity",
    cash: "Cash",
    alternatives: "Alternatives",
    intellectual_property: "Intellectual Property",
    venture_capital: "Venture Capital",
    hedge_funds: "Hedge Funds",
    commodities: "Commodities",
    crypto: "Crypto",
    collectibles: "Collectibles",
    insurance: "Insurance",
    other: "Other",
  }

  return rows.map((r) => ({
    name: nameMap[r.assetClass] ?? r.assetClass,
    value: Number(r.totalValue),
    color: colorMap[r.assetClass] ?? "#6b7280",
    class: r.assetClass as AllocationData["class"],
  }))
}

export async function getPerformanceData(): Promise<PerformanceData[]> {
  // Performance data requires time-series infrastructure — return static data for now
  return [
    { month: "Feb", portfolio: 2.1, benchmark: 1.8 },
    { month: "Mar", portfolio: -0.8, benchmark: -1.2 },
    { month: "Apr", portfolio: 1.5, benchmark: 1.1 },
    { month: "May", portfolio: 3.2, benchmark: 2.4 },
    { month: "Jun", portfolio: 1.8, benchmark: 2.0 },
    { month: "Jul", portfolio: 2.9, benchmark: 2.5 },
    { month: "Aug", portfolio: -0.5, benchmark: -0.8 },
    { month: "Sep", portfolio: 1.2, benchmark: 0.9 },
    { month: "Oct", portfolio: -1.1, benchmark: -1.5 },
    { month: "Nov", portfolio: 4.2, benchmark: 3.8 },
    { month: "Dec", portfolio: 2.8, benchmark: 2.2 },
    { month: "Jan", portfolio: 1.9, benchmark: 1.5 },
  ]
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const rows = await db
    .select()
    .from(ledgerEvents)
    .orderBy(desc(ledgerEvents.createdAt))
    .limit(10)

  return rows.map((row) => ({
    id: row.id,
    type: row.action as ActivityItem["type"],
    description: (row.payload as Record<string, unknown>)?.details as string ?? row.action,
    user: row.actorUserId ?? "system",
    timestamp: row.createdAt.toISOString(),
    entityName: (row.payload as Record<string, unknown>)?.entityName as string ?? row.targetType,
  }))
}
