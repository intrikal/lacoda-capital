import { graphql, HttpResponse } from "msw"
import type { ClientRecord } from "@/lib/validations/client.schema"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const fixtures: ClientRecord[] = [
  {
    id: "client-1",
    displayName: "Alice Johnson",
    email: "alice@example.com",
    phone: "+1 555 000 0001",
    clientType: "individual",
    clientStatus: "active",
    createdAt: "2024-01-15T00:00:00.000Z",
    entityCount: 2,
    assetCount: 3,
    totalAUM: 1_500_000,
  },
  {
    id: "client-2",
    displayName: "Brightstone Capital",
    email: "ops@brightstone.com",
    phone: null,
    clientType: "institution",
    clientStatus: "prospect",
    createdAt: "2024-03-01T00:00:00.000Z",
    entityCount: 0,
    assetCount: 0,
    totalAUM: 0,
  },
]

let db = [...fixtures]

export function resetDb() {
  db = [...fixtures]
}

// ─── GraphQL Handlers ─────────────────────────────────────────────────────────

export const handlers = [
  // GetClients query
  graphql.query("GetClients", ({ variables }) => {
    let results = [...db]

    if (variables.search) {
      const search = variables.search.toLowerCase()
      results = results.filter(
        (c) =>
          c.displayName.toLowerCase().includes(search) ||
          (c.email ?? "").toLowerCase().includes(search)
      )
    }

    if (variables.status) {
      results = results.filter((c) => c.clientStatus === variables.status)
    }

    return HttpResponse.json({
      data: {
        clients: {
          items: results,
          totalCount: results.length,
          page: variables.page ?? 1,
          limit: variables.limit ?? 50,
        },
      },
    })
  }),

  // GetClient query
  graphql.query("GetClient", ({ variables }) => {
    const client = db.find((c) => c.id === variables.id)
    return HttpResponse.json({
      data: { client: client ?? null },
    })
  }),

  // CreateClient mutation
  graphql.mutation("CreateClient", ({ variables }) => {
    const input = variables.input as Partial<ClientRecord>
    const newClient: ClientRecord = {
      id: `client-${Date.now()}`,
      displayName: input.displayName ?? "New Client",
      email: (input.email as string) ?? null,
      phone: (input.phone as string) ?? null,
      clientType: (input.clientType as ClientRecord["clientType"]) ?? "individual",
      clientStatus: (input.clientStatus as ClientRecord["clientStatus"]) ?? "prospect",
      createdAt: new Date().toISOString(),
      entityCount: 0,
      assetCount: 0,
      totalAUM: 0,
    }
    db = [newClient, ...db]
    return HttpResponse.json({
      data: { createClient: newClient },
    })
  }),

  // UpdateClient mutation
  graphql.mutation("UpdateClient", ({ variables }) => {
    const { id, input } = variables as { id: string; input: Partial<ClientRecord> }
    const idx = db.findIndex((c) => c.id === id)
    if (idx === -1) {
      return HttpResponse.json({
        errors: [{ message: "Not found", extensions: { code: "NOT_FOUND" } }],
      })
    }
    db[idx] = { ...db[idx], ...input }
    return HttpResponse.json({
      data: { updateClient: db[idx] },
    })
  }),

  // DeleteClient mutation
  graphql.mutation("DeleteClient", ({ variables }) => {
    const { id } = variables as { id: string }
    const idx = db.findIndex((c) => c.id === id)
    if (idx === -1) {
      return HttpResponse.json({
        errors: [{ message: "Not found", extensions: { code: "NOT_FOUND" } }],
      })
    }
    db.splice(idx, 1)
    return HttpResponse.json({
      data: { deleteClient: true },
    })
  }),
]
