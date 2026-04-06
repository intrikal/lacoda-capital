"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/actions/client.actions"
import type { ClientRecord } from "@/lib/types"
import type {
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/validations/client.schema"

export function useClients(params?: { search?: string; status?: string }) {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getClients({
        search: params?.search,
        status: params?.status !== "all" ? params?.status : undefined,
      })
      setClients(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
   
  }, [params?.search, params?.status])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const totalAUM = clients.reduce((sum, c) => sum + (c.totalAUM ?? 0), 0)
    return {
      total: clients.length,
      active: clients.filter((c) => c.clientStatus === "active").length,
      prospects: clients.filter((c) => c.clientStatus === "prospect").length,
      inactive: clients.filter((c) => c.clientStatus === "inactive").length,
      totalAUM,
      avgAUM: clients.length > 0 ? totalAUM / clients.length : 0,
    }
  }, [clients])

  return {
    clients,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateClient() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateClientInput, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await createClient(input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateClient() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateClientInput }, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await updateClient(id, input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteClient() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteClient(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
