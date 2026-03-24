// ============================================================================
// Currency Conversion
// ============================================================================
//
// convertToOrgCurrency: Convert an amount from one currency to another
// using manually-entered exchange rates stored in the exchange_rates table.
//
// Falls back to nearest available rate if exact date match not found.
// Returns null if no rate is available at all.
// ============================================================================

import { db } from "@/app/db"
import { exchangeRates } from "@/app/db/schema"
import { and, eq, lte, desc, or } from "drizzle-orm"

export interface ConversionResult {
  convertedAmount: number
  rate: number
  rateDate: Date
  fromCurrency: string
  toCurrency: string
}

export interface ConversionError {
  error: string
  code: "SAME_CURRENCY" | "ZERO_RATE" | "RATE_NOT_FOUND"
}

export type ConversionResponse = ConversionResult | ConversionError;

function isError(r: ConversionResponse): r is ConversionError {
  return "error" in r;
}

export { isError as isConversionError };

/**
 * Convert an amount from one currency to the organization's currency.
 *
 * Looks up the exchange rate for the given date. If no exact match,
 * uses the most recent rate on or before that date.
 *
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency (ISO 4217, e.g. "EUR")
 * @param toCurrency - Target currency (ISO 4217, e.g. "USD")
 * @param date - The effective date for the rate lookup
 */
export async function convertToOrgCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: Date = new Date()
): Promise<ConversionResponse> {
  // Same currency — no conversion needed
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return {
      convertedAmount: amount,
      rate: 1,
      rateDate: date,
      fromCurrency,
      toCurrency,
    }
  }

  // Look up rate: try direct pair, then inverse
  const rate = await findRate(fromCurrency, toCurrency, date)

  if (rate === null) {
    return {
      error: `No exchange rate found for ${fromCurrency}/${toCurrency}`,
      code: "RATE_NOT_FOUND",
    }
  }

  if (rate.rate === 0) {
    return {
      error: "Exchange rate of 0 is invalid (division by zero)",
      code: "ZERO_RATE",
    }
  }

  return {
    convertedAmount: amount * rate.rate,
    rate: rate.rate,
    rateDate: rate.effectiveDate,
    fromCurrency,
    toCurrency,
  }
}

interface RateResult {
  rate: number
  effectiveDate: Date
}

async function findRate(
  from: string,
  to: string,
  date: Date
): Promise<RateResult | null> {
  const fromUpper = from.toUpperCase()
  const toUpper = to.toUpperCase()

  // Try direct: from → to
  const direct = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, fromUpper),
        eq(exchangeRates.toCurrency, toUpper),
        lte(exchangeRates.effectiveDate, date)
      )
    )
    .orderBy(desc(exchangeRates.effectiveDate))
    .limit(1)

  if (direct.length > 0) {
    return {
      rate: parseFloat(direct[0].rate),
      effectiveDate: direct[0].effectiveDate,
    }
  }

  // Try inverse: to → from, then invert
  const inverse = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, toUpper),
        eq(exchangeRates.toCurrency, fromUpper),
        lte(exchangeRates.effectiveDate, date)
      )
    )
    .orderBy(desc(exchangeRates.effectiveDate))
    .limit(1)

  if (inverse.length > 0) {
    const inverseRate = parseFloat(inverse[0].rate)
    if (inverseRate === 0) return null
    return {
      rate: 1 / inverseRate,
      effectiveDate: inverse[0].effectiveDate,
    }
  }

  return null
}

// ─── Pure conversion (no DB, for testing) ───────────────────────────────────

/**
 * Pure conversion function that takes a rate directly.
 * Used for testing and batch conversions where rates are pre-fetched.
 */
export function convertAmount(
  amount: number,
  rate: number
): number {
  if (rate === 0) throw new Error("Exchange rate cannot be zero")
  return amount * rate
}
