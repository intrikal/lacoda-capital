import { eq, and } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { integrations, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createIntegrationSchema, updateIntegrationSchema } from "@/lib/validations/integration.schema"
import type { GraphQLContext } from "./context"

export const integrationResolvers = {
  Query: {
    integrations: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.integrations.findMany({
        where: eq(integrations.orgId, session.orgId),
        orderBy: integrations.createdAt,
      })
    },

    integration: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.integrations.findFirst({
        where: and(eq(integrations.id, args.id), eq(integrations.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createIntegration: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const parsed = createIntegrationSchema.parse(args.input)

      const [created] = await db
        .insert(integrations)
        .values({
          ...parsed,
          orgId: session.orgId,
          connectedBy: session.memberId,
          connectedAt: new Date(),
          settings: parsed.settings ?? {},
        })
        .returning()

      return created
    },

    updateIntegration: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.integrations.findFirst({
        where: and(eq(integrations.id, args.id), eq(integrations.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateIntegrationSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          if (key === "settings") {
            setData[key] = { ...(existing.settings as object ?? {}), ...(value as object) }
          } else {
            setData[key] = value ?? null
          }
        }
      }

      const [updated] = await db.update(integrations).set(setData).where(eq(integrations.id, args.id)).returning()
      return updated
    },

    deleteIntegration: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.integrations.findFirst({
        where: and(eq(integrations.id, args.id), eq(integrations.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(integrations).where(eq(integrations.id, args.id))
      return true
    },
  },

  Integration: {
    connectedByUser: async (parent: { connectedBy: string | null }) => {
      if (!parent.connectedBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.connectedBy) })
    },
  },
}
