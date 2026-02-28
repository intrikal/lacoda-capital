import { eq, and, count, sql } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { assets, entities, clients, valuations } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createAssetSchema, updateAssetSchema } from "@/lib/validations/asset.schema"
import type { GraphQLContext } from "./context"

export const assetResolvers = {
  Query: {
    assets: async (
      _: unknown,
      args: { entityId?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [
        sql`${assets.entityId} IN (
          SELECT e.id FROM entities e
          JOIN clients c ON e.client_id = c.id
          WHERE c.org_id = ${session.orgId}
        )`,
      ]
      if (args.entityId) conditions.push(eq(assets.entityId, args.entityId))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(assets).where(where).orderBy(assets.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(assets).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    asset: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      const row = await db.query.assets.findFirst({
        where: eq(assets.id, args.id),
        with: { entity: { with: { client: true } } },
      })
      if (!row) return null
      const client = (row.entity as { client: { orgId: string } }).client
      if (client.orgId !== session.orgId) return null
      return row
    },
  },

  Mutation: {
    createAsset: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createAssetSchema.parse(args.input)

      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, parsed.entityId),
        with: { client: true },
      })
      if (!entity || (entity.client as { orgId: string }).orgId !== session.orgId) {
        throw new GraphQLError("Entity not found", { extensions: { code: "NOT_FOUND" } })
      }

      const [created] = await db
        .insert(assets)
        .values({
          ...parsed,
          acquisitionDate: parsed.acquisitionDate ? new Date(parsed.acquisitionDate) : null,
          acquisitionCost: parsed.acquisitionCost?.toString() ?? null,
          currentValue: parsed.currentValue?.toString() ?? null,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    updateAsset: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.assets.findFirst({
        where: eq(assets.id, args.id),
        with: { entity: { with: { client: true } } },
      })
      if (!existing || ((existing.entity as { client: { orgId: string } }).client.orgId !== session.orgId)) {
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      }

      const parsed = updateAssetSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      if (parsed.name !== undefined) setData.name = parsed.name
      if (parsed.description !== undefined) setData.description = parsed.description ?? null
      if (parsed.assetClass !== undefined) setData.assetClass = parsed.assetClass
      if (parsed.status !== undefined) setData.status = parsed.status
      if (parsed.acquisitionDate !== undefined) setData.acquisitionDate = parsed.acquisitionDate ? new Date(parsed.acquisitionDate) : null
      if (parsed.acquisitionCost !== undefined) setData.acquisitionCost = parsed.acquisitionCost?.toString() ?? null
      if (parsed.currency !== undefined) setData.currency = parsed.currency
      if (parsed.currentValue !== undefined) setData.currentValue = parsed.currentValue?.toString() ?? null
      if (parsed.externalId !== undefined) setData.externalId = parsed.externalId ?? null
      if (parsed.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...parsed.metadata }

      const [updated] = await db.update(assets).set(setData).where(eq(assets.id, args.id)).returning()
      return updated
    },

    deleteAsset: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.assets.findFirst({
        where: eq(assets.id, args.id),
        with: { entity: { with: { client: true } } },
      })
      if (!existing || ((existing.entity as { client: { orgId: string } }).client.orgId !== session.orgId)) {
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      }
      await db.delete(assets).where(eq(assets.id, args.id))
      return true
    },
  },

  Asset: {
    entity: async (parent: { entityId: string }) => {
      return db.query.entities.findFirst({ where: eq(entities.id, parent.entityId) })
    },
    valuations: async (parent: { id: string }) => {
      return db.query.valuations.findMany({
        where: eq(valuations.assetId, parent.id),
        orderBy: (v, { desc }) => [desc(v.asOfDate)],
      })
    },
    documents: async (parent: { id: string }) => {
      const { documents } = await import("@/app/db/schema")
      return db.query.documents.findMany({ where: eq(documents.assetId, parent.id) })
    },
    tasks: async (parent: { id: string }) => {
      const { tasks } = await import("@/app/db/schema")
      return db.query.tasks.findMany({ where: eq(tasks.assetId, parent.id) })
    },
    currentValue: (parent: { currentValue: string | null }) => {
      return parent.currentValue ? parseFloat(parent.currentValue) : null
    },
    acquisitionCost: (parent: { acquisitionCost: string | null }) => {
      return parent.acquisitionCost ? parseFloat(parent.acquisitionCost) : null
    },
    latestValuation: async (parent: { id: string }) => {
      return db.query.valuations.findFirst({
        where: eq(valuations.assetId, parent.id),
        orderBy: (v, { desc }) => [desc(v.asOfDate)],
      })
    },
  },
}
