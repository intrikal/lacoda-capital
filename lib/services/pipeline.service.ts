// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockDeals, pipelineStages } from "@/lib/mock/data"
import type { Deal, PipelineStage, PipelineStageId } from "@/lib/mock/types"

export async function getPipelineStages(): Promise<PipelineStage[]> {
  // REAL: return db.query.pipelineStages.findMany() or a static config table
  return pipelineStages
}

export async function getDeals(): Promise<Deal[]> {
  // REAL: return db.query.deals.findMany({ orderBy: desc(deals.updatedAt) })
  return mockDeals
}

export async function getDealById(id: string): Promise<Deal | undefined> {
  // REAL: return db.query.deals.findFirst({ where: eq(deals.id, id) })
  return mockDeals.find((d) => d.id === id)
}

export async function getDealsByStage(stage: PipelineStageId): Promise<Deal[]> {
  // REAL: return db.query.deals.findMany({ where: eq(deals.stage, stage) })
  return mockDeals.filter((d) => d.stage === stage)
}

export async function getPipelineSummary() {
  const all = mockDeals
  // REAL: use SQL aggregates
  return {
    totalDeals: all.length,
    totalValue: all.reduce((sum, d) => sum + d.potentialValue, 0),
    weightedValue: all.reduce((sum, d) => sum + (d.potentialValue * d.probability) / 100, 0),
    activeValue: all
      .filter((d) => d.stage === "active")
      .reduce((sum, d) => sum + d.potentialValue, 0),
    negotiationValue: all
      .filter((d) => d.stage === "negotiation")
      .reduce((sum, d) => sum + d.potentialValue, 0),
    negotiationCount: all.filter((d) => d.stage === "negotiation").length,
    activeCount: all.filter((d) => d.stage === "active").length,
  }
}
