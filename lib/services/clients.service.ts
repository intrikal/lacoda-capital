// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockClients } from "@/lib/mock/data"
import type { Client } from "@/lib/mock/types"

export async function getClients(): Promise<Client[]> {
  // REAL: return db.query.clients.findMany({ orderBy: asc(clients.name) })
  return mockClients
}

export async function getClientById(id: string): Promise<Client | undefined> {
  // REAL: return db.query.clients.findFirst({ where: eq(clients.id, id) })
  return mockClients.find((c) => c.id === id)
}

export async function getActiveClients(): Promise<Client[]> {
  // REAL: return db.query.clients.findMany({ where: eq(clients.status, "active") })
  return mockClients.filter((c) => c.status === "active")
}

export async function getClientStats() {
  const all = mockClients
  const active = all.filter((c) => c.status === "active")
  const totalAUM = all.reduce((sum, c) => sum + c.aum, 0)
  // REAL: use SQL aggregates — COUNT(*), SUM(aum), etc.
  return {
    total: all.length,
    active: active.length,
    prospects: all.filter((c) => c.status === "prospect").length,
    inactive: all.filter((c) => c.status === "inactive").length,
    totalAUM,
    avgAUM: totalAUM / all.length,
  }
}
