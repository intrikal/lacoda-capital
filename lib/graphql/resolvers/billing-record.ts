/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/billing-record.ts
 * ============================================================================
 *
 * GraphQL resolvers for billing records (advisory fee invoices). Handles all
 * BillingRecord queries and mutations, enforcing org-scoping and role-based
 * access on every operation.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Apollo Client (browser)                                      │
 *   │   useQuery(GET_BILLING_RECORDS) / useMutation(CREATE_...)    │
 *   │         ↓                                                    │
 *   │ POST /api/graphql                                            │
 *   │         ↓                                                    │
 *   │ billingRecordResolvers  (this file)                          │
 *   │   requireAuth()  → session.orgId                             │
 *   │   Zod validation → create/update schemas                     │
 *   │         ↓                                                    │
 *   │ Drizzle ORM → billing_records table → PostgreSQL             │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * AUTH:
 *   - Queries: requireAuth() — any authenticated org member can read
 *   - Create/Update: requireRole(["admin", "assistant"]) — advisors manage invoices
 *   - Delete: requireRole(["admin"]) — only admins can delete billing records
 */

import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { billingRecords, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createBillingRecordSchema,
  updateBillingRecordSchema,
} from "@/lib/validations/billing-record.schema"
import type { GraphQLContext } from "./context"

export const billingRecordResolvers = {
  Query: {
    /** billingRecords — Paginated, filterable list scoped to the caller's org. */
    billingRecords: async (
      _: unknown,
      args: {
        clientId?: string
        status?: string
        page?: number
        limit?: number
      },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(billingRecords.orgId, session.orgId)]
      if (args.clientId)
        conditions.push(eq(billingRecords.clientId, args.clientId))
      if (args.status)
        conditions.push(
          eq(
            billingRecords.status,
            args.status as "paid" | "upcoming" | "due"
          )
        )

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(billingRecords)
          .where(where)
          .orderBy(billingRecords.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(billingRecords).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /** billingRecord — Single billing record by ID, scoped to the caller's org. */
    billingRecord: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.billingRecords.findFirst({
          where: and(
            eq(billingRecords.id, args.id),
            eq(billingRecords.orgId, session.orgId)
          ),
        })) ?? null
      )
    },
  },

  Mutation: {
    /** createBillingRecord — Inserts a new billing record for the caller's org. */
    createBillingRecord: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createBillingRecordSchema.parse(args.input)

      const [created] = await db
        .insert(billingRecords)
        .values({
          ...parsed,
          orgId: session.orgId,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /** updateBillingRecord — Partially updates an existing billing record. */
    updateBillingRecord: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.billingRecords.findFirst({
        where: and(
          eq(billingRecords.id, args.id),
          eq(billingRecords.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const parsed = updateBillingRecordSchema.parse(args.input)
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
        .update(billingRecords)
        .set(setData)
        .where(eq(billingRecords.id, args.id))
        .returning()

      return updated
    },

    /** deleteBillingRecord — Hard-deletes a billing record. Admin only. */
    deleteBillingRecord: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.billingRecords.findFirst({
        where: and(
          eq(billingRecords.id, args.id),
          eq(billingRecords.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })
      await db.delete(billingRecords).where(eq(billingRecords.id, args.id))
      return true
    },
  },

  BillingRecord: {
    /** Field resolver for nested client relationship. */
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
  },
}
