/**
 * ============================================================================
 * FILE: /lib/hooks/crud/use-tasks.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Tasks page UI to the GraphQL API.
 *   Each hook wraps an Apollo Client operation and exposes a simple interface
 *   that page components consume.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ Tasks Page (app/(dashboard)/app/tasks/page.tsx)                 │
 *   │   └── useTasks()       → fetches list + computes stats         │
 *   │   └── useCreateTask()  → creates new task                      │
 *   │   └── useUpdateTask()  → edits task / marks complete           │
 *   │   └── useDeleteTask()  → removes a task                        │
 *   │         ↓                                                       │
 *   │ Apollo Client (useQuery / useMutation)                          │
 *   │         ↓                                                       │
 *   │ POST /api/graphql                                               │
 *   │         ↓                                                       │
 *   │ task resolvers → Drizzle ORM → PostgreSQL                       │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file originally used useCrudState + mock data (in-memory only).
 *   It was rewritten to use Apollo Client for real database persistence.
 *
 * AUTO-COMPLETION:
 *   When you update a task's status to "completed", the resolver automatically
 *   sets completedAt and completedBy. No client-side logic needed.
 *
 * DB SCHEMA:
 *   See: app/db/schema/tasks.ts
 *   Status: pending | in_progress | completed | cancelled
 *   Priority: low | medium | high | urgent
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/tasks/page.tsx (advisor tasks dashboard)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_TASKS,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
} from "@/lib/graphql/operations/task"
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "@/lib/validations/task.schema"

/**
 * TaskRecord — TypeScript interface for the shape of a task returned
 * by the GraphQL API. Maps 1:1 to the TASK_FIELDS fragment.
 *
 * Field notes:
 *   status      — Lifecycle: pending → in_progress → completed (or cancelled)
 *   priority    — Urgency: low | medium | high | urgent
 *   assignedTo  — UUID of the user responsible for this task (nullable)
 *   createdBy   — UUID of the org member who created the task
 *   completedBy — Auto-set by the resolver when status changes to "completed"
 *   completedAt — Auto-set timestamp when task is completed
 *   metadata    — JSONB for flexible data: checklist items, tags, recurrence, etc.
 *   clientId/entityId/assetId/documentId — Polymorphic links to related records
 */
export interface TaskRecord {
  id: string
  orgId: string
  title: string
  description: string | null
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate: string | null
  assignedTo: string | null
  createdBy: string | null
  clientId: string | null
  entityId: string | null
  assetId: string | null
  documentId: string | null
  completedAt: string | null
  completedBy: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/** Shape of the raw Apollo useQuery response for GET_TASKS. */
interface GetTasksData {
  tasks: {
    items: TaskRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

/**
 * useTasks — Fetches the list of tasks and computes status/priority counts.
 *
 * @param params — Optional filters passed to the GraphQL query.
 *   clientId   — Only tasks linked to this client
 *   assignedTo — Only tasks assigned to this user (UUID)
 *   status     — Only tasks with this status
 *
 * @returns
 *   tasks     — Array of TaskRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 *   stats     — { total, pending, inProgress, completed, highPriority } counts
 */
export function useTasks(params?: {
  clientId?: string
  assignedTo?: string
  status?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.assignedTo) variables.assignedTo = params.assignedTo
  if (params?.status) variables.status = params.status

  const { data, loading, error } = useQuery<GetTasksData>(GET_TASKS, {
    variables,
  })

  const tasks = data?.tasks?.items ?? []

  // Compute aggregate stats from the fetched list.
  const stats = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      highPriority: tasks.filter(
        (t) => t.priority === "high" || t.priority === "urgent"
      ).length,
    }),
    [tasks]
  )

  return {
    tasks,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useCreateTask — Mutation hook for creating a new task.
 *
 * The resolver auto-sets orgId, createdBy, and defaults status/priority.
 */
export function useCreateTask() {
  const [createTask, { loading }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  })

  const mutate = useCallback(
    (input: CreateTaskInput) => {
      return createTask({ variables: { input } })
    },
    [createTask]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateTask — Mutation hook for editing a task.
 *
 * AUTO-COMPLETION: When status is set to "completed", the resolver
 * automatically sets completedAt and completedBy from the session.
 */
export function useUpdateTask() {
  const [updateTask, { loading }] = useMutation(UPDATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateTaskInput }) => {
      return updateTask({ variables: { id, input } })
    },
    [updateTask]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteTask — Mutation hook for removing a task.
 *
 * Requires admin role (enforced server-side by the resolver).
 */
export function useDeleteTask() {
  const [deleteTask, { loading }] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteTask({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteTask]
  )

  return { mutate, isPending: loading }
}
