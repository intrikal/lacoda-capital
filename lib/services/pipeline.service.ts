"use server"

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { deals } from "@/app/db/schema"
import { eq, desc, isNull } from "drizzle-orm"
import type { Deal, PipelineStage, PipelineStageId } from "@/lib/types/mock"

/** Static pipeline stage configuration (no DB table for this). */
const pipelineStages: PipelineStage[] = [
  { id: "prospecting", name: "Prospecting", color: "#6366f1", description: "Initial opportunities" },
  { id: "due_diligence", name: "Due Diligence", color: "#8b5cf6", description: "Research & analysis" },
  { id: "negotiation", name: "Negotiation", color: "#f59e0b", description: "Terms under discussion" },
  { id: "closed", name: "Closed", color: "#0FBFBF", description: "Awaiting deployment" },
  { id: "active", name: "Active", color: "#10b981", description: "Currently invested" },
  { id: "exit_planning", name: "Exit Planning", color: "#f97316", description: "Preparing for exit" },
]

/** Map a DB deals row to the Deal mock type shape. */
function toDeal(row: typeof deals.$inferSelect): Deal {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage as PipelineStageId,
    type: row.type,
    potentialValue: row.potentialValue,
    probability: row.probability,
    assignee: row.assigneeName ?? "",
    dueDate: row.dueDate,
    lastActivity: row.lastActivity ?? "",
    notes: row.notes ?? "",
  }
}

export async function getPipelineStages(): Promise<PipelineStage[]> {
  return pipelineStages
}

export async function getDeals(): Promise<Deal[]> {
  const rows = await db
    .select()
    .from(deals)
    .where(isNull(deals.deletedAt))
    .orderBy(desc(deals.updatedAt))
  return rows.map(toDeal)
}

export async function getDealById(id: string): Promise<Deal | undefined> {
  const rows = await db.select().from(deals).where(eq(deals.id, id))
  return rows[0] ? toDeal(rows[0]) : undefined
}

export async function getDealsByStage(stage: PipelineStageId): Promise<Deal[]> {
  const rows = await db.select().from(deals).where(eq(deals.stage, stage))
  return rows.map(toDeal)
}

export async function getPipelineSummary() {
  const all = await getDeals()
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
