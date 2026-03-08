import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { ledgerEvents, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createLedgerEventSchema } from "@/lib/validations/ledger-event.schema"
import type { GraphQLContext } from "./context"

export const ledgerEventResolvers = {
  Query: {
    ledgerEvents: async (
      _: unknown,
      args: { targetType?: string; targetId?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(ledgerEvents.orgId, session.orgId)]
      if (args.targetType) {
        conditions.push(eq(ledgerEvents.targetType, args.targetType as "org" | "user" | "client" | "entity" | "asset" | "document" | "task" | "report"))
      }
      if (args.targetId) conditions.push(eq(ledgerEvents.targetId, args.targetId))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(ledgerEvents).where(where).orderBy(ledgerEvents.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(ledgerEvents).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },
  },

  Mutation: {
    createLedgerEvent: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createLedgerEventSchema.parse(args.input)

      const [created] = await db
        .insert(ledgerEvents)
        .values({
          ...parsed,
          orgId: session.orgId,
          actorUserId: session.memberId,
          payload: parsed.payload ?? {},
        })
        .returning()

      return created
    },
  },

  LedgerEvent: {
    actorUser: async (parent: { actorUserId: string | null }) => {
      if (!parent.actorUserId) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.actorUserId) })
    },
  },
}
