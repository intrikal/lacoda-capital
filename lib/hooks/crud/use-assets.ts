"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getAssets,
  createAsset,
  updateAsset,
  archiveAsset,
  deleteAsset,
} from "@/lib/actions/asset.actions"
import type { AssetRecord } from "@/lib/types"
import type { CreateAssetInput, UpdateAssetInput } from "@/lib/validations/asset.schema"

export function useAssets(params?: {
  search?: string
  entityId?: string
  assetClass?: string
  status?: string
}) {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAssets({ entityId: params?.entityId })
      setAssets(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.entityId, params?.assetClass, params?.status])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)
    return {
      total: assets.length,
      active: assets.filter((a) => a.status === "active").length,
      totalValue,
    }
  }, [assets])

  return {
    assets,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateAsset() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateAssetInput, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await createAsset(input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateAsset() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateAssetInput }, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await updateAsset(id, input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useArchiveAsset() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await archiveAsset(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteAsset() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteAsset(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
