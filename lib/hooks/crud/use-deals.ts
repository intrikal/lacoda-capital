/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-deals.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Pipeline page to the GraphQL API.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Pipeline Page                                                     │
 *   │   └── useDeals()          → fetches deal list                     │
 *   │   └── useCreateDeal()     → creates a new deal                    │
 *   │   └── useUpdateDeal()     → updates a deal (including stage move) │
 *   │   └── useDeleteDeal()     → archives/deletes a deal               │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ dealResolvers → Drizzle ORM → PostgreSQL                          │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/pipeline/page.tsx
 */

"use client"

import { useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_DEALS,
  CREATE_DEAL,
  UPDATE_DEAL,
  DELETE_DEAL,
} from "@/lib/graphql/operations/deal"
import type { CreateDealInput, UpdateDealInput } from "@/lib/validations/deal.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** Deal stage values matching the DB enum. */
export type DealStage =
  | "prospecting"
  | "due_diligence"
  | "negotiation"
  | "closed"
  | "active"
  | "exit_planning"

/** Deal type values matching the DB enum. */
export type DealType =
  | "real_estate"
  | "private_equity"
  | "venture_capital"
  | "fixed_income"

/**
 * DealRecord — Shape of a deal returned by the GraphQL API.
 */
export interface DealRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  stage: DealStage
  type: DealType
  potentialValue: number
  probability: number
  assignedTo: string | null
  assigneeName: string | null
  dueDate: string | null
  notes: string | null
  lastActivity: string | null
  createdAt: string
  updatedAt: string
}

/** Apollo response shape for GET_DEALS. */
interface GetDealsData {
  deals: {
    items: DealRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useDeals — Fetches the list of deals for the current org.
 *
 * @param params — Optional filters: stage, type, clientId
 *
 * @returns
 *   deals     — Array of DealRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 */
export function useDeals(params?: {
  stage?: DealStage
  type?: DealType
  clientId?: string
}) {
  const variables: Record<string, unknown> = { limit: 100 }
  if (params?.stage) variables.stage = params.stage
  if (params?.type) variables.type = params.type
  if (params?.clientId) variables.clientId = params.clientId

  const { data, loading, error } = useQuery<GetDealsData>(GET_DEALS, {
    variables,
  })

  return {
    deals: data?.deals?.items ?? [],
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
  }
}

/**
 * useCreateDeal — Creates a new deal in the pipeline.
 */
export function useCreateDeal() {
  const [create, { loading }] = useMutation(CREATE_DEAL, {
    refetchQueries: [{ query: GET_DEALS }],
  })

  const mutate = useCallback(
    (input: CreateDealInput) => {
      return create({ variables: { input } })
    },
    [create]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateDeal — Updates an existing deal (fields, stage move, etc.).
 */
export function useUpdateDeal() {
  const [update, { loading }] = useMutation(UPDATE_DEAL, {
    refetchQueries: [{ query: GET_DEALS }],
  })

  const mutate = useCallback(
    (id: string, input: UpdateDealInput) => {
      return update({ variables: { id, input } })
    },
    [update]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteDeal — Removes a deal from the pipeline.
 */
export function useDeleteDeal() {
  const [remove, { loading }] = useMutation(DELETE_DEAL, {
    refetchQueries: [{ query: GET_DEALS }],
  })

  const mutate = useCallback(
    (id: string) => {
      return remove({ variables: { id } })
    },
    [remove]
  )

  return { mutate, isPending: loading }
}
