import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { reports, reportVersions, clients, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createReportSchema, updateReportSchema } from "@/lib/validations/report.schema"
import type { GraphQLContext } from "./context"

export const reportResolvers = {
  Query: {
    reports: async (
      _: unknown,
      args: { clientId?: string; reportType?: string; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(reports.orgId, session.orgId)]
      if (args.clientId) conditions.push(eq(reports.clientId, args.clientId))
      if (args.reportType) {
        conditions.push(eq(reports.reportType, args.reportType as "portfolio_summary" | "asset_allocation" | "performance" | "tax_summary" | "compliance" | "client_statement" | "custom"))
      }

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(reports).where(where).orderBy(reports.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(reports).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    report: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.reports.findFirst({
        where: and(eq(reports.id, args.id), eq(reports.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createReport: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createReportSchema.parse(args.input)

      const [created] = await db
        .insert(reports)
        .values({
          ...parsed,
          orgId: session.orgId,
          createdBy: session.memberId,
          parameters: parsed.parameters ?? {},
        })
        .returning()

      return created
    },

    updateReport: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.reports.findFirst({
        where: and(eq(reports.id, args.id), eq(reports.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateReportSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      if (parsed.name !== undefined) setData.name = parsed.name
      if (parsed.description !== undefined) setData.description = parsed.description ?? null
      if (parsed.status !== undefined) setData.status = parsed.status
      if (parsed.parameters !== undefined) setData.parameters = { ...(existing.parameters as object ?? {}), ...(parsed.parameters as object) }

      const [updated] = await db.update(reports).set(setData).where(eq(reports.id, args.id)).returning()
      return updated
    },

    deleteReport: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.reports.findFirst({
        where: and(eq(reports.id, args.id), eq(reports.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(reports).where(eq(reports.id, args.id))
      return true
    },
  },

  Report: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
    createdByUser: async (parent: { createdBy: string | null }) => {
      if (!parent.createdBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.createdBy) })
    },
    versions: async (parent: { id: string }) => {
      return db.query.reportVersions.findMany({
        where: eq(reportVersions.reportId, parent.id),
        orderBy: (v, { desc }) => [desc(v.versionNumber)],
      })
    },
  },

  ReportVersion: {
    sharedWith: (parent: { sharedWith: unknown }) => (parent.sharedWith as string[]) ?? [],
    report: async (parent: { reportId: string }) => {
      return db.query.reports.findFirst({ where: eq(reports.id, parent.reportId) })
    },
    generatedByUser: async (parent: { generatedBy: string | null }) => {
      if (!parent.generatedBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.generatedBy) })
    },
  },
}
