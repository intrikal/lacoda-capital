"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getUsers } from "@/lib/services/users.service"
import type { User } from "@/lib/mock/types"

function generateId(): string {
  return `user-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateUserInput = Omit<User, "id" | "lastLogin" | "mfaEnabled" | "status">

export function useUsers() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<User>(getUsers)

  const addUser = useCallback(
    (input: CreateUserInput): User => {
      const newUser: User = {
        ...input,
        id: generateId(),
        lastLogin: "",
        mfaEnabled: false,
        status: "pending",
      }
      add(newUser)
      return newUser
    },
    [add]
  )

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((u) => u.status === "active").length,
    pending: data.filter((u) => u.status === "pending").length,
    inactive: data.filter((u) => u.status === "inactive").length,
  }), [data])

  return {
    users: data,
    isLoading,
    addUser,
    updateUser: update,
    deleteUser: remove,
    getUserById: getById,
    stats,
  }
}
