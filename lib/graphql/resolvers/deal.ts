/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/deal.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   GraphQL resolvers for the deals (pipeline) feature.
 *   Full CRUD with org-scoping and stage/type filtering.
 *
 * DATA FLOW:
 *   POST /api/graphql → dealResolvers → Drizzle ORM → PostgreSQL (deals table)
 */

import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { deals, clients, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createDealSchema, updateDealSchema } from "@/lib/validations/deal.schema"
import type { GraphQLContext } from "./context"

export const dealResolvers = {
  Query: {
    deals: async (
      _: unknown,
      args: { clientId?: string; stage?: string; type?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 100, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(deals.orgId, session.orgId)]
      if (args.clientId) conditions.push(eq(deals.clientId, args.clientId))
      if (args.stage) {
        conditions.push(eq(deals.stage, args.stage as "prospecting" | "due_diligence" | "negotiation" | "closed" | "active" | "exit_planning"))
      }
      if (args.type) {
        conditions.push(eq(deals.type, args.type as "real_estate" | "private_equity" | "venture_capital" | "fixed_income"))
      }

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(deals).where(where).orderBy(deals.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(deals).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    deal: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.deals.findFirst({
        where: and(eq(deals.id, args.id), eq(deals.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createDeal: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createDealSchema.parse(args.input)

      const [created] = await db
        .insert(deals)
        .values({
          ...parsed,
          orgId: session.orgId,
          lastActivity: "Just now",
        })
        .returning()

      return created
    },

    updateDeal: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.deals.findFirst({
        where: and(eq(deals.id, args.id), eq(deals.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateDealSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      if (parsed.name !== undefined) setData.name = parsed.name
      if (parsed.stage !== undefined) setData.stage = parsed.stage
      if (parsed.type !== undefined) setData.type = parsed.type
      if (parsed.potentialValue !== undefined) setData.potentialValue = parsed.potentialValue
      if (parsed.probability !== undefined) setData.probability = parsed.probability
      if (parsed.assigneeName !== undefined) setData.assigneeName = parsed.assigneeName
      if (parsed.dueDate !== undefined) setData.dueDate = parsed.dueDate
      if (parsed.notes !== undefined) setData.notes = parsed.notes
      if (parsed.lastActivity !== undefined) setData.lastActivity = parsed.lastActivity
      if (parsed.clientId !== undefined) setData.clientId = parsed.clientId

      const [updated] = await db.update(deals).set(setData).where(eq(deals.id, args.id)).returning()
      return updated
    },

    deleteDeal: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.deals.findFirst({
        where: and(eq(deals.id, args.id), eq(deals.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(deals).where(eq(deals.id, args.id))
      return true
    },
  },

  Deal: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
    assignee: async (parent: { assignedTo: string | null }) => {
      if (!parent.assignedTo) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.assignedTo) })
    },
  },
}
