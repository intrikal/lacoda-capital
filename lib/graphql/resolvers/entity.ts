import { eq, and, count, sql } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { entities, clients, assets } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createEntitySchema, updateEntitySchema } from "@/lib/validations/entity.schema"
import type { GraphQLContext } from "./context"

export const entityResolvers = {
  Query: {
    entities: async (
      _: unknown,
      args: { clientId?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [
        sql`${entities.clientId} IN (
          SELECT id FROM clients WHERE org_id = ${session.orgId}
        )`,
      ]
      if (args.clientId) {
        conditions.push(eq(entities.clientId, args.clientId))
      }

      const where = and(...conditions)

      const [items, [{ total }]] = await Promise.all([
        db.select().from(entities).where(where).orderBy(entities.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(entities).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    entity: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      const row = await db.query.entities.findFirst({
        where: eq(entities.id, args.id),
        with: { client: true },
      })
      if (!row || (row.client as { orgId: string }).orgId !== session.orgId) return null
      return row
    },
  },

  Mutation: {
    createEntity: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createEntitySchema.parse(args.input)

      // Verify client ownership
      const client = await db.query.clients.findFirst({
        where: and(eq(clients.id, parsed.clientId), eq(clients.orgId, session.orgId)),
      })
      if (!client) throw new GraphQLError("Client not found", { extensions: { code: "NOT_FOUND" } })

      const [created] = await db
        .insert(entities)
        .values({
          ...parsed,
          formationDate: parsed.formationDate ? new Date(parsed.formationDate) : null,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    updateEntity: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.entities.findFirst({
        where: eq(entities.id, args.id),
        with: { client: true },
      })
      if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      }

      const parsed = updateEntitySchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      if (parsed.name !== undefined) setData.name = parsed.name
      if (parsed.entityType !== undefined) setData.entityType = parsed.entityType
      if (parsed.jurisdiction !== undefined) setData.jurisdiction = parsed.jurisdiction ?? null
      if (parsed.formationDate !== undefined) setData.formationDate = parsed.formationDate ? new Date(parsed.formationDate) : null
      if (parsed.taxId !== undefined) setData.taxId = parsed.taxId ?? null
      if (parsed.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...parsed.metadata }

      const [updated] = await db
        .update(entities)
        .set(setData)
        .where(eq(entities.id, args.id))
        .returning()

      return updated
    },

    deleteEntity: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.entities.findFirst({
        where: eq(entities.id, args.id),
        with: { client: true },
      })
      if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      }

      await db.delete(entities).where(eq(entities.id, args.id))
      return true
    },
  },

  Entity: {
    client: async (parent: { clientId: string }) => {
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
    assets: async (parent: { id: string }) => {
      return db.query.assets.findMany({ where: eq(assets.entityId, parent.id) })
    },
    documents: async (parent: { id: string }) => {
      const { documents } = await import("@/app/db/schema")
      return db.query.documents.findMany({ where: eq(documents.entityId, parent.id) })
    },
    documentRequests: async (parent: { id: string }) => {
      const { documentRequests } = await import("@/app/db/schema")
      return db.query.documentRequests.findMany({ where: eq(documentRequests.entityId, parent.id) })
    },
    tasks: async (parent: { id: string }) => {
      const { tasks } = await import("@/app/db/schema")
      return db.query.tasks.findMany({ where: eq(tasks.entityId, parent.id) })
    },
    assetCount: async (parent: { id: string }) => {
      const [{ total }] = await db.select({ total: count() }).from(assets).where(eq(assets.entityId, parent.id))
      return total
    },
    totalValue: async (parent: { id: string }) => {
      const result = await db
        .select({ total: sql<string>`COALESCE(SUM(${assets.currentValue}), 0)` })
        .from(assets)
        .where(and(eq(assets.entityId, parent.id), eq(assets.status, "active")))
      return parseFloat(result[0]?.total ?? "0")
    },
  },
}
