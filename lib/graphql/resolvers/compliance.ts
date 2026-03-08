import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { complianceControls, complianceEvidence, documents, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createComplianceControlSchema,
  updateComplianceControlSchema,
  createComplianceEvidenceSchema,
} from "@/lib/validations/compliance.schema"
import type { GraphQLContext } from "./context"

export const complianceResolvers = {
  Query: {
    complianceControls: async (
      _: unknown,
      args: { category?: string; isActive?: boolean; page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(complianceControls.orgId, session.orgId)]
      if (args.category) conditions.push(eq(complianceControls.category, args.category))
      if (args.isActive !== undefined) conditions.push(eq(complianceControls.isActive, args.isActive))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(complianceControls).where(where).orderBy(complianceControls.code).limit(limit).offset(offset),
        db.select({ total: count() }).from(complianceControls).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    complianceControl: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.complianceControls.findFirst({
        where: and(eq(complianceControls.id, args.id), eq(complianceControls.orgId, session.orgId)),
      }) ?? null
    },
  },

  Mutation: {
    createComplianceControl: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const parsed = createComplianceControlSchema.parse(args.input)

      const [created] = await db
        .insert(complianceControls)
        .values({
          ...parsed,
          orgId: session.orgId,
          status: "needs_attention",
          requiredDocumentTypes: parsed.requiredDocumentTypes ?? [],
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    updateComplianceControl: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.complianceControls.findFirst({
        where: and(eq(complianceControls.id, args.id), eq(complianceControls.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateComplianceControlSchema.parse(args.input)
      const setData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          if (key === "metadata") {
            setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
          } else {
            setData[key] = value
          }
        }
      }

      const [updated] = await db.update(complianceControls).set(setData).where(eq(complianceControls.id, args.id)).returning()
      return updated
    },

    deleteComplianceControl: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.complianceControls.findFirst({
        where: and(eq(complianceControls.id, args.id), eq(complianceControls.orgId, session.orgId)),
      })
      if (!existing) throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(complianceControls).where(eq(complianceControls.id, args.id))
      return true
    },

    createComplianceEvidence: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createComplianceEvidenceSchema.parse(args.input)

      // Verify control belongs to org
      const control = await db.query.complianceControls.findFirst({
        where: and(eq(complianceControls.id, parsed.controlId), eq(complianceControls.orgId, session.orgId)),
      })
      if (!control) throw new GraphQLError("Control not found", { extensions: { code: "NOT_FOUND" } })

      const [created] = await db
        .insert(complianceEvidence)
        .values({
          ...parsed,
          validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null,
          validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        })
        .returning()

      return created
    },
  },

  ComplianceControl: {
    requiredDocumentTypes: (parent: { requiredDocumentTypes: unknown }) =>
      (parent.requiredDocumentTypes as string[]) ?? [],
    evidence: async (parent: { id: string }) => {
      return db.query.complianceEvidence.findMany({
        where: eq(complianceEvidence.controlId, parent.id),
      })
    },
  },

  ComplianceEvidence: {
    control: async (parent: { controlId: string }) => {
      return db.query.complianceControls.findFirst({ where: eq(complianceControls.id, parent.controlId) })
    },
    document: async (parent: { documentId: string }) => {
      return db.query.documents.findFirst({ where: eq(documents.id, parent.documentId) })
    },
    reviewer: async (parent: { reviewedBy: string | null }) => {
      if (!parent.reviewedBy) return null
      return db.query.users.findFirst({ where: eq(users.id, parent.reviewedBy) })
    },
  },
}
