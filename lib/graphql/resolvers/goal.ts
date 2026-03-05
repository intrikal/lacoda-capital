/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/goal.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   GraphQL resolvers for financial goals. Handles all Goal queries and
 *   mutations, enforcing org-scoping and role-based access on every operation.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Apollo Client (browser)                                  │
 *   │   useQuery(GET_GOALS)  /  useMutation(CREATE_GOAL)       │
 *   │         ↓                                                │
 *   │ POST /api/graphql                                        │
 *   │         ↓                                                │
 *   │ goalResolvers  (this file)                               │
 *   │   requireAuth()  → session.orgId                        │
 *   │   Zod validation → createGoalSchema / updateGoalSchema  │
 *   │         ↓                                                │
 *   │ Drizzle ORM → goals table → PostgreSQL                  │
 *   └──────────────────────────────────────────────────────────┘
 *
 * SECURITY:
 *   - Every query/mutation calls requireAuth() first — unauthenticated
 *     requests are rejected with UNAUTHENTICATED.
 *   - All DB queries filter by session.orgId — one org can never read
 *     or modify another org's goals.
 *   - Create/Update/Delete require role "admin" or "assistant".
 *     Read (query) is open to all authenticated roles (admin, assistant, client).
 *
 * DATA MODEL:
 *   goals table: id, orgId, clientId?, name, category, status, priority,
 *     targetAmount, currentAmount, monthlyContribution, targetDate,
 *     notes, metadata, createdAt, updatedAt
 *
 * FLOAT FIELDS:
 *   targetAmount, currentAmount, and monthlyContribution are stored as
 *   doublePrecision (float8) in PostgreSQL. Drizzle returns these as JS
 *   numbers directly — no string parsing required.
 */

import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { goals, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createGoalSchema, updateGoalSchema } from "@/lib/validations/goal.schema"
import type { GraphQLContext } from "./context"

export const goalResolvers = {
  Query: {
    /**
     * goals — Paginated, filterable list of goals scoped to the caller's org.
     *
     * All authenticated roles can query goals.
     * Optional filters: clientId, status, category.
     *
     * Returns a GoalConnection (items + pagination metadata).
     */
    goals: async (
      _: unknown,
      args: {
        clientId?: string
        status?: string
        category?: string
        page?: number
        limit?: number
      },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const conditions = [eq(goals.orgId, session.orgId)]
      if (args.clientId) conditions.push(eq(goals.clientId, args.clientId))
      if (args.status)
        conditions.push(
          eq(
            goals.status,
            args.status as "on_track" | "ahead" | "behind" | "completed"
          )
        )
      if (args.category)
        conditions.push(
          eq(
            goals.category,
            args.category as
              | "retirement"
              | "education"
              | "realestate"
              | "emergency"
              | "travel"
              | "vehicle"
              | "investment"
              | "custom"
          )
        )

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(goals)
          .where(where)
          .orderBy(goals.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(goals).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /**
     * goal — Single goal by ID, scoped to the caller's org.
     * Returns null if not found or if it belongs to a different org.
     */
    goal: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.goals.findFirst({
          where: and(eq(goals.id, args.id), eq(goals.orgId, session.orgId)),
        })) ?? null
      )
    },
  },

  Mutation: {
    /**
     * createGoal — Inserts a new financial goal for the caller's org.
     *
     * Requires role: admin | assistant.
     *
     * The resolver auto-sets:
     *   - orgId      → from the authenticated session (multi-tenant isolation)
     *   - status     → "on_track" (DB default)
     *   - currentAmount → 0 if not provided
     *   - monthlyContribution → 0 if not provided
     */
    createGoal: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createGoalSchema.parse(args.input)

      const [created] = await db
        .insert(goals)
        .values({
          ...parsed,
          orgId: session.orgId,
          clientId: parsed.clientId ?? null,
          currentAmount: parsed.currentAmount ?? 0,
          monthlyContribution: parsed.monthlyContribution ?? 0,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /**
     * updateGoal — Partially updates an existing goal.
     *
     * Requires role: admin | assistant.
     * Only fields present in the input are updated (partial update pattern).
     * For metadata (jsonb), new keys are MERGED with existing ones.
     *
     * Throws NOT_FOUND if the goal doesn't exist or belongs to another org.
     */
    updateGoal: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.goals.findFirst({
        where: and(eq(goals.id, args.id), eq(goals.orgId, session.orgId)),
      })
      if (!existing)
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })

      const parsed = updateGoalSchema.parse(args.input)
      const setData: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) {
          if (key === "metadata") {
            // MERGE metadata: preserve existing keys, add/overwrite new ones
            setData[key] = {
              ...(existing.metadata as object ?? {}),
              ...(value as object),
            }
          } else {
            setData[key] = value ?? null
          }
        }
      }

      const [updated] = await db
        .update(goals)
        .set(setData)
        .where(eq(goals.id, args.id))
        .returning()

      return updated
    },

    /**
     * deleteGoal — Hard-deletes a goal.
     *
     * Requires role: admin only.
     * This is irreversible. No cascade effects (goals have no child tables).
     *
     * Throws NOT_FOUND if the goal doesn't exist or belongs to another org.
     */
    deleteGoal: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.goals.findFirst({
        where: and(eq(goals.id, args.id), eq(goals.orgId, session.orgId)),
      })
      if (!existing)
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      await db.delete(goals).where(eq(goals.id, args.id))
      return true
    },
  },

  /**
   * Goal — Field resolvers for the Goal type.
   *
   * client: Lazily resolved — only fetched when the query requests the
   *   client field. Returns null if clientId is null or client is not found.
   */
  Goal: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
  },
}
