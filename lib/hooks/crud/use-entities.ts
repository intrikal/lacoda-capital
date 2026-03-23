"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getEntities,
  getEntitiesTree,
  createEntity,
  updateEntity,
  archiveEntity,
  deleteEntity,
} from "@/lib/actions/entity.actions"
import type { EntityRecord } from "@/lib/types"
import type { EntityTreeNode } from "@/lib/actions/entity.actions"
import type { CreateEntityInput, UpdateEntityInput } from "@/lib/validations/entity.schema"

export function useEntities(params?: { search?: string; clientId?: string; entityType?: string }) {
  const [entities, setEntities] = useState<EntityRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getEntities({ clientId: params?.clientId })
      setEntities(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.entityType])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const totalValue = entities.reduce((sum, e) => sum + (e.totalValue ?? 0), 0)
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
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useEntitiesTree(clientId?: string) {
  const [tree, setTree] = useState<EntityTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getEntitiesTree(clientId)
      setTree(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => { load() }, [load])

  // Flatten tree for stats
  const allEntities = useMemo(() => {
    const flat: EntityTreeNode[] = []
    function walk(nodes: EntityTreeNode[]) {
      for (const n of nodes) {
        flat.push(n)
        walk(n.children)
      }
    }
    walk(tree)
    return flat
  }, [tree])

  const stats = useMemo(() => {
    const totalValue = allEntities.reduce((sum, e) => sum + (e.totalValue ?? 0), 0)
    return {
      total: allEntities.length,
      active: allEntities.length,
      totalValue,
      byType: {
        llc: allEntities.filter((e) => e.entityType === "llc").length,
        trust: allEntities.filter((e) => e.entityType === "trust").length,
        corporation: allEntities.filter((e) => e.entityType === "corporation").length,
        partnership: allEntities.filter((e) => e.entityType === "partnership").length,
        personal: allEntities.filter((e) => e.entityType === "personal").length,
        foundation: allEntities.filter((e) => e.entityType === "foundation").length,
      },
    }
  }, [allEntities])

  return {
    tree,
    allEntities,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateEntity() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateEntityInput, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await createEntity(input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateEntity() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateEntityInput }, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await updateEntity(id, input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useArchiveEntity() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await archiveEntity(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteEntity() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteEntity(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
