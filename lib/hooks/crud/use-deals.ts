"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getDeals } from "@/lib/services/pipeline.service"
import type { Deal, PipelineStageId } from "@/lib/mock/types"

function generateId(): string {
  return `deal-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateDealInput = Omit<Deal, "id" | "lastActivity">

export function useDeals() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<Deal>(getDeals)

  const addDeal = useCallback(
    (input: CreateDealInput): Deal => {
      const newDeal: Deal = {
        ...input,
        id: generateId(),
        lastActivity: "Just now",
      }
      add(newDeal)
      return newDeal
    },
    [add]
  )

  const moveDealToStage = useCallback(
    (dealId: string, stage: PipelineStageId) => {
      update(dealId, { stage, lastActivity: "Just now" })
    },
    [update]
  )

  const dealsByStage = useMemo(() => {
    return data.reduce(
      (acc, deal) => {
        if (!acc[deal.stage]) acc[deal.stage] = []
        acc[deal.stage].push(deal)
        return acc
      },
      {} as Record<PipelineStageId, Deal[]>
    )
  }, [data])

  return {
    deals: data,
    isLoading,
    addDeal,
    updateDeal: update,
    deleteDeal: remove,
    getDealById: getById,
    moveDealToStage,
    dealsByStage,
  }
}
