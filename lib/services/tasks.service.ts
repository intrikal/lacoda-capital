"use server"

// ─────────────────────────────────────────────────────────────────────────────
// TASKS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { tasks } from "@/app/db/schema"
import { eq, asc } from "drizzle-orm"
import type { Task } from "@/lib/types/mock"

/** Map a DB tasks row to the Task mock type shape. */
function toTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.dueDate?.toISOString() ?? "",
    assignedTo: row.assignedTo ?? "",
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    relatedEntity: row.clientId ?? row.entityId ?? row.assetId ?? undefined,
  }
}

export async function getTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.dueDate))
  return rows.map(toTask)
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id))
  return rows[0] ? toTask(rows[0]) : undefined
}

export async function getTasksByAssignee(assignee: string): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.assignedTo, assignee))
  return rows.map(toTask)
}

export async function getPendingTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.status, "pending"))
  return rows.map(toTask)
}

export async function getHighPriorityTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.priority, "high"))
  return rows.map(toTask)
}
