"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, desc, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { exchangeRates } from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { z } from "zod"

// ============================================================================
// Exchange Rate Server Actions
// ============================================================================

const createExchangeRateSchema = z.object({
  fromCurrency: z.string().min(3).max(3).toUpperCase(),
  toCurrency: z.string().min(3).max(3).toUpperCase(),
  rate: z.number().positive("Exchange rate must be positive"),
  effectiveDate: z.string().or(z.date()),
})

/**
 * List all exchange rates for the org.
 */
export async function getExchangeRates() {
  const session = await requireRole("assistant")

  const rates = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.orgId, session.orgId!))
    .orderBy(desc(exchangeRates.effectiveDate))

  return rates
}

/**
 * Add a new exchange rate entry.
 */
export async function createExchangeRate(input: unknown) {
  const session = await requireRole("admin")
  const parsed = createExchangeRateSchema.parse(input)

  if (parsed.fromCurrency === parsed.toCurrency) {
    throw new Error("From and To currencies must be different")
  }

  const [created] = await db
    .insert(exchangeRates)
    .values({
      orgId: session.orgId!,
      fromCurrency: parsed.fromCurrency.toUpperCase(),
      toCurrency: parsed.toCurrency.toUpperCase(),
      rate: String(parsed.rate),
      effectiveDate: new Date(parsed.effectiveDate),
      source: "manual",
      createdBy: session.userId,
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "created",
    targetType: "org",
    targetId: created.id,
    metadata: {
      type: "exchange_rate",
      fromCurrency: parsed.fromCurrency,
      toCurrency: parsed.toCurrency,
      rate: parsed.rate,
    },
  })

  captureServerEvent(session.userId, "exchange_rate.updated", { from_currency: parsed.fromCurrency, to_currency: parsed.toCurrency })

  return created
}

/**
 * Delete an exchange rate entry.
 */
export async function deleteExchangeRate(id: string) {
  const session = await requireRole("admin")

  const [deleted] = await db
    .delete(exchangeRates)
    .where(
      and(eq(exchangeRates.id, id), eq(exchangeRates.orgId, session.orgId!))
    )
    .returning()

  if (!deleted) {
    throw new Error("Exchange rate not found")
  }

  return deleted
}
