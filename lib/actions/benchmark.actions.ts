"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { benchmarks } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createBenchmarkSchema, updateBenchmarkSchema } from "@/lib/validations/benchmark.schema"
import type { BenchmarkRecord, PaginatedResult } from "@/lib/types"

export async function getBenchmarks(params?: {
  clientId?: string
  category?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<BenchmarkRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(benchmarks.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(benchmarks.clientId, params.clientId))
  if (params?.category) conditions.push(eq(benchmarks.category, params.category as "index" | "etf" | "mutual_fund" | "custom"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(benchmarks).where(where).orderBy(benchmarks.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(benchmarks).where(where),
  ])

  return { items: items as unknown as BenchmarkRecord[], totalCount: total, page, limit }
}

export async function getBenchmark(id: string): Promise<BenchmarkRecord | null> {
  const session = await requireAuth()
  const row = await db.query.benchmarks.findFirst({
    where: and(eq(benchmarks.id, id), eq(benchmarks.orgId, session.orgId!)),
  })
  return (row as unknown as BenchmarkRecord) ?? null
}

export async function createBenchmark(input: unknown): Promise<BenchmarkRecord> {
  const session = await requireRole("assistant")
  const parsed = createBenchmarkSchema.parse(input)

  const [created] = await db
    .insert(benchmarks)
    .values({
      ...parsed,
      orgId: session.orgId!,
      clientId: parsed.clientId ?? null,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  captureServerEvent(session.userId, "benchmark.created", { category: parsed.category })

  return created as unknown as BenchmarkRecord
}

export async function updateBenchmark(id: string, input: unknown): Promise<BenchmarkRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.benchmarks.findFirst({
    where: and(eq(benchmarks.id, id), eq(benchmarks.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateBenchmarkSchema.parse(input)
  const setData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      if (key === "metadata") {
        setData[key] = { ...(existing.metadata as object ?? {}), ...(value as object) }
      } else {
        setData[key] = value ?? null
      }
    }
  }

  const [updated] = await db.update(benchmarks).set(setData).where(eq(benchmarks.id, id)).returning()
  return updated as unknown as BenchmarkRecord
}

export async function deleteBenchmark(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.benchmarks.findFirst({
    where: and(eq(benchmarks.id, id), eq(benchmarks.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(benchmarks).where(eq(benchmarks.id, id))
  return true
}
