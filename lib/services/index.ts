// ─────────────────────────────────────────────────────────────────────────────
// SERVICES — Barrel Export
// ─────────────────────────────────────────────────────────────────────────────
// All services are "use server" functions backed by Drizzle ORM queries.
// Services that have no DB table (alerts, beneficiaries, transfers) use
// static seed data defined inline.
// ─────────────────────────────────────────────────────────────────────────────

export * from "./dashboard.service"
export * from "./clients.service"
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
