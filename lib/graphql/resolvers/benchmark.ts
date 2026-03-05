/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/benchmark.ts
 * ============================================================================
 *
 * GraphQL resolvers for portfolio benchmarks. Handles all Benchmark queries
 * and mutations, enforcing org-scoping and role-based access on every operation.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Apollo Client (browser)                                      │
 *   │   useQuery(GET_BENCHMARKS)  /  useMutation(CREATE_BENCHMARK) │
 *   │         ↓                                                    │
 *   │ POST /api/graphql                                            │
 *   │         ↓                                                    │
 *   │ benchmarkResolvers  (this file)                              │
 *   │   requireAuth()  → session.orgId                             │
 *   │   Zod validation → createBenchmarkSchema / updateSchema      │
 *   │         ↓                                                    │
 *   │ Drizzle ORM → benchmarks table → PostgreSQL                 │
 *   └──────────────────────────────────────────────────────────────┘
 */

import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { benchmarks, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createBenchmarkSchema,
  updateBenchmarkSchema,
} from "@/lib/validations/benchmark.schema"
import type { GraphQLContext } from "./context"

export const benchmarkResolvers = {
  Query: {
    /** benchmarks — Paginated, filterable list scoped to the caller's org. */
    benchmarks: async (
      _: unknown,
      args: {
        clientId?: string
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

      const conditions = [eq(benchmarks.orgId, session.orgId)]
      if (args.clientId)
        conditions.push(eq(benchmarks.clientId, args.clientId))
      if (args.category)
        conditions.push(
          eq(
            benchmarks.category,
            args.category as "index" | "etf" | "mutual_fund" | "custom"
          )
        )

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(benchmarks)
          .where(where)
          .orderBy(benchmarks.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(benchmarks).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /** benchmark — Single benchmark by ID, scoped to the caller's org. */
    benchmark: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.benchmarks.findFirst({
          where: and(
            eq(benchmarks.id, args.id),
            eq(benchmarks.orgId, session.orgId)
          ),
        })) ?? null
      )
    },
  },

  Mutation: {
    /** createBenchmark — Inserts a new benchmark for the caller's org. */
    createBenchmark: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createBenchmarkSchema.parse(args.input)

      const [created] = await db
        .insert(benchmarks)
        .values({
          ...parsed,
          orgId: session.orgId,
          clientId: parsed.clientId ?? null,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /** updateBenchmark — Partially updates an existing benchmark. */
    updateBenchmark: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.benchmarks.findFirst({
        where: and(
          eq(benchmarks.id, args.id),
          eq(benchmarks.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const parsed = updateBenchmarkSchema.parse(args.input)
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
        .update(benchmarks)
        .set(setData)
        .where(eq(benchmarks.id, args.id))
        .returning()

      return updated
    },

    /** deleteBenchmark — Hard-deletes a benchmark. Admin only. */
    deleteBenchmark: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.benchmarks.findFirst({
        where: and(
          eq(benchmarks.id, args.id),
          eq(benchmarks.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })
      await db.delete(benchmarks).where(eq(benchmarks.id, args.id))
      return true
    },
  },

  Benchmark: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
  },
}
