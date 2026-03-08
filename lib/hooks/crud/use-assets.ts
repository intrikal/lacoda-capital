"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_ASSETS,
  CREATE_ASSET,
  UPDATE_ASSET,
  DELETE_ASSET,
} from "@/lib/graphql/operations/asset"
import type { CreateAssetInput, UpdateAssetInput } from "@/lib/validations/asset.schema"

interface AssetRecord {
  id: string
  entityId: string
  name: string
  description: string | null
  assetClass: string
  status: string
  acquisitionDate: string | null
  acquisitionCost: number | null
  currency: string
  currentValue: number | null
  valuedAt: string | null
  externalId: string | null
  createdAt: string
  updatedAt: string
}

interface GetAssetsData {
  assets: { items: AssetRecord[]; totalCount: number; page: number; limit: number }
}

export function useAssets(params?: {
  search?: string
  entityId?: string
  assetClass?: string
  status?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.search) variables.search = params.search
  if (params?.entityId) variables.entityId = params.entityId
  if (params?.assetClass && params.assetClass !== "all") variables.assetClass = params.assetClass
  if (params?.status && params.status !== "all") variables.status = params.status

  const { data, loading, error } = useQuery<GetAssetsData>(GET_ASSETS, { variables })

  const assets = data?.assets?.items ?? []

  const stats = useMemo(() => {
    const totalValue = assets.reduce(
      (sum, a) => sum + (a.currentValue ?? 0),
      0
    )
    const activeAssets = assets.filter((a) => a.status === "active")
    return {
      total: assets.length,
      active: activeAssets.length,
      totalValue,
    }
  }, [assets])

  return {
    assets,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

export function useCreateAsset() {
  const [createAsset, { loading }] = useMutation(CREATE_ASSET, {
    refetchQueries: [{ query: GET_ASSETS }],
  })

  const mutate = useCallback(
    (input: CreateAssetInput) => {
      createAsset({ variables: { input } })
    },
    [createAsset]
  )

  return { mutate, isPending: loading }
}

export function useUpdateAsset() {
  const [updateAsset, { loading }] = useMutation(UPDATE_ASSET, {
    refetchQueries: [{ query: GET_ASSETS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateAssetInput }) => {
      updateAsset({ variables: { id, input } })
    },
    [updateAsset]
  )

  return { mutate, isPending: loading }
}

export function useDeleteAsset() {
  const [deleteAsset, { loading }] = useMutation(DELETE_ASSET, {
    refetchQueries: [{ query: GET_ASSETS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteAsset({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteAsset]
  )

  return { mutate, isPending: loading }
}
