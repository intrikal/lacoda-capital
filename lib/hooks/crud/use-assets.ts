"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getAssets } from "@/lib/services/assets.service"
import type { Asset } from "@/lib/mock/types"

function generateId(): string {
  return `ast-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateAssetInput = Omit<Asset, "id">

export function useAssets() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<Asset>(getAssets)

  const addAsset = useCallback(
    (input: CreateAssetInput): Asset => {
      const newAsset: Asset = {
        ...input,
        id: generateId(),
      }
      add(newAsset)
      return newAsset
    },
    [add]
  )

  const stats = useMemo(() => {
    const totalValue = data.reduce((sum, a) => sum + a.value, 0)
    const activeAssets = data.filter((a) => a.status === "active")
    const avgChange =
      data.length > 0
        ? data.reduce((sum, a) => sum + ((a.value - a.previousValue) / a.previousValue) * 100, 0) / data.length
        : 0
    return {
      total: data.length,
      active: activeAssets.length,
      totalValue,
      avgChange,
      avgRiskScore: data.length > 0 ? data.reduce((s, a) => s + a.riskScore, 0) / data.length : 0,
    }
  }, [data])

  return {
    assets: data,
    isLoading,
    addAsset,
    updateAsset: update,
    deleteAsset: remove,
    getAssetById: getById,
    stats,
  }
}
