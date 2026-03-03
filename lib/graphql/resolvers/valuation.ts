import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { valuations, assets, entities } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createValuationSchema } from "@/lib/validations/valuation.schema"
import type { GraphQLContext } from "./context"

export const valuationResolvers = {
  Query: {
    valuations: async (
      _: unknown,
      args: { assetId: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      // Verify asset belongs to this org
      const asset = await db.query.assets.findFirst({
        where: eq(assets.id, args.assetId),
        with: { entity: { with: { client: true } } },
      })
      if (!asset || (asset.entity as { client: { orgId: string } }).client.orgId !== session.orgId) {
        return { items: [], totalCount: 0, page, limit }
      }

      const where = eq(valuations.assetId, args.assetId)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(valuations).where(where).orderBy(valuations.asOfDate).limit(limit).offset(offset),
        db.select({ total: count() }).from(valuations).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },
  },

  Mutation: {
    createValuation: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createValuationSchema.parse(args.input)

      const asset = await db.query.assets.findFirst({
        where: eq(assets.id, parsed.assetId),
        with: { entity: { with: { client: true } } },
      })
      if (!asset || (asset.entity as { client: { orgId: string } }).client.orgId !== session.orgId) {
        throw new GraphQLError("Asset not found", { extensions: { code: "NOT_FOUND" } })
      }

      const [created] = await db
        .insert(valuations)
        .values({
          ...parsed,
          asOfDate: new Date(parsed.asOfDate),
          value: parsed.value.toString(),
        })
        .returning()

      // Update asset's currentValue and valuedAt
      await db
        .update(assets)
        .set({
          currentValue: parsed.value.toString(),
          valuedAt: new Date(parsed.asOfDate),
        })
        .where(eq(assets.id, parsed.assetId))

      return created
    },
  },

  Valuation: {
    value: (parent: { value: string }) => parseFloat(parent.value),
    asset: async (parent: { assetId: string }) => {
      return db.query.assets.findFirst({ where: eq(assets.id, parent.assetId) })
    },
  },
}
