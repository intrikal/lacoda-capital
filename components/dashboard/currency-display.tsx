"use client"

// ============================================================================
// Currency Display — Shows original currency + converted amount
// ============================================================================

interface CurrencyDisplayProps {
  /** Original amount in the asset's native currency */
  originalAmount: number
  /** Asset's native currency code (e.g. "EUR") */
  originalCurrency: string
  /** Converted amount in org currency (null if no rate available) */
  convertedAmount?: number | null
  /** Org's base currency code (e.g. "USD") */
  orgCurrency?: string
  /** Whether conversion failed */
  conversionWarning?: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CurrencyDisplay({
  originalAmount,
  originalCurrency,
  convertedAmount,
  orgCurrency = "USD",
  conversionWarning,
}: CurrencyDisplayProps) {
  const isSameCurrency =
    originalCurrency.toUpperCase() === orgCurrency.toUpperCase()

  if (isSameCurrency) {
    return (
      <span className="text-sm font-medium text-zinc-100 tabular-nums">
        {formatCurrency(originalAmount, originalCurrency)}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end">
      {convertedAmount != null ? (
        <>
          <span className="text-sm font-medium text-zinc-100 tabular-nums">
            {formatCurrency(convertedAmount, orgCurrency)}
          </span>
          <span className="text-xs text-zinc-500 tabular-nums">
            {formatCurrency(originalAmount, originalCurrency)}
          </span>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-zinc-100 tabular-nums">
            {formatCurrency(originalAmount, originalCurrency)}
          </span>
          {conversionWarning ? (
            <span className="text-xs text-amber-500" title={conversionWarning}>
              Rate not available
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}
