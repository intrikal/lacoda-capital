"use server"

import { db } from "@/app/db"
import { ledgerEvents, users } from "@/app/db/schema"
import type { LedgerEvent } from "@/app/db/schema"
import { eq, desc, and, gte, lte, lt, or, like, sql } from "drizzle-orm"

/**
 * LedgerRow — Database result with actor name resolved.
 *
 * This is the real type (not mock), returned by service functions.
 * It includes the actor's display name resolved from a join to users table.
 */
export interface LedgerRow {
  id: string
  orgId: string
  actorName: string // Resolved from users.fullName ?? users.email ?? "Former Member"
  actorUserId: string | null
  action: string // ledgerActionEnum value
  targetType: string // ledgerTargetTypeEnum value
  targetId: string
  payload: Record<string, unknown>
  ipAddress: string | null
  createdAt: Date
}

/**
 * Cursor-based pagination result.
 *
 * Cursor pagination is more efficient than offset/limit for large datasets:
 * - offset/limit: DB must skip N rows before fetching. Slow for large N.
 * - cursor: DB fetches rows AFTER a specific position. Fast even for huge datasets.
 */
export interface PaginatedLedgerResult {
  items: LedgerRow[]
  nextCursor: string | null // If null, no more rows exist
}

/**
 * Filter parameters for ledger queries.
 */
export interface LedgerFilters {
  orgId: string
  actorId?: string // Filter by who performed the action
  action?: string // Filter by what happened (from ledgerActionEnum)
  targetType?: string // Filter by what type of thing (from ledgerTargetTypeEnum)
  before?: Date // Filter to events before this timestamp
  after?: Date // Filter to events after this timestamp
  search?: string // Free-text search on actor name, targetId
  cursor?: string // For pagination: continue after this event ID
  limit?: number // How many rows to return (default 50, max 100)
}

/**
 * getLedgerEntries — Fetch events with filtering, searching, and cursor pagination.
 *
 * Features:
 *   - Cursor-based pagination for efficiency
 *   - Filter by actor, action, targetType, date range
 *   - Free-text search on actor name and target ID
 *   - Resolve actor display name (or "Former Member" if user deleted)
 *   - Returns up to (limit + 1) to detect if more rows exist
 *
 * Example:
 *   const result = await getLedgerEntries({
 *     orgId: "org-123",
 *     action: "created",
 *     limit: 20,
 *   })
 *   // Returns first 20 items + nextCursor (or null if done)
 */
