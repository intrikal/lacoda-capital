"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getTasks } from "@/lib/services/tasks.service"
import type { Task } from "@/lib/mock/types"

function generateId(): string {
  return `task-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateTaskInput = Omit<Task, "id">

export function useTasks() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<Task>(getTasks)

  const addTask = useCallback(
    (input: CreateTaskInput): Task => {
      const newTask: Task = {
        ...input,
        id: generateId(),
      }
      add(newTask)
      return newTask
    },
    [add]
  )

  const toggleTaskStatus = useCallback(
    (id: string) => {
      const task = data.find((t) => t.id === id)
      if (!task) return
      const next = task.status === "completed" ? "pending" : "completed"
      update(id, { status: next })
    },
    [data, update]
  )

  const stats = useMemo(() => ({
    total: data.length,
    pending: data.filter((t) => t.status === "pending").length,
    inProgress: data.filter((t) => t.status === "in_progress").length,
    completed: data.filter((t) => t.status === "completed").length,
    highPriority: data.filter((t) => t.priority === "high").length,
  }), [data])

  return {
    tasks: data,
    isLoading,
    addTask,
    updateTask: update,
    deleteTask: remove,
    getTaskById: getById,
    toggleTaskStatus,
    stats,
  }
}
