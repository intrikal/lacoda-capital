import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { clients } from "@/app/db/schema"
import { authenticateApiRequest, apiResponse } from "@/lib/api-middleware"

/**
 * GET /api/v1/clients
 *
 * List all clients for the authenticated org (read-only).
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult instanceof NextResponse) return authResult

  const { orgId } = authResult
  const { searchParams } = request.nextUrl

  const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500)
  const offsetParam = parseInt(searchParams.get("offset") ?? "0")

  const allClients = await db.query.clients.findMany({
    where: and(
      eq(clients.orgId, orgId),
      isNull(clients.deletedAt)
    ),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })

  const paged = allClients.slice(offsetParam, offsetParam + limitParam)

  return apiResponse({
    data: paged.map((c) => ({
      id: c.id,
      display_name: c.displayName,
      email: c.email,
      phone: c.phone,
      external_id: c.externalId,
      profile: c.profile,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
    total: allClients.length,
    limit: limitParam,
    offset: offsetParam,
  })
}
