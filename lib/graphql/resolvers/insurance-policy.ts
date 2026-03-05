/**
 * GraphQL resolvers for insurance policies.
 * Handles all InsurancePolicy queries and mutations with org-scoping and RBAC.
 */

import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { insurancePolicies, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createInsurancePolicySchema,
  updateInsurancePolicySchema,
} from "@/lib/validations/insurance-policy.schema"
import type { GraphQLContext } from "./context"

export const insurancePolicyResolvers = {
  Query: {
    /** Paginated, filterable list of insurance policies scoped to the caller's org. */
    insurancePolicies: async (
      _: unknown,
      args: {
        clientId?: string
        status?: string
        policyType?: string
        page?: number
        limit?: number
      },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(insurancePolicies.orgId, session.orgId)]
      if (args.clientId)
        conditions.push(eq(insurancePolicies.clientId, args.clientId))
      if (args.status)
        conditions.push(
          eq(
            insurancePolicies.status,
            args.status as "active" | "expiring" | "expired" | "pending"
          )
        )
      if (args.policyType)
        conditions.push(
          eq(
            insurancePolicies.policyType,
            args.policyType as
              | "home"
              | "auto"
              | "life"
              | "umbrella"
              | "liability"
              | "health"
              | "business"
              | "property"
          )
        )

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(insurancePolicies)
          .where(where)
          .orderBy(insurancePolicies.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(insurancePolicies).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /** Single insurance policy by ID, org-scoped. */
    insurancePolicy: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.insurancePolicies.findFirst({
          where: and(
            eq(insurancePolicies.id, args.id),
            eq(insurancePolicies.orgId, session.orgId)
          ),
        })) ?? null
      )
    },
  },

  Mutation: {
    /** Creates a new insurance policy. Requires admin | assistant. */
    createInsurancePolicy: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createInsurancePolicySchema.parse(args.input)

      const [created] = await db
        .insert(insurancePolicies)
        .values({
          ...parsed,
          orgId: session.orgId,
          clientId: parsed.clientId ?? null,
          deductible: parsed.deductible ?? 0,
          coveredAssets: parsed.coveredAssets ?? [],
          beneficiaries: parsed.beneficiaries ?? [],
          agent: parsed.agent ?? null,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /** Partially updates an existing insurance policy. Requires admin | assistant. */
    updateInsurancePolicy: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.insurancePolicies.findFirst({
        where: and(
          eq(insurancePolicies.id, args.id),
          eq(insurancePolicies.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const parsed = updateInsurancePolicySchema.parse(args.input)
      const setData: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          if (key === "metadata") {
            // MERGE metadata: preserve existing keys, add/overwrite new ones
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
        .update(insurancePolicies)
        .set(setData)
        .where(eq(insurancePolicies.id, args.id))
        .returning()

      return updated
    },

    /** Hard-deletes an insurance policy. Requires admin only. */
    deleteInsurancePolicy: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.insurancePolicies.findFirst({
        where: and(
          eq(insurancePolicies.id, args.id),
          eq(insurancePolicies.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })
      await db
        .delete(insurancePolicies)
        .where(eq(insurancePolicies.id, args.id))
      return true
    },
  },

  /** Field resolvers — lazy-loaded client relation. */
  InsurancePolicy: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
  },
}
