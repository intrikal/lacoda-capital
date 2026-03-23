"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  getOrgMembers,
  getCurrentMember,
  inviteOrgMember,
  updateOrgMemberRole,
  removeOrgMember,
  type OrgMemberRecord,
} from "@/lib/actions/org.actions"
import type { InviteOrgMemberInput, UpdateOrgMemberRoleInput } from "@/lib/validations/org.schema"

export type { OrgMemberRecord }
export type OrgMemberRole = "admin" | "assistant" | "client"

export interface OrgMemberUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export function useOrgMembers() {
  const [members, setMembers] = useState<OrgMemberRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getOrgMembers({ limit: 100 })
      setMembers(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return {
    members,
    isLoading,
    isError: !!error,
    error,
    refetch: load,
  }
}

export function useCurrentMember() {
  const [member, setMember] = useState<OrgMemberRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCurrentMember().then((m) => {
      setMember(m)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  return { member, isLoading }
}

export function useInviteOrgMember() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: InviteOrgMemberInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await inviteOrgMember(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateOrgMemberRole() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, input: UpdateOrgMemberRoleInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateOrgMemberRole(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useRemoveOrgMember() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await removeOrgMember(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
