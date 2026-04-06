"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { tasks } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/task.schema"
import type { TaskRecord, PaginatedResult } from "@/lib/types"

export async function getTasks(params?: {
  clientId?: string
  assignedTo?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<TaskRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(tasks.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(tasks.clientId, params.clientId))
  if (params?.assignedTo) conditions.push(eq(tasks.assignedTo, params.assignedTo))
  if (params?.status) conditions.push(eq(tasks.status, params.status as "pending" | "in_progress" | "completed" | "cancelled"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(tasks).where(where).orderBy(tasks.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(tasks).where(where),
  ])

  return { items: items as unknown as TaskRecord[], totalCount: total, page, limit }
}

export async function getTask(id: string): Promise<TaskRecord | null> {
  const session = await requireAuth()
  const row = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.orgId, session.orgId!)),
  })
  return (row as unknown as TaskRecord) ?? null
}

export async function createTask(input: unknown): Promise<TaskRecord> {
  const session = await requireRole("assistant")
  const parsed = createTaskSchema.parse(input)

  const [created] = await db
    .insert(tasks)
    .values({
      ...parsed,
      orgId: session.orgId!,
      createdBy: session.memberId!,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  captureServerEvent(session.userId, "task.created")

  return created as unknown as TaskRecord
}

export async function updateTask(id: string, input: unknown): Promise<TaskRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateTaskSchema.parse(input)
  const setData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      if (key === "dueDate" || key === "completedAt") {
        setData[key] = value ? new Date(value as string) : null
      } else if (key === "metadata") {
        setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
      } else {
        setData[key] = value ?? null
      }
    }
  }

  const isNowCompleted = parsed.status === "completed" && !existing.completedAt
  if (isNowCompleted) {
    setData.completedAt = new Date()
    setData.completedBy = session.memberId!
  }

  const [updated] = await db.update(tasks).set(setData).where(eq(tasks.id, id)).returning()

  if (isNowCompleted) captureServerEvent(session.userId, "task.completed")

  return updated as unknown as TaskRecord
}

export async function deleteTask(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(tasks).where(eq(tasks.id, id))
  return true
}
