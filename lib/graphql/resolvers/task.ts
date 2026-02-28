import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { tasks, clients, entities, assets, documents, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/task.schema"
import type { GraphQLContext } from "./context"

export const taskResolvers = {
  Query: {
    tasks: async (
      _: unknown,
      args: { clientId?: string; assignedTo?: string; status?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(tasks.orgId, session.orgId)]
      if (args.clientId) conditions.push(eq(tasks.clientId, args.clientId))
      if (args.assignedTo) conditions.push(eq(tasks.assignedTo, args.assignedTo))
      if (args.status) conditions.push(eq(tasks.status, args.status as "pending" | "in_progress" | "completed" | "cancelled"))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(tasks).where(where).orderBy(tasks.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(tasks).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    task: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.tasks.findFirst({
        where: and(eq(tasks.id, args.id), eq(tasks.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createTask: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createTaskSchema.parse(args.input)

      const [created] = await db
        .insert(tasks)
        .values({
          ...parsed,
          orgId: session.orgId,
          createdBy: session.memberId,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    updateTask: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, args.id), eq(tasks.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateTaskSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          if (key === "dueDate" || key === "completedAt") {
            setData[key] = value ? new Date(value as string) : null
          } else if (key === "metadata") {
            setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
          } else {
            setData[key] = value ?? null
          }
        }
      }

      // Auto-set completedBy when completing
      if (parsed.status === "completed" && !existing.completedAt) {
        setData.completedAt = new Date()
        setData.completedBy = session.memberId
      }

      const [updated] = await db.update(tasks).set(setData).where(eq(tasks.id, args.id)).returning()
      return updated
    },

    deleteTask: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, args.id), eq(tasks.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(tasks).where(eq(tasks.id, args.id))
      return true
    },
  },

  Task: {
    assignedToUser: async (parent: { assignedTo: string | null }) => {
      if (!parent.assignedTo) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.assignedTo) })
    },
    createdByUser: async (parent: { createdBy: string | null }) => {
      if (!parent.createdBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.createdBy) })
    },
    completedByUser: async (parent: { completedBy: string | null }) => {
      if (!parent.completedBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.completedBy) })
    },
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
    document: async (parent: { documentId: string | null }) => {
      if (!parent.documentId) return null
      return db.query.documents.findFirst({ where: eq(documents.id, parent.documentId) })
    },
  },
}
