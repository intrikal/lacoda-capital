import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { documents } from "@/app/db/schema"
import { authenticateApiRequest, apiResponse } from "@/lib/api-middleware"

/**
 * GET /api/v1/documents
 *
 * List all documents for the authenticated org (read-only).
 * Supports query params: status, client_id
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult instanceof NextResponse) return authResult

  const { orgId } = authResult
  const { searchParams } = request.nextUrl

  const status = searchParams.get("status")
  const clientId = searchParams.get("client_id")
  const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500)
  const offsetParam = parseInt(searchParams.get("offset") ?? "0")

  try {
    const allDocs = await db.query.documents.findMany({
      where: and(
        eq(documents.orgId, orgId),
        isNull(documents.deletedAt),
        ...(status ? [eq(documents.status, status as typeof documents.status.enumValues[number])] : []),
        ...(clientId ? [eq(documents.clientId, clientId)] : []),
      ),
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    })

    const paged = allDocs.slice(offsetParam, offsetParam + limitParam)

    return apiResponse({
      data: paged.map((d) => ({
        id: d.id,
        org_id: d.orgId,
        client_id: d.clientId,
        entity_id: d.entityId,
        asset_id: d.assetId,
        name: d.name,
        file_type: d.mimeType,
        file_size: d.fileSize,
        status: d.status,
        metadata: d.metadata,
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
      })),
      total: allDocs.length,
      limit: limitParam,
      offset: offsetParam,
    })
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("api_route", "/api/v1/documents")
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
