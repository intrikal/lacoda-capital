/**
 * ============================================================================
 * FILE: lib/graphql/resolvers/calendar-event.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   GraphQL resolvers for calendar events. Handles all CalendarEvent queries
 *   and mutations, enforcing org-scoping and role-based access.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Apollo Client (browser)                                  │
 *   │   useQuery(GET_CALENDAR_EVENTS)                          │
 *   │   useMutation(CREATE_CALENDAR_EVENT)                     │
 *   │         ↓                                                │
 *   │ POST /api/graphql                                        │
 *   │         ↓                                                │
 *   │ calendarEventResolvers  (this file)                      │
 *   │   requireAuth()  → session.orgId                        │
 *   │   Zod validation                                         │
 *   │         ↓                                                │
 *   │ Drizzle ORM → calendar_events table → PostgreSQL        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * SECURITY:
 *   - Every operation calls requireAuth() — unauthenticated = rejected
 *   - All queries filter by session.orgId — org isolation
 *   - Create/Update/Delete require role "admin" or "assistant"
 *   - Read (query) is open to all authenticated roles
 */

import { eq, and, count, gte, lte } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { calendarEvents, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "@/lib/validations/calendar-event.schema"
import type { GraphQLContext } from "./context"

export const calendarEventResolvers = {
  Query: {
    /**
     * calendarEvents — Paginated, filterable list of calendar events.
     *
     * Optional filters: clientId, type, dateFrom, dateTo.
     */
    calendarEvents: async (
      _: unknown,
      args: {
        clientId?: string
        type?: string
        dateFrom?: string
        dateTo?: string
        page?: number
        limit?: number
      },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 100, 200)
      const offset = (page - 1) * limit

      const conditions = [eq(calendarEvents.orgId, session.orgId)]
      if (args.clientId)
        conditions.push(eq(calendarEvents.clientId, args.clientId))
      if (args.type)
        conditions.push(
          eq(
            calendarEvents.type,
            args.type as
              | "meeting"
              | "payment"
              | "dividend"
              | "deadline"
              | "document"
              | "call"
          )
        )
      if (args.dateFrom) conditions.push(gte(calendarEvents.date, args.dateFrom))
      if (args.dateTo) conditions.push(lte(calendarEvents.date, args.dateTo))

      const where = and(...conditions)
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(calendarEvents)
          .where(where)
          .orderBy(calendarEvents.date)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(calendarEvents).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },

    /**
     * calendarEvent — Single event by ID, scoped to the caller's org.
     */
    calendarEvent: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      return (
        (await db.query.calendarEvents.findFirst({
          where: and(
            eq(calendarEvents.id, args.id),
            eq(calendarEvents.orgId, session.orgId)
          ),
        })) ?? null
      )
    },
  },

  Mutation: {
    /**
     * createCalendarEvent — Inserts a new calendar event.
     * Requires role: admin | assistant.
     */
    createCalendarEvent: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const parsed = createCalendarEventSchema.parse(args.input)

      const [created] = await db
        .insert(calendarEvents)
        .values({
          ...parsed,
          orgId: session.orgId,
          clientId: parsed.clientId ?? null,
          time: parsed.time ?? null,
          endTime: parsed.endTime ?? null,
          location: parsed.location ?? null,
          amount: parsed.amount ?? null,
          description: parsed.description ?? null,
          attendees: parsed.attendees ?? [],
          reminder: parsed.reminder ?? true,
          metadata: parsed.metadata ?? {},
        })
        .returning()

      return created
    },

    /**
     * updateCalendarEvent — Partially updates an existing event.
     * Requires role: admin | assistant.
     */
    updateCalendarEvent: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.calendarEvents.findFirst({
        where: and(
          eq(calendarEvents.id, args.id),
          eq(calendarEvents.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })

      const parsed = updateCalendarEventSchema.parse(args.input)
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
        .update(calendarEvents)
        .set(setData)
        .where(eq(calendarEvents.id, args.id))
        .returning()

      return updated
    },

    /**
     * deleteCalendarEvent — Hard-deletes an event.
     * Requires role: admin | assistant.
     */
    deleteCalendarEvent: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin", "assistant"])
      const existing = await db.query.calendarEvents.findFirst({
        where: and(
          eq(calendarEvents.id, args.id),
          eq(calendarEvents.orgId, session.orgId)
        ),
      })
      if (!existing)
        throw new GraphQLError("Not found", {
          extensions: { code: "NOT_FOUND" },
        })
      await db.delete(calendarEvents).where(eq(calendarEvents.id, args.id))
      return true
    },
  },

  /**
   * CalendarEvent — Field resolvers.
   * client: Lazily resolved when requested.
   */
  CalendarEvent: {
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({
        where: eq(clients.id, parent.clientId),
      })
    },
  },
}
