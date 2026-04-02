"use server"

import { eq, and, count, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { notifications } from "@/app/db/schema"
import { requireAuth } from "@/lib/auth"
import type { NotificationRecord, PaginatedResult } from "@/lib/types"
import { captureServerEvent } from "@/lib/analytics/server"

export async function getNotifications(params?: {
  unreadOnly?: boolean
  page?: number
  limit?: number
}): Promise<PaginatedResult<NotificationRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [
    eq(notifications.userId, session.memberId!),
    eq(notifications.orgId, session.orgId!),
  ]
  if (params?.unreadOnly) conditions.push(isNull(notifications.readAt))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(notifications.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(notifications).where(where),
  ])

  return { items: items as unknown as NotificationRecord[], totalCount: total, page, limit }
}

export async function markNotificationRead(id: string): Promise<NotificationRecord> {
  const session = await requireAuth()
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, id),
      eq(notifications.userId, session.memberId!),
      eq(notifications.orgId, session.orgId!),
    ),
  })
  if (!existing) throw new Error("Not found")

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, id))
    .returning()

  captureServerEvent(session.userId, "notification.marked_read")

  return updated as unknown as NotificationRecord
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await requireAuth()
  const [result] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.memberId!),
        eq(notifications.orgId, session.orgId!),
        isNull(notifications.readAt)
      )
    )
  return result?.value ?? 0
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const session = await requireAuth()
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, session.memberId!),
        eq(notifications.orgId, session.orgId!),
        isNull(notifications.readAt),
      )
    )
  captureServerEvent(session.userId, "notifications.marked_all_read")
  return true
}
