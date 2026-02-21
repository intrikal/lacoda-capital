// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SERVICE
// ─────────────────────────────────────────────────────────────────────────────
// Currently returns hardcoded mock data.
// To connect real data, replace the body of each function.
//
//   Server Actions → add "use server" at top of your action file, call these
//   API Routes     → call from app/api/dashboard/route.ts
//   tRPC           → call from your tRPC dashboard router
// ─────────────────────────────────────────────────────────────────────────────

import {
  mockKPIs,
  mockAllocationData,
  mockPerformanceData,
  mockRecentActivity,
  mockDashboardSummary,
} from "@/lib/mock/data"
import type {
  KPIData,
  AllocationData,
  PerformanceData,
  ActivityItem,
  DashboardSummary,
} from "@/lib/mock/types"

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // REAL: return db.query... or fetch("/api/dashboard/summary")
  return mockDashboardSummary
}

export async function getKPIs(): Promise<KPIData[]> {
  // REAL: return db.query... aggregating assets, cash flow, risk scores
  return mockKPIs
}

export async function getAllocationData(): Promise<AllocationData[]> {
  // REAL: return db.query.assets.findMany() grouped by class
  return mockAllocationData
}

export async function getPerformanceData(): Promise<PerformanceData[]> {
  // REAL: return monthly portfolio vs benchmark returns from DB
  return mockPerformanceData
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  // REAL: return db.query.ledgerEvents.findMany({ limit: 10, orderBy: desc })
  return mockRecentActivity
}
