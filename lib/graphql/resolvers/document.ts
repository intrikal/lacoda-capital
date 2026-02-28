import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { documents, clients, entities, assets } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validations/document.schema"
import type { GraphQLContext } from "./context"

export const documentResolvers = {
  Query: {
    documents: async (
      _: unknown,
      args: { clientId?: string; entityId?: string; assetId?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(documents.orgId, session.orgId)]
      if (args.clientId) conditions.push(eq(documents.clientId, args.clientId))
      if (args.entityId) conditions.push(eq(documents.entityId, args.entityId))
      if (args.assetId) conditions.push(eq(documents.assetId, args.assetId))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(documents).where(where).orderBy(documents.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(documents).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    document: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.documents.findFirst({
        where: and(eq(documents.id, args.id), eq(documents.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createDocument: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createDocumentSchema.parse(args.input)

      const [created] = await db
        .insert(documents)
        .values({
          ...parsed,
          orgId: session.orgId,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
          tags: parsed.tags ?? [],
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    updateDocument: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.documents.findFirst({
        where: and(eq(documents.id, args.id), eq(documents.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateDocumentSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      if (parsed.name !== undefined) setData.name = parsed.name
      if (parsed.description !== undefined) setData.description = parsed.description ?? null
      if (parsed.status !== undefined) setData.status = parsed.status
      if (parsed.expiresAt !== undefined) setData.expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null
      if (parsed.tags !== undefined) setData.tags = parsed.tags
      if (parsed.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...parsed.metadata }

      const [updated] = await db.update(documents).set(setData).where(eq(documents.id, args.id)).returning()
      return updated
    },

    deleteDocument: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.documents.findFirst({
        where: and(eq(documents.id, args.id), eq(documents.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(documents).where(eq(documents.id, args.id))
      return true
    },
  },

  Document: {
    tags: (parent: { tags: unknown }) => (parent.tags as string[]) ?? [],
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
    entity: async (parent: { entityId: string | null }) => {
      if (!parent.entityId) return null
      return db.query.entities.findFirst({ where: eq(entities.id, parent.entityId) })
    },
    asset: async (parent: { assetId: string | null }) => {
      if (!parent.assetId) return null
      return db.query.assets.findFirst({ where: eq(assets.id, parent.assetId) })
    },
  },
}
