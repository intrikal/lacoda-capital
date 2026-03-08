/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-goals.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Goals pages to the GraphQL API.
 *   Each hook wraps an Apollo Client operation and exposes a simple interface
 *   that page components consume.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Goals Page (app/(dashboard)/app/goals/page.tsx)                   │
 *   │   └── useGoals()          → fetches goals + aggregate stats       │
 *   │   └── useCreateGoal()     → creates a new goal                    │
 *   │   └── useUpdateGoal()     → edits goal fields or status           │
 *   │   └── useDeleteGoal()     → removes a goal                        │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ goalResolvers → Drizzle ORM → PostgreSQL (goals table)            │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * DATA MODEL:
 *   GoalRecord — the full goal shape returned by the API.
 *   GoalStats  — aggregate metrics computed client-side from the goals list.
 *
 * STATUS LIFECYCLE:
 *   on_track → ahead | behind | completed
 *
 *   Status is set EXPLICITLY by the advisor via the dropdown menu on each
 *   goal card. It is NOT auto-derived from amounts or dates. This gives
 *   advisors full narrative control.
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file previously used useCrudState + mock data (lib/services/goals.service.ts).
 *   It has been rewritten to use Apollo Client for real database persistence.
 *
 * DB SCHEMA:
 *   See: app/db/schema/goals.ts
 *   goals: id, orgId, clientId, name, category, status, priority,
 *     targetAmount, currentAmount, monthlyContribution, targetDate,
 *     notes, metadata, createdAt, updatedAt
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/goals/page.tsx  (advisor goals dashboard)
 *   - app/(client)/client/goals/page.tsx  (client portal goals view)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_GOALS,
  CREATE_GOAL,
  UPDATE_GOAL,
  DELETE_GOAL,
} from "@/lib/graphql/operations/goal"
import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "@/lib/validations/goal.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * GoalRecord — TypeScript interface for the shape of a goal returned by
 * the GraphQL API. Maps 1:1 to the GOAL_FIELDS fragment.
 *
 * Field notes:
 *   status   — on_track | ahead | behind | completed (set by advisor)
 *   category — drives icon and color in the UI
 *   priority — high | medium | low
 *   targetAmount / currentAmount / monthlyContribution — JS numbers
 *     (stored as float8 / doublePrecision in PostgreSQL)
 *   targetDate — ISO date string "YYYY-MM-DD"
 *   clientId — null for org-level goals; UUID for client-linked goals
 */
export interface GoalRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  category:
    | "retirement"
    | "education"
    | "realestate"
    | "emergency"
    | "travel"
    | "vehicle"
    | "investment"
    | "custom"
  status: "on_track" | "ahead" | "behind" | "completed"
  priority: "high" | "medium" | "low"
  targetAmount: number
  currentAmount: number
  monthlyContribution: number
  targetDate: string
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/**
 * GoalStats — Aggregate metrics computed client-side from the goals array.
 *
 * totalTargetAmount          — sum of all goal targetAmounts
 * totalCurrentAmount         — sum of all goal currentAmounts
 * overallProgress            — (totalCurrent / totalTarget) * 100, or 0
 * totalMonthlyContribution   — sum of all monthlyContribution values
 * onTrack   — goals with status "on_track" or "ahead"
 * behind    — goals with status "behind"
 * completed — goals with status "completed"
 */
export interface GoalStats {
  total: number
  totalTargetAmount: number
  totalCurrentAmount: number
  overallProgress: number
  totalMonthlyContribution: number
  onTrack: number
  behind: number
  completed: number
}

/** Shape of the raw Apollo useQuery response for GET_GOALS. */
interface GetGoalsData {
  goals: {
    items: GoalRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useGoals — Fetches the list of financial goals and computes aggregate stats.
 *
 * @param params — Optional filters passed to the GraphQL query.
 *   clientId — only goals linked to this client
 *   status   — filter by status ("on_track" | "ahead" | "behind" | "completed")
 *   category — filter by category ("retirement" | "education" | ...)
 *
 * @returns
 *   goals     — Array of GoalRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 *   stats     — Aggregate metrics: total, progress %, amounts, status counts
 */
export function useGoals(params?: {
  clientId?: string
  status?: string
  category?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.status) variables.status = params.status
  if (params?.category) variables.category = params.category

  const { data, loading, error } = useQuery<GetGoalsData>(GET_GOALS, {
    variables,
  })

  const goals = data?.goals?.items ?? []

  // Compute aggregate stats whenever the goals array changes.
  const stats = useMemo<GoalStats>(() => {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)
    const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0)

    return {
      total: goals.length,
      totalTargetAmount: totalTarget,
      totalCurrentAmount: totalCurrent,
      overallProgress:
        totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0,
      totalMonthlyContribution: goals.reduce(
        (sum, g) => sum + g.monthlyContribution,
        0
      ),
      onTrack: goals.filter(
        (g) => g.status === "on_track" || g.status === "ahead"
      ).length,
      behind: goals.filter((g) => g.status === "behind").length,
      completed: goals.filter((g) => g.status === "completed").length,
    }
  }, [goals])

  return {
    goals,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useCreateGoal — Mutation hook for creating a new financial goal.
 *
 * Requires role: admin | assistant (enforced server-side).
 *
 * The resolver auto-sets:
 *   - orgId  → from the authenticated session
 *   - status → "on_track" (DB default)
 *   - currentAmount / monthlyContribution → 0 if not provided
 */
export function useCreateGoal() {
  const [createGoal, { loading }] = useMutation(CREATE_GOAL, {
    refetchQueries: [{ query: GET_GOALS }],
  })

  const mutate = useCallback(
    (input: CreateGoalInput) => {
      return createGoal({ variables: { input } })
    },
    [createGoal]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateGoal — Mutation hook for editing a financial goal.
 *
 * Only the provided fields are updated (partial update pattern).
 * For metadata (jsonb), the resolver MERGES new values with existing ones.
 *
 * Requires role: admin | assistant (enforced server-side).
 */
export function useUpdateGoal() {
  const [updateGoal, { loading }] = useMutation(UPDATE_GOAL, {
    refetchQueries: [{ query: GET_GOALS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateGoalInput }) => {
      return updateGoal({ variables: { id, input } })
    },
    [updateGoal]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteGoal — Mutation hook for removing a financial goal.
 *
 * Requires role: admin only (enforced server-side).
 *
 * The optional onSuccess callback is called after the mutation resolves —
 * used to close the delete confirmation AlertDialog.
 */
export function useDeleteGoal() {
  const [deleteGoal, { loading }] = useMutation(DELETE_GOAL, {
    refetchQueries: [{ query: GET_GOALS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteGoal({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteGoal]
  )

  return { mutate, isPending: loading }
}
