"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getClients } from "@/lib/services/clients.service"
import type { Client } from "@/lib/mock/types"

function generateId(): string {
  return `client-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateClientInput = Omit<Client, "id" | "assignedAssets" | "assignedDocuments" | "lastActivity">

export function useClients() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<Client>(getClients)

  const addClient = useCallback(
    (input: CreateClientInput): Client => {
      const newClient: Client = {
        ...input,
        id: generateId(),
        assignedAssets: [],
        assignedDocuments: [],
        lastActivity: new Date().toISOString().split("T")[0],
      }
      add(newClient)
      return newClient
    },
    [add]
  )

  const updateClient = useCallback(
    (id: string, patch: Partial<Client>) => {
      update(id, { ...patch, lastActivity: new Date().toISOString().split("T")[0] })
    },
    [update]
  )

  const stats = useMemo(() => {
    const active = data.filter((c) => c.status === "active")
    const totalAUM = data.reduce((sum, c) => sum + c.aum, 0)
    return {
      total: data.length,
      active: active.length,
      prospects: data.filter((c) => c.status === "prospect").length,
      inactive: data.filter((c) => c.status === "inactive").length,
      totalAUM,
      avgAUM: data.length > 0 ? totalAUM / data.length : 0,
    }
  }, [data])

  return {
    clients: data,
    isLoading,
    addClient,
    updateClient,
    deleteClient: remove,
    getClientById: getById,
    stats,
  }
}
