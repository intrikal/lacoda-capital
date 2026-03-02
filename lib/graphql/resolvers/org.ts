import { eq, count } from "drizzle-orm"
import { db } from "@/app/db"
import { orgs, orgMembers, clients, users } from "@/app/db/schema"
import { requireAuth } from "./auth"
import type { GraphQLContext } from "./context"

export const orgResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.orgMembers.findFirst({
        where: eq(orgMembers.id, session.memberId),
      })
    },

    org: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.orgs.findFirst({
        where: eq(orgs.id, session.orgId),
      })
    },

    orgMembers: async (
      _: unknown,
      args: { page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const where = eq(orgMembers.orgId, session.orgId)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(orgMembers).where(where).orderBy(orgMembers.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(orgMembers).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },
  },

  Org: {
    members: async (parent: { id: string }) => {
      return db.query.orgMembers.findMany({ where: eq(orgMembers.orgId, parent.id) })
    },
    clients: async (parent: { id: string }) => {
      return db.query.clients.findMany({ where: eq(clients.orgId, parent.id) })
    },
    integrations: async (parent: { id: string }) => {
      const { integrations } = await import("@/app/db/schema")
      return db.query.integrations.findMany({ where: eq(integrations.orgId, parent.id) })
    },
    clientCount: async (parent: { id: string }) => {
      const [{ total }] = await db.select({ total: count() }).from(clients).where(eq(clients.orgId, parent.id))
      return total
    },
    memberCount: async (parent: { id: string }) => {
      const [{ total }] = await db.select({ total: count() }).from(orgMembers).where(eq(orgMembers.orgId, parent.id))
      return total
    },
  },

  OrgMember: {
    org: async (parent: { orgId: string }) => {
      return db.query.orgs.findFirst({ where: eq(orgs.id, parent.orgId) })
    },
    user: async (parent: { userId: string }) => {
      return db.query.users.findFirst({ where: eq(users.id, parent.userId) })
    },
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
    assignmentsAsAssistant: async (parent: { id: string }) => {
      const { assignments } = await import("@/app/db/schema")
      return db.query.assignments.findMany({ where: eq(assignments.assistantMemberId, parent.id) })
    },
  },
}
