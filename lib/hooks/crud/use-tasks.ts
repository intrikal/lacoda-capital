"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/actions/task.actions"
import type { TaskRecord } from "@/lib/types"

export type { TaskRecord }
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "@/lib/validations/task.schema"

export function useTasks(params?: {
  clientId?: string
  assignedTo?: string
  status?: string
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getTasks(params)
      setTasks(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.assignedTo, params?.status])

  useEffect(() => { load() }, [load])

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
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateTask() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateTaskInput, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await createTask(input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateTask() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateTaskInput }, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await updateTask(id, input)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteTask() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteTask(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
