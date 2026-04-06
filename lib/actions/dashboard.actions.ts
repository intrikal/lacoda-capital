"use server"

import { eq, and, sum, desc, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import {
  assets,
  entities,
  clients,
  ledgerEvents,
  users,
} from "@/app/db/schema"
import { requireAdvisor } from "@/lib/auth"

// ─── Allocation by asset class ─────────────────────────────────────────────

export interface AllocationSlice {
  name: string
  value: number
  color: string
}

const CLASS_COLORS: Record<string, string> = {
  real_estate: "#14b8a6",
  equities: "#06b6d4",
  private_equity: "#8b5cf6",
  fixed_income: "#f59e0b",
  venture_capital: "#ec4899",
  hedge_funds: "#f97316",
  commodities: "#10b981",
  cash: "#6366f1",
  crypto: "#ec4899",
  collectibles: "#a855f7",
  intellectual_property: "#0ea5e9",
  insurance: "#84cc16",
  other: "#71717a",
}

const CLASS_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  equities: "Equities",
  private_equity: "Private Equity",
  fixed_income: "Fixed Income",
  venture_capital: "Venture Capital",
  hedge_funds: "Hedge Funds",
  commodities: "Commodities",
  cash: "Cash",
  crypto: "Crypto",
  collectibles: "Collectibles",
  intellectual_property: "IP",
  insurance: "Insurance",
  other: "Other",
}

export async function getAllocationByAssetClass(): Promise<AllocationSlice[]> {
  const session = await requireAdvisor()

  const rows = await db
    .select({
      assetClass: assets.assetClass,
      total: sum(assets.currentValue),
    })
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
    .groupBy(assets.assetClass)

  return rows
    .filter((r) => r.total && parseFloat(r.total) > 0)
    .map((r) => ({
      name: CLASS_LABELS[r.assetClass] ?? r.assetClass,
      value: parseFloat(r.total!),
      color: CLASS_COLORS[r.assetClass] ?? "#71717a",
    }))
    .sort((a, b) => b.value - a.value)
}

// ─── Recent activity (last 20 ledger events) ──────────────────────────────

export interface ActivityEvent {
  id: string
  action: string
  targetType: string
  targetId: string
  actorName: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export async function getRecentActivity(
  limit = 20
): Promise<ActivityEvent[]> {
  const session = await requireAdvisor()

  const rows = await db
    .select({
      id: ledgerEvents.id,
      action: ledgerEvents.action,
      targetType: ledgerEvents.targetType,
      targetId: ledgerEvents.targetId,
      actorName: users.fullName,
      payload: ledgerEvents.payload,
      createdAt: ledgerEvents.createdAt,
    })
    .from(ledgerEvents)
    .leftJoin(users, eq(ledgerEvents.actorUserId, users.id))
    .where(eq(ledgerEvents.orgId, session.orgId!))
    .orderBy(desc(ledgerEvents.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    actorName: r.actorName ?? null,
    payload: r.payload as Record<string, unknown> | null,
    createdAt: (r.createdAt as Date).toISOString(),
  }))
}

