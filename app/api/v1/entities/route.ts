import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { entities } from "@/app/db/schema"
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

  const allEntities = await db.query.entities.findMany({
    where: and(
      eq(entities.orgId, orgId),
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
      description: e.description,
      metadata: e.metadata,
      created_at: e.createdAt.toISOString(),
      updated_at: e.updatedAt.toISOString(),
    })),
    total: allEntities.length,
    limit: limitParam,
    offset: offsetParam,
  })
}
