import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { eq, and, desc, gte, lte, like } from "drizzle-orm"
import { db } from "@/app/db"
import { ledgerEvents, users } from "@/app/db/schema"
import { authenticateApiRequest, apiResponse } from "@/lib/api-middleware"

/**
 * GET /api/v1/ledger
 *
 * List ledger (audit trail) events for the authenticated org (read-only).
 * Supports query params: action, target_type, after, before, limit, offset
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult instanceof NextResponse) return authResult

  const { orgId } = authResult
  const { searchParams } = request.nextUrl

  const action = searchParams.get("action")
  const targetType = searchParams.get("target_type")
  const after = searchParams.get("after")
  const before = searchParams.get("before")
  const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const offsetParam = parseInt(searchParams.get("offset") ?? "0")

  const conditions = [eq(ledgerEvents.orgId, orgId)]

  if (action) {
    conditions.push(eq(ledgerEvents.action, action as typeof ledgerEvents.action.enumValues[number]))
  }
  if (targetType) {
    conditions.push(eq(ledgerEvents.targetType, targetType as typeof ledgerEvents.targetType.enumValues[number]))
  }
  if (after) {
    conditions.push(gte(ledgerEvents.createdAt, new Date(after)))
  }
  if (before) {
    conditions.push(lte(ledgerEvents.createdAt, new Date(before)))
  }

  try {
    const allEvents = await db.query.ledgerEvents.findMany({
      where: and(...conditions),
      orderBy: (e, { desc: d }) => [d(e.createdAt)],
    })

    const paged = allEvents.slice(offsetParam, offsetParam + limitParam)

    return apiResponse({
      data: paged.map((e) => ({
        id: e.id,
        action: e.action,
        target_type: e.targetType,
        target_id: e.targetId,
        actor_user_id: e.actorUserId,
        payload: e.payload,
        ip_address: e.ipAddress,
        created_at: e.createdAt.toISOString(),
      })),
      total: allEvents.length,
      limit: limitParam,
      offset: offsetParam,
    })
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("api_route", "/api/v1/ledger")
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
