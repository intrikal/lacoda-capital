"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getComplianceControls,
  createComplianceControl,
  updateComplianceControl,
  deleteComplianceControl,
  createComplianceEvidence,
  deleteComplianceEvidence,
  getComplianceStats,
  getOrgMembersForPicker,
} from "@/lib/actions/compliance.actions"
import type { ComplianceControlRecord, ComplianceEvidenceRecord } from "@/lib/types"
import type {
  CreateComplianceControlInput,
  UpdateComplianceControlInput,
  CreateComplianceEvidenceInput,
} from "@/lib/validations/compliance.schema"

export type { ComplianceControlRecord, ComplianceEvidenceRecord }

export type ComplianceControlStatus = "not_started" | "in_progress" | "implemented" | "verified"

export function useComplianceControls(params?: {
  category?: string
  framework?: string
  isActive?: boolean
}) {
  const [controls, setControls] = useState<ComplianceControlRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getComplianceControls(params)
      setControls(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.category, params?.framework, params?.isActive])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const active = controls.filter((c) => c.isActive)
    const now = new Date()
    const verified = active.filter((c) => c.status === "verified").length
    const implemented = active.filter((c) => c.status === "implemented").length
    const inProgress = active.filter((c) => c.status === "in_progress").length
    const notStarted = active.filter((c) => c.status === "not_started").length
    const overdue = active.filter(
      (c) => c.dueDate && new Date(c.dueDate) < now && c.status !== "verified"
    ).length

    // Group by framework
    const byFramework: Record<string, { total: number; verified: number }> = {}
    for (const c of active) {
      const fw = c.framework ?? "Uncategorized"
      if (!byFramework[fw]) byFramework[fw] = { total: 0, verified: 0 }
      byFramework[fw].total++
      if (c.status === "verified") byFramework[fw].verified++
    }

    return {
      total: controls.length,
      active: active.length,
      verified,
      implemented,
      inProgress,
      notStarted,
      overdue,
      score: active.length > 0 ? Math.round((verified / active.length) * 100) : 0,
      byFramework,
    }
  }, [controls])

  return {
    controls,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateComplianceControl() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateComplianceControlInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createComplianceControl(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateComplianceControl() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateComplianceControlInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateComplianceControl(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteComplianceControl() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteComplianceControl(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useCreateComplianceEvidence() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateComplianceEvidenceInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createComplianceEvidence(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteComplianceEvidence() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteComplianceEvidence(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useComplianceStats() {
  const [stats, setStats] = useState<{
    total: number
    active: number
    verified: number
    overdue: number
    byFramework: Record<string, { total: number; verified: number }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getComplianceStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return { stats, isLoading }
}

export function useOrgMembers() {
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getOrgMembersForPicker()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return { members, isLoading }
}
