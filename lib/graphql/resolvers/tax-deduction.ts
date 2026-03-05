/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/tax-deduction.ts
 * ============================================================================
 *
 * GraphQL resolvers for per-client tax deductions. Handles all TaxDeduction
 * queries and mutations, enforcing org-scoping and role-based access.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Apollo Client (browser)                                      │
 *   │   useQuery(GET_TAX_DEDUCTIONS) / useMutation(CREATE_...)     │
 *   │         ↓                                                    │
 *   │ POST /api/graphql                                            │
 *   │         ↓                                                    │
 *   │ taxDeductionResolvers  (this file)                           │
 *   │   requireAuth()  → session.orgId                             │
 *   │   Zod validation → create/update schemas                     │
 *   │         ↓                                                    │
 *   │ Drizzle ORM → tax_deductions table → PostgreSQL              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * AUTH:
 *   - Queries: requireAuth() — any authenticated org member
 *   - Create/Update: requireRole(["admin", "assistant"])
 *   - Delete: requireRole(["admin"])
 */

import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { taxDeductions, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createTaxDeductionSchema,
  updateTaxDeductionSchema,
} from "@/lib/validations/tax-deduction.schema"
import type { GraphQLContext } from "./context"

export const taxDeductionResolvers = {
  Query: {
    /** taxDeductions — Paginated, filterable list scoped to the caller's org. */
    taxDeductions: async (
      _: unknown,
      args: {
        clientId?: string
        status?: string
        category?: string
        type?: string
        taxYear?: string
        page?: number
        limit?: number
      },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(taxDeductions.orgId, session.orgId)]
      if (args.clientId)
        conditions.push(eq(taxDeductions.clientId, args.clientId))
      if (args.status)
        conditions.push(
          eq(
            taxDeductions.status,
            args.status as "eligible" | "pending_review" | "claimed" | "ineligible"
          )
        )
      if (args.category)
        conditions.push(
          eq(
            taxDeductions.category,
            args.category as "home_office" | "vehicle" | "travel" | "equipment" | "professional" | "education" | "healthcare" | "meals" | "utilities" | "charitable" | "retirement" | "taxes" | "other"
          )
        )
      if (args.type)
        conditions.push(
          eq(taxDeductions.type, args.type as "personal" | "business")
        )
      if (args.taxYear)
        conditions.push(eq(taxDeductions.taxYear, args.taxYear))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(taxDeductions)
          .where(where)
          .orderBy(taxDeductions.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(taxDeductions).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /** taxDeduction — Single tax deduction by ID, scoped to the caller's org. */
    taxDeduction: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.taxDeductions.findFirst({
          where: and(
            eq(taxDeductions.id, args.id),
            eq(taxDeductions.orgId, session.orgId)
          ),
        })) ?? null
      )
    },
  },

  Mutation: {
    /** createTaxDeduction — Inserts a new tax deduction for the caller's org. */
    createTaxDeduction: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createTaxDeductionSchema.parse(args.input)

      const [created] = await db
        .insert(taxDeductions)
        .values({
          ...parsed,
          orgId: session.orgId,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /** updateTaxDeduction — Partially updates an existing tax deduction. */
    updateTaxDeduction: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.taxDeductions.findFirst({
        where: and(
          eq(taxDeductions.id, args.id),
          eq(taxDeductions.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const parsed = updateTaxDeductionSchema.parse(args.input)
      const setData: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          if (key === "metadata") {
            setData[key] = {
              ...((existing.metadata as object) ?? {}),
              ...(value as object),
            }
          } else {
            setData[key] = value ?? null
          }
        }
      }

      const [updated] = await db
        .update(taxDeductions)
        .set(setData)
        .where(eq(taxDeductions.id, args.id))
        .returning()

      return updated
    },

    /** deleteTaxDeduction — Hard-deletes a tax deduction. Admin only. */
    deleteTaxDeduction: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.taxDeductions.findFirst({
        where: and(
          eq(taxDeductions.id, args.id),
          eq(taxDeductions.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })
      await db.delete(taxDeductions).where(eq(taxDeductions.id, args.id))
      return true
    },
  },

  TaxDeduction: {
    /** Field resolver for nested client relationship. */
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
  },
}
