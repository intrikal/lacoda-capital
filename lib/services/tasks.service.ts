// ─────────────────────────────────────────────────────────────────────────────
// TASKS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockTasks } from "@/lib/mock/data"
import type { Task } from "@/lib/mock/types"

export async function getTasks(): Promise<Task[]> {
  // REAL: return db.query.tasks.findMany({ orderBy: asc(tasks.dueDate) })
  return mockTasks
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  // REAL: return db.query.tasks.findFirst({ where: eq(tasks.id, id) })
  return mockTasks.find((t) => t.id === id)
}

export async function getTasksByAssignee(assignee: string): Promise<Task[]> {
  // REAL: return db.query.tasks.findMany({ where: eq(tasks.assignedTo, assignee) })
  return mockTasks.filter((t) => t.assignedTo === assignee)
}

export async function getPendingTasks(): Promise<Task[]> {
  // REAL: return db.query.tasks.findMany({ where: eq(tasks.status, "pending") })
  return mockTasks.filter((t) => t.status === "pending")
}

export async function getHighPriorityTasks(): Promise<Task[]> {
  // REAL: return db.query.tasks.findMany({ where: eq(tasks.priority, "high") })
  return mockTasks.filter((t) => t.priority === "high")
}
