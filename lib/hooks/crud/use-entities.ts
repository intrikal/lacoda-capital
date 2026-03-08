"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_ENTITIES,
  CREATE_ENTITY,
  UPDATE_ENTITY,
  DELETE_ENTITY,
} from "@/lib/graphql/operations/entity"
import type { CreateEntityInput, UpdateEntityInput } from "@/lib/validations/entity.schema"

interface EntityRecord {
  id: string
  clientId: string
  name: string
  entityType: string
  jurisdiction: string | null
  formationDate: string | null
  taxId: string | null
  assetCount: number
  totalValue: number
  createdAt: string
  updatedAt: string
}

interface GetEntitiesData {
  entities: { items: EntityRecord[]; totalCount: number; page: number; limit: number }
}

export function useEntities(params?: { search?: string; clientId?: string; entityType?: string }) {
  const variables: Record<string, unknown> = {}
  if (params?.search) variables.search = params.search
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.entityType && params.entityType !== "all") variables.entityType = params.entityType

  const { data, loading, error } = useQuery<GetEntitiesData>(GET_ENTITIES, { variables })

  const entities = data?.entities?.items ?? []

  const stats = useMemo(() => {
    const totalValue = entities.reduce(
      (sum, e) => sum + (e.totalValue ?? 0),
      0
    )
    return {
      total: entities.length,
      active: entities.length,
      totalValue,
      byType: {
        llc: entities.filter((e) => e.entityType === "llc").length,
        trust: entities.filter((e) => e.entityType === "trust").length,
        corporation: entities.filter((e) => e.entityType === "corporation").length,
        partnership: entities.filter((e) => e.entityType === "partnership").length,
        personal: entities.filter((e) => e.entityType === "personal").length,
        foundation: entities.filter((e) => e.entityType === "foundation").length,
      },
    }
  }, [entities])

  return {
    entities,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

export function useCreateEntity() {
  const [createEntity, { loading }] = useMutation(CREATE_ENTITY, {
    refetchQueries: [{ query: GET_ENTITIES }],
  })

  const mutate = useCallback(
    (input: CreateEntityInput) => {
      createEntity({ variables: { input } })
    },
    [createEntity]
  )

  return { mutate, isPending: loading }
}

export function useUpdateEntity() {
  const [updateEntity, { loading }] = useMutation(UPDATE_ENTITY, {
    refetchQueries: [{ query: GET_ENTITIES }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateEntityInput }) => {
      updateEntity({ variables: { id, input } })
    },
    [updateEntity]
  )

  return { mutate, isPending: loading }
}

export function useDeleteEntity() {
  const [deleteEntity, { loading }] = useMutation(DELETE_ENTITY, {
    refetchQueries: [{ query: GET_ENTITIES }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteEntity({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteEntity]
  )

  return { mutate, isPending: loading }
}
