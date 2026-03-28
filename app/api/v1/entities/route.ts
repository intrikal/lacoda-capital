import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull, inArray } from "drizzle-orm"
import { db } from "@/app/db"
import { entities, clients } from "@/app/db/schema"
import { authenticateApiRequest, apiResponse } from "@/lib/api-middleware"

/**
 * GET /api/v1/entities
 *
 * List all entities for the authenticated org (read-only).
 * Supports query params: client_id, entity_type
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult instanceof NextResponse) return authResult

  const { orgId } = authResult
  const { searchParams } = request.nextUrl

  const clientId = searchParams.get("client_id")
  const entityType = searchParams.get("entity_type")
  const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500)
  const offsetParam = parseInt(searchParams.get("offset") ?? "0")

  // Entities belong to clients, which belong to orgs — filter via client IDs
  const orgClients = await db.query.clients.findMany({
    where: and(eq(clients.orgId, orgId), isNull(clients.deletedAt)),
    columns: { id: true },
  })
  const orgClientIds = orgClients.map((c) => c.id)

  if (orgClientIds.length === 0) {
    return apiResponse({ data: [], total: 0, limit: limitParam, offset: offsetParam })
  }

  const allEntities = await db.query.entities.findMany({
    where: and(
      inArray(entities.clientId, orgClientIds),
      isNull(entities.deletedAt),
      ...(clientId ? [eq(entities.clientId, clientId)] : []),
      ...(entityType ? [eq(entities.entityType, entityType as typeof entities.entityType.enumValues[number])] : []),
    ),
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  })

  const paged = allEntities.slice(offsetParam, offsetParam + limitParam)

  return apiResponse({
    data: paged.map((e) => ({
      id: e.id,
      client_id: e.clientId,
      name: e.name,
      entity_type: e.entityType,
      metadata: e.metadata,
      created_at: e.createdAt.toISOString(),
      updated_at: e.updatedAt.toISOString(),
    })),
    total: allEntities.length,
    limit: limitParam,
    offset: offsetParam,
  })
}
