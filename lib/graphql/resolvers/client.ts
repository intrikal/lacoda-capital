import { eq, and, ilike, sql, count } from "drizzle-orm"
import { db } from "@/app/db"
import { clients, entities, assets } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createClientSchema, updateClientSchema } from "@/lib/validations/client.schema"
import type { GraphQLContext } from "./context"

export const clientResolvers = {
  Query: {
    clients: async (
      _: unknown,
      args: { page?: number; limit?: number; search?: string; status?: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(clients.orgId, session.orgId)]
      if (args.search) {
        conditions.push(ilike(clients.displayName, `%${args.search}%`))
      }
      if (args.status) {
        conditions.push(
          sql`(${clients.profile}->>'clientStatus') = ${args.status}`
        )
      }

      const where = and(...conditions)

      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(clients)
          .where(where)
          .orderBy(clients.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(clients).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    client: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      const row = await db.query.clients.findFirst({
        where: and(eq(clients.id, args.id), eq(clients.orgId, session.orgId)),
      })
      return row ?? null
    },
  },

  Mutation: {
    createClient: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createClientSchema.parse(args.input)

      const { clientType, clientStatus, ...rest } = parsed
      const [created] = await db
        .insert(clients)
        .values({
          ...rest,
          orgId: session.orgId,
          profile: { clientType, clientStatus },
        })
        .returning()

      return created
    },

    updateClient: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])

      const existing = await db.query.clients.findFirst({
        where: and(eq(clients.id, args.id), eq(clients.orgId, session.orgId)),
      })
      if (!existing) throw notFound()

      const parsed = updateClientSchema.parse(args.input)
      const { displayName, email, phone, clientType, clientStatus, ...rest } = parsed

      const existingProfile = (existing.profile ?? {}) as Record<string, unknown>
      const updatedProfile = {
        ...existingProfile,
        ...(clientType !== undefined && { clientType }),
        ...(clientStatus !== undefined && { clientStatus }),
      }

      const [updated] = await db
        .update(clients)
        .set({
          ...(displayName !== undefined && { displayName }),
          ...(email !== undefined && { email: email ?? null }),
          ...(phone !== undefined && { phone: phone ?? null }),
          ...("externalId" in rest && rest.externalId !== undefined && {
            externalId: rest.externalId as string ?? null,
          }),
          profile: updatedProfile,
        })
        .where(eq(clients.id, args.id))
        .returning()

      return updated
    },

    deleteClient: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])

      const existing = await db.query.clients.findFirst({
        where: and(eq(clients.id, args.id), eq(clients.orgId, session.orgId)),
      })
      if (!existing) throw notFound()

      await db.delete(clients).where(eq(clients.id, args.id))
      return true
    },
  },

  Client: {
    clientType: (parent: Record<string, unknown>) => {
      const profile = (parent.profile ?? {}) as Record<string, unknown>
      return (profile.clientType as string) ?? "individual"
    },
    clientStatus: (parent: Record<string, unknown>) => {
      const profile = (parent.profile ?? {}) as Record<string, unknown>
      return (profile.clientStatus as string) ?? "prospect"
    },
    entities: async (parent: { id: string }) => {
      return db.query.entities.findMany({
        where: eq(entities.clientId, parent.id),
      })
    },
    documents: async (parent: { id: string }) => {
      const { documents } = await import("@/app/db/schema")
      return db.query.documents.findMany({
        where: eq(documents.clientId, parent.id),
      })
    },
    documentRequests: async (parent: { id: string }) => {
      const { documentRequests } = await import("@/app/db/schema")
      return db.query.documentRequests.findMany({
        where: eq(documentRequests.clientId, parent.id),
      })
    },
    tasks: async (parent: { id: string }) => {
      const { tasks } = await import("@/app/db/schema")
      return db.query.tasks.findMany({
        where: eq(tasks.clientId, parent.id),
      })
    },
    assignments: async (parent: { id: string }) => {
      const { assignments } = await import("@/app/db/schema")
      return db.query.assignments.findMany({
        where: eq(assignments.clientId, parent.id),
      })
    },
    entityCount: async (parent: { id: string }) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(entities)
        .where(eq(entities.clientId, parent.id))
      return total
    },
    assetCount: async (parent: { id: string }) => {
      const result = await db
        .select({ total: count() })
        .from(assets)
        .innerJoin(entities, eq(assets.entityId, entities.id))
        .where(eq(entities.clientId, parent.id))
      return result[0]?.total ?? 0
    },
    totalAUM: async (parent: { id: string }) => {
      const result = await db
        .select({ total: sql<string>`COALESCE(SUM(${assets.currentValue}), 0)` })
        .from(assets)
        .innerJoin(entities, eq(assets.entityId, entities.id))
        .where(
          and(
            eq(entities.clientId, parent.id),
            eq(assets.status, "active")
          )
        )
      return parseFloat(result[0]?.total ?? "0")
    },
  },
}

function notFound() {
  const { GraphQLError } = require("graphql")
  return new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
}
