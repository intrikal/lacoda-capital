"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getInsurancePolicies,
  createInsurancePolicy,
  updateInsurancePolicy,
  deleteInsurancePolicy,
} from "@/lib/actions/insurance-policy.actions"
import type { InsurancePolicyRecord } from "@/lib/types"
import type {
  CreateInsurancePolicyInput,
  UpdateInsurancePolicyInput,
} from "@/lib/validations/insurance-policy.schema"

export type { InsurancePolicyRecord }

export interface InsurancePolicyStats {
  total: number
  totalCoverage: number
  totalAnnualPremium: number
  active: number
  expiring: number
  expired: number
}

function annualizePremium(premium: number, frequency: string): number {
  switch (frequency) {
    case "monthly": return premium * 12
    case "quarterly": return premium * 4
    default: return premium
  }
}

export function useInsurancePolicies(params?: {
  clientId?: string
  status?: string
  policyType?: string
}) {
  const [policies, setPolicies] = useState<InsurancePolicyRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getInsurancePolicies(params)
      setPolicies(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.status, params?.policyType])

  useEffect(() => { load() }, [load])

  const stats = useMemo<InsurancePolicyStats>(() => ({
    total: policies.length,
    totalCoverage: policies.reduce((sum, p) => sum + p.coverageAmount, 0),
    totalAnnualPremium: policies.reduce((sum, p) => sum + annualizePremium(p.premium, p.premiumFrequency), 0),
    active: policies.filter((p) => p.status === "active").length,
    expiring: policies.filter((p) => p.status === "expiring").length,
    expired: policies.filter((p) => p.status === "expired").length,
  }), [policies])

  return {
    policies,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateInsurancePolicy() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateInsurancePolicyInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createInsurancePolicy(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateInsurancePolicy() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateInsurancePolicyInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateInsurancePolicy(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteInsurancePolicy() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteInsurancePolicy(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
