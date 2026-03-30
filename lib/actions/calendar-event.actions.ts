"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count, gte, lte } from "drizzle-orm"
import { db } from "@/app/db"
import { calendarEvents } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createCalendarEventSchema, updateCalendarEventSchema } from "@/lib/validations/calendar-event.schema"
import type { CalendarEventRecord, PaginatedResult } from "@/lib/types"

export async function getCalendarEvents(params?: {
  clientId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<CalendarEventRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 100, 200)
  const offset = (page - 1) * limit

  const conditions = [eq(calendarEvents.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(calendarEvents.clientId, params.clientId))
  if (params?.type) conditions.push(eq(calendarEvents.type, params.type as "meeting" | "payment" | "dividend" | "deadline" | "document" | "call"))
  if (params?.dateFrom) conditions.push(gte(calendarEvents.date, params.dateFrom))
  if (params?.dateTo) conditions.push(lte(calendarEvents.date, params.dateTo))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(calendarEvents).where(where).orderBy(calendarEvents.date).limit(limit).offset(offset),
    db.select({ total: count() }).from(calendarEvents).where(where),
  ])

  return { items: items as unknown as CalendarEventRecord[], totalCount: total, page, limit }
}

export async function getCalendarEvent(id: string): Promise<CalendarEventRecord | null> {
  const session = await requireAuth()
  const row = await db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, session.orgId!)),
  })
  return (row as unknown as CalendarEventRecord) ?? null
}

export async function createCalendarEvent(input: unknown): Promise<CalendarEventRecord> {
  const session = await requireRole("assistant")
  const parsed = createCalendarEventSchema.parse(input)

  const [created] = await db
    .insert(calendarEvents)
    .values({
      ...parsed,
      orgId: session.orgId!,
      clientId: parsed.clientId ?? null,
      time: parsed.time ?? null,
      endTime: parsed.endTime ?? null,
      location: parsed.location ?? null,
      amount: parsed.amount ?? null,
      description: parsed.description ?? null,
      attendees: parsed.attendees ?? [],
      reminder: parsed.reminder ?? true,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  captureServerEvent(session.userId, "calendar_event.created", { event_type: parsed.type })

  return created as unknown as CalendarEventRecord
}

export async function updateCalendarEvent(id: string, input: unknown): Promise<CalendarEventRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateCalendarEventSchema.parse(input)
  const setData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      if (key === "metadata") {
        setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
      } else {
        setData[key] = value ?? null
      }
    }
  }

  const [updated] = await db.update(calendarEvents).set(setData).where(eq(calendarEvents.id, id)).returning()
  return updated as unknown as CalendarEventRecord
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const session = await requireRole("assistant")
  const existing = await db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id))
  return true
}
