// ─────────────────────────────────────────────────────────────────────────────
// SERVICES — Barrel Export
// ─────────────────────────────────────────────────────────────────────────────
// All services return hardcoded mock data right now.
//
// When you're ready to connect real data, update the implementation inside
// each service file.  Function signatures stay the same — only the body changes.
//
// Example swap (clients.service.ts):
//
//   // BEFORE (mock):
//   export async function getClients() {
//     return mockClients
//   }
//
//   // AFTER (Drizzle + Supabase server action):
//   export async function getClients() {
//     "use server"
//     return db.query.clients.findMany()
//   }
//
//   // AFTER (tRPC procedure — put in your router):
//   getClients: publicProcedure.query(() => db.query.clients.findMany()),
//
// ─────────────────────────────────────────────────────────────────────────────

export * from "./dashboard.service"
export * from "./clients.service"
export * from "./assets.service"
export * from "./pipeline.service"
export * from "./documents.service"
export * from "./reports.service"
export * from "./tasks.service"
export * from "./alerts.service"
export * from "./ledger.service"
export * from "./compliance.service"
export * from "./users.service"
export * from "./calendar.service"
export * from "./messages.service"
export * from "./goals.service"
export * from "./portfolio.service"
export * from "./transfers.service"
export * from "./beneficiaries.service"
export * from "./billing.service"
