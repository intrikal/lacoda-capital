"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getComplianceControls,
  createComplianceControl,
  updateComplianceControl,
  deleteComplianceControl,
} from "@/lib/actions/compliance.actions"
import type { ComplianceControlRecord, ComplianceEvidenceRecord } from "@/lib/types"
import type {
  CreateComplianceControlInput,
  UpdateComplianceControlInput,
} from "@/lib/validations/compliance.schema"

export type { ComplianceControlRecord, ComplianceEvidenceRecord }

export type ControlComplianceStatus = "compliant" | "in_progress" | "needs_attention"

export function deriveControlStatus(evidence: ComplianceEvidenceRecord[]): ControlComplianceStatus {
  const now = new Date()
  const hasApproved = evidence.some(
    (e) => e.status === "approved" && (!e.validUntil || new Date(e.validUntil) > now)
  )
  if (hasApproved) return "compliant"
  const hasPending = evidence.some((e) => e.status === "pending")
  if (hasPending) return "in_progress"
  return "needs_attention"
}

export function useComplianceControls(params?: {
  category?: string
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
  }, [params?.category, params?.isActive])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const active = controls.filter((c) => c.isActive)
    const compliant = active.filter((c) => c.status === "compliant").length
    const inProgress = active.filter((c) => c.status === "in_progress").length
    const needsAttention = active.filter((c) => c.status === "needs_attention").length
    return {
      total: controls.length,
      active: active.length,
      compliant,
      inProgress,
      needsAttention,
      score: active.length > 0 ? Math.round((compliant / active.length) * 100) : 0,
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
