/**
 * React hooks for insurance policy CRUD operations.
 * Connects the insurance page to the GraphQL API via Apollo Client.
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_INSURANCE_POLICIES,
  CREATE_INSURANCE_POLICY,
  UPDATE_INSURANCE_POLICY,
  DELETE_INSURANCE_POLICY,
} from "@/lib/graphql/operations/insurance-policy"
import type {
  CreateInsurancePolicyInput,
  UpdateInsurancePolicyInput,
} from "@/lib/validations/insurance-policy.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface InsurancePolicyRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  policyType:
    | "home"
    | "auto"
    | "life"
    | "umbrella"
    | "liability"
    | "health"
    | "business"
    | "property"
  status: "active" | "expiring" | "expired" | "pending"
  provider: string
  policyNumber: string
  coverageAmount: number
  deductible: number
  premium: number
  premiumFrequency: "monthly" | "quarterly" | "annual"
  effectiveDate: string
  expirationDate: string
  coveredAssets: string[] | null
  beneficiaries: string[] | null
  agent: { name: string; phone: string; email: string } | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface InsurancePolicyStats {
  total: number
  totalCoverage: number
  totalAnnualPremium: number
  active: number
  expiring: number
  expired: number
}

interface GetInsurancePoliciesData {
  insurancePolicies: {
    items: InsurancePolicyRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Annualize a premium based on its frequency. */
function annualizePremium(premium: number, frequency: string): number {
  switch (frequency) {
    case "monthly":
      return premium * 12
    case "quarterly":
      return premium * 4
    default:
      return premium
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

export function useInsurancePolicies(params?: {
  clientId?: string
  status?: string
  policyType?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.status) variables.status = params.status
  if (params?.policyType) variables.policyType = params.policyType

  const { data, loading, error } = useQuery<GetInsurancePoliciesData>(
    GET_INSURANCE_POLICIES,
    { variables }
  )

  const policies = data?.insurancePolicies?.items ?? []

  const stats = useMemo<InsurancePolicyStats>(() => {
    return {
      total: policies.length,
      totalCoverage: policies.reduce((sum, p) => sum + p.coverageAmount, 0),
      totalAnnualPremium: policies.reduce(
        (sum, p) => sum + annualizePremium(p.premium, p.premiumFrequency),
        0
      ),
      active: policies.filter((p) => p.status === "active").length,
      expiring: policies.filter((p) => p.status === "expiring").length,
      expired: policies.filter((p) => p.status === "expired").length,
    }
  }, [policies])

  return {
    policies,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

export function useCreateInsurancePolicy() {
  const [createPolicy, { loading }] = useMutation(CREATE_INSURANCE_POLICY, {
    refetchQueries: [{ query: GET_INSURANCE_POLICIES }],
  })

  const mutate = useCallback(
    (input: CreateInsurancePolicyInput) => {
      return createPolicy({ variables: { input } })
    },
    [createPolicy]
  )

  return { mutate, isPending: loading }
}

export function useUpdateInsurancePolicy() {
  const [updatePolicy, { loading }] = useMutation(UPDATE_INSURANCE_POLICY, {
    refetchQueries: [{ query: GET_INSURANCE_POLICIES }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateInsurancePolicyInput }) => {
      return updatePolicy({ variables: { id, input } })
    },
    [updatePolicy]
  )

  return { mutate, isPending: loading }
}

export function useDeleteInsurancePolicy() {
  const [deletePolicy, { loading }] = useMutation(DELETE_INSURANCE_POLICY, {
    refetchQueries: [{ query: GET_INSURANCE_POLICIES }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deletePolicy({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deletePolicy]
  )

  return { mutate, isPending: loading }
}
