import { eq, and, count, isNull } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { notifications, users } from "@/app/db/schema"
import { requireAuth } from "./auth"
import type { GraphQLContext } from "./context"

export const notificationResolvers = {
  Query: {
    notifications: async (
      _: unknown,
      args: { unreadOnly?: boolean; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [
        eq(notifications.userId, session.memberId),
        eq(notifications.orgId, session.orgId),
      ]
      if (args.unreadOnly) conditions.push(isNull(notifications.readAt))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(notifications).where(where).orderBy(notifications.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(notifications).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },
  },

  Mutation: {
    markNotificationRead: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      const existing = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.id, args.id),
          eq(notifications.userId, session.memberId),
          eq(notifications.orgId, session.orgId),
        ),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const [updated] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, args.id))
        .returning()

      return updated
    },

    markAllNotificationsRead: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, session.memberId),
            eq(notifications.orgId, session.orgId),
            isNull(notifications.readAt),
          )
        )
      return true
    },
  },

  Notification: {
    user: async (parent: { userId: string }) => {
      return db.query.users.findFirst({ where: eq(users.id, parent.userId) })
    },
  },
}
