"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client"
import {
  GET_CLIENTS,
  CREATE_CLIENT,
  UPDATE_CLIENT,
  DELETE_CLIENT,
} from "@/lib/graphql/operations/client"
import type {
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/validations/client.schema"

/**
 * useClients — Fetches the list of clients and computes statistics.
 *
 * Preserves the same return API as the previous React Query implementation:
 *   { clients, isLoading, isError, error, stats }
 */
export function useClients(params?: { search?: string; status?: string }) {
  const variables: Record<string, unknown> = {}
  if (params?.search) variables.search = params.search
  if (params?.status && params.status !== "all") variables.status = params.status

  const { data, loading, error } = useQuery(GET_CLIENTS, {
    variables,
  })

  const clients = data?.clients?.items ?? []

  const stats = useMemo(() => {
    const totalAUM = clients.reduce(
      (sum: number, c: { totalAUM: number }) => sum + (c.totalAUM ?? 0),
      0
    )
    return {
      total: clients.length,
      active: clients.filter(
        (c: { clientStatus: string }) => c.clientStatus === "active"
      ).length,
      prospects: clients.filter(
        (c: { clientStatus: string }) => c.clientStatus === "prospect"
      ).length,
      inactive: clients.filter(
        (c: { clientStatus: string }) => c.clientStatus === "inactive"
      ).length,
      totalAUM,
      avgAUM: clients.length > 0 ? totalAUM / clients.length : 0,
    }
  }, [clients])

  return {
    clients,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useCreateClient — Hook for creating a new client.
 *
 * Returns: { mutate, isPending }
 * Usage: createMutation.mutate(data)
 */
export function useCreateClient() {
  const [createClient, { loading }] = useMutation(CREATE_CLIENT, {
    refetchQueries: [{ query: GET_CLIENTS }],
  })

  const mutate = useCallback(
    (input: CreateClientInput) => {
      createClient({ variables: { input } })
    },
    [createClient]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateClient — Hook for updating an existing client.
 *
 * Returns: { mutate, isPending }
 * Usage: updateMutation.mutate({ id, input })
 */
export function useUpdateClient() {
  const [updateClient, { loading }] = useMutation(UPDATE_CLIENT, {
    refetchQueries: [{ query: GET_CLIENTS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateClientInput }) => {
      updateClient({ variables: { id, input } })
    },
    [updateClient]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteClient — Hook for deleting a client.
 *
 * Returns: { mutate, isPending }
 * Usage: deleteMutation.mutate(id, { onSuccess })
 */
export function useDeleteClient() {
  const [deleteClient, { loading }] = useMutation(DELETE_CLIENT, {
    refetchQueries: [{ query: GET_CLIENTS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteClient({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteClient]
  )

  return { mutate, isPending: loading }
}
