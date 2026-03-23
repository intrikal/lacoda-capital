"use server"

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { clients } from "@/app/db/schema"
import { eq, count, isNull } from "drizzle-orm"
import type { Client } from "@/lib/types/mock"
import type { ClientProfile } from "@/app/db/schema/clients"

/** Map a DB clients row to the Client mock type shape. */
function toClient(row: typeof clients.$inferSelect): Client {
  const profile = (row.profile ?? {}) as ClientProfile
  return {
    id: row.id,
    name: row.displayName,
    email: row.email ?? "",
    phone: row.phone ?? "",
    type: (profile.clientType ?? "individual") as Client["type"],
    status: (profile.clientStatus ?? "active") as Client["status"],
    aum: 0, // AUM is computed from assets — not stored on the client row
    joinedDate: row.createdAt.toISOString(),
    lastActivity: row.updatedAt.toISOString(),
    assignedAssets: [],
    assignedDocuments: [],
  }
}

export async function getClients(): Promise<Client[]> {
  const rows = await db.select().from(clients).where(isNull(clients.deletedAt))
  return rows.map(toClient)
}

export async function getClientById(id: string): Promise<Client | undefined> {
  const rows = await db.select().from(clients).where(eq(clients.id, id))
  return rows[0] ? toClient(rows[0]) : undefined
}

export async function getActiveClients(): Promise<Client[]> {
  // clientStatus lives in the profile JSONB — filter in application layer
  const all = await getClients()
  return all.filter((c) => c.status === "active")
}

export async function getClientStats() {
  const all = await getClients()
  const active = all.filter((c) => c.status === "active")
  const totalAUM = all.reduce((sum, c) => sum + c.aum, 0)
  return {
    total: all.length,
    active: active.length,
    prospects: all.filter((c) => c.status === "prospect").length,
    inactive: all.filter((c) => c.status === "inactive").length,
    totalAUM,
    avgAUM: all.length > 0 ? totalAUM / all.length : 0,
  }
}