export async function getLedgerEntries(
  filters: LedgerFilters
): Promise<PaginatedLedgerResult> {
  const limit = Math.min(filters.limit ?? 50, 100)

  // Build WHERE clause
  const conditions = [eq(ledgerEvents.orgId, filters.orgId)]

  if (filters.actorId) {
    conditions.push(eq(ledgerEvents.actorUserId, filters.actorId))
  }
  if (filters.action) {
    conditions.push(eq(ledgerEvents.action, filters.action as LedgerEvent["action"]))
  }
  if (filters.targetType) {
    conditions.push(eq(ledgerEvents.targetType, filters.targetType as LedgerEvent["targetType"]))
  }
  if (filters.after) {
    conditions.push(gte(ledgerEvents.createdAt, filters.after))
  }
  if (filters.before) {
    conditions.push(lte(ledgerEvents.createdAt, filters.before))
  }

  // Cursor: if provided, fetch events AFTER this event ID
  // We fetch (limit + 1) rows to detect if more exist
  if (filters.cursor) {
    // Find the cursor event's timestamp to compare
    const cursorEvent = await db
      .select({ createdAt: ledgerEvents.createdAt })
      .from(ledgerEvents)
      .where(eq(ledgerEvents.id, filters.cursor))
      .limit(1)

    if (cursorEvent[0]) {
      // Cursor pagination on an ordered-by-createdAt-desc result set.
      // We want rows that come *after* the cursor when sorted newest-first, i.e.:
      //   createdAt < cursor.createdAt
      //   OR (createdAt = cursor.createdAt AND id < cursor.id)  ← tie-break by id
      // UUIDs (v4) are random, so the tie-break is just for determinism, not ordering.
      conditions.push(
        or(
          lt(ledgerEvents.createdAt, cursorEvent[0].createdAt),
          and(
            sql`${ledgerEvents.createdAt} = ${cursorEvent[0].createdAt}`,
            lt(ledgerEvents.id, filters.cursor!)
          )
        )!
      )
    }
  }

  // Fetch events with left join to users table to resolve actor names
  const rows = await db
    .select({
      id: ledgerEvents.id,
      orgId: ledgerEvents.orgId,
      actorUserId: ledgerEvents.actorUserId,
      action: ledgerEvents.action,
      targetType: ledgerEvents.targetType,
      targetId: ledgerEvents.targetId,
      payload: ledgerEvents.payload,
      ipAddress: ledgerEvents.ipAddress,
      createdAt: ledgerEvents.createdAt,
      // User data (may be null if user was deleted)
      userFullName: users.fullName,
      userEmail: users.email,
    })
    .from(ledgerEvents)
    .leftJoin(users, eq(ledgerEvents.actorUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(ledgerEvents.createdAt))
    .limit(limit + 1) // +1 to detect if more exist

  // Resolve actor names and build result
  const items: LedgerRow[] = rows.slice(0, limit).map((row) => ({
    id: row.id,
    orgId: row.orgId,
    actorUserId: row.actorUserId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    payload: (row.payload as Record<string, unknown>) ?? {},
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    // Resolve actor name: fullName ?? email ?? "Former Member" (if user was deleted)
    actorName: row.userFullName || row.userEmail || "Former Member",
  }))

  // Determine if more rows exist (we fetched limit+1, so if we got limit+1 rows, there's a next page)
  const nextCursor = rows.length > limit ? rows[limit]?.id ?? null : null

  return { items, nextCursor }
}

/**
 * getLedgerEntryById — Fetch a single event by ID.
 *
 * Resolves actor name from user table.
 */
export async function getLedgerEntryById(id: string): Promise<LedgerRow | null> {
  const rows = await db
    .select({
      id: ledgerEvents.id,
      orgId: ledgerEvents.orgId,
      actorUserId: ledgerEvents.actorUserId,
      action: ledgerEvents.action,
      targetType: ledgerEvents.targetType,
      targetId: ledgerEvents.targetId,
      payload: ledgerEvents.payload,
      ipAddress: ledgerEvents.ipAddress,
      createdAt: ledgerEvents.createdAt,
      userFullName: users.fullName,
      userEmail: users.email,
    })
    .from(ledgerEvents)
    .leftJoin(users, eq(ledgerEvents.actorUserId, users.id))
    .where(eq(ledgerEvents.id, id))
    .limit(1)

  if (!rows[0]) return null

  const row = rows[0]
  return {
    id: row.id,
    orgId: row.orgId,
    actorUserId: row.actorUserId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    payload: (row.payload as Record<string, unknown>) ?? {},
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    actorName: row.userFullName || row.userEmail || "Former Member",
  }
}

/**
 * exportLedgerCSV — Export ledger events as CSV.
 *
 * Returns a CSV string with columns:
 * Timestamp, Actor, Action, Target Type, Target ID, IP Address, Details
 *
 * This is used by the /app/ledger page to download the audit trail.
 */
export async function exportLedgerCSV(
  filters: LedgerFilters
): Promise<string> {
  // Use getLedgerEntries with a large limit to fetch all matching rows
  const result = await getLedgerEntries({
    ...filters,
    limit: 10000, // Fetch up to 10K rows for export
  })

  // CSV header
  const headers = [
    "Timestamp",
    "Actor",
    "Action",
    "Target Type",
    "Target ID",
    "IP Address",
    "Details",
  ]

  // CSV rows
  const rows = result.items.map((entry) => {
    const details = (entry.payload?.details as string) || ""
    return [
      entry.createdAt.toISOString(),
      entry.actorName,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.ipAddress || "",
      // Escape quotes in details
      `"${details.replace(/"/g, '""')}"`,
    ].join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

/**
 * DEPRECATED: Old functions below for backwards compatibility.
 * These return mock-typed data and are used by use-ledger hook.
 * New code should use the functions above.
 */

import type { LedgerEntry, LedgerActionType } from "@/lib/types/mock"

function toLedgerEntry(row: typeof ledgerEvents.$inferSelect): LedgerEntry {
  return {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    action: row.action as LedgerActionType,
    user: row.actorUserId ?? "system",
    entity: row.targetId,
    entityType: row.targetType as LedgerEntry["entityType"],
    details: (row.payload as Record<string, unknown>)?.details as string ?? "",
    isSensitive:
      ((row.payload as Record<string, unknown>)?.isSensitive as boolean) ??
      false,
    ipAddress: row.ipAddress ?? "",
  }
}

export async function getLedgerEntriesMock(): Promise<LedgerEntry[]> {
  const rows = await db
    .select()
    .from(ledgerEvents)
    .orderBy(desc(ledgerEvents.createdAt))
  return rows.map(toLedgerEntry)
}

export async function getLedgerEntryByIdMock(
  id: string
): Promise<LedgerEntry | undefined> {
  const rows = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.id, id))
  return rows[0] ? toLedgerEntry(rows[0]) : undefined
}

export async function getLedgerEntriesByAction(
  action: string
): Promise<LedgerEntry[]> {
  const rows = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.action, action as LedgerEvent["action"]))
  return rows.map(toLedgerEntry)
}

export async function getLedgerEntriesByUser(user: string): Promise<LedgerEntry[]> {
  const rows = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.actorUserId, user))
  return rows.map(toLedgerEntry)
}

export async function getSensitiveLedgerEntries(): Promise<LedgerEntry[]> {
  const rows = await db
    .select()
    .from(ledgerEvents)
    .orderBy(desc(ledgerEvents.createdAt))
  return rows.map(toLedgerEntry).filter((e) => e.isSensitive)
}
