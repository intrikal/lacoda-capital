import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { documentRequests, clients, entities, assets, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createDocumentRequestSchema, updateDocumentRequestSchema } from "@/lib/validations/document-request.schema"
import type { GraphQLContext } from "./context"

export const documentRequestResolvers = {
  Query: {
    documentRequests: async (
      _: unknown,
      args: { clientId?: string; status?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(documentRequests.orgId, session.orgId)]
      if (args.clientId) conditions.push(eq(documentRequests.clientId, args.clientId))
      if (args.status) conditions.push(eq(documentRequests.status, args.status as "open" | "fulfilled" | "cancelled" | "overdue"))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(documentRequests).where(where).orderBy(documentRequests.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(documentRequests).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    documentRequest: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.documentRequests.findFirst({
        where: and(eq(documentRequests.id, args.id), eq(documentRequests.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createDocumentRequest: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createDocumentRequestSchema.parse(args.input)

      const [created] = await db
        .insert(documentRequests)
        .values({
          ...parsed,
          orgId: session.orgId,
          requestedBy: session.memberId,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          metadata: {},
        })
        .returning()

      return created
    },

    updateDocumentRequest: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.documentRequests.findFirst({
        where: and(eq(documentRequests.id, args.id), eq(documentRequests.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateDocumentRequestSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      if (parsed.title !== undefined) setData.title = parsed.title
      if (parsed.description !== undefined) setData.description = parsed.description ?? null
      if (parsed.documentType !== undefined) setData.documentType = parsed.documentType ?? null
      if (parsed.status !== undefined) {
        setData.status = parsed.status
        if (parsed.status === "fulfilled") setData.fulfilledAt = new Date()
      }
      if (parsed.priority !== undefined) setData.priority = parsed.priority
      if (parsed.dueDate !== undefined) setData.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null
      if (parsed.assignedTo !== undefined) setData.assignedTo = parsed.assignedTo ?? null

      const [updated] = await db.update(documentRequests).set(setData).where(eq(documentRequests.id, args.id)).returning()
      return updated
    },

    deleteDocumentRequest: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.documentRequests.findFirst({
        where: and(eq(documentRequests.id, args.id), eq(documentRequests.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(documentRequests).where(eq(documentRequests.id, args.id))
      return true
    },
  },

  DocumentRequest: {
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
    requestedByUser: async (parent: { requestedBy: string | null }) => {
      if (!parent.requestedBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.requestedBy) })
    },
    assignedToUser: async (parent: { assignedTo: string | null }) => {
      if (!parent.assignedTo) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.assignedTo) })
    },
  },
}
