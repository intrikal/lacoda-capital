// ─────────────────────────────────────────────────────────────────────────────
// ASSETS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockAssets } from "@/lib/mock/data"
import type { Asset, AssetClass } from "@/lib/mock/types"

export async function getAssets(): Promise<Asset[]> {
  // REAL: return db.query.assets.findMany({ orderBy: desc(assets.value) })
  return mockAssets
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  // REAL: return db.query.assets.findFirst({ where: eq(assets.id, id) })
  return mockAssets.find((a) => a.id === id)
}

export async function getAssetsByClass(assetClass: AssetClass): Promise<Asset[]> {
  // REAL: return db.query.assets.findMany({ where: eq(assets.class, assetClass) })
  return mockAssets.filter((a) => a.class === assetClass)
}

export async function getAssetsByClient(clientId: string): Promise<Asset[]> {
  // REAL: return db.query.assets.findMany({ where: eq(assets.assignedTo, clientId) })
  return mockAssets.filter((a) => a.assignedTo === clientId)
}

export async function getAssetStats() {
  const all = mockAssets
  const active = all.filter((a) => a.status === "active")
  const totalValue = all.reduce((sum, a) => sum + a.value, 0)
  const avgChange =
    all.reduce((sum, a) => sum + ((a.value - a.previousValue) / a.previousValue) * 100, 0) /
    all.length
  const avgRisk = all.reduce((sum, a) => sum + a.riskScore, 0) / all.length
  // REAL: use SQL aggregates
  return {
    total: all.length,
    active: active.length,
    totalValue,
    avgChange,
    avgRisk,
    realEstateValue: all.filter((a) => a.class === "real_estate").reduce((s, a) => s + a.value, 0),
  }
}
