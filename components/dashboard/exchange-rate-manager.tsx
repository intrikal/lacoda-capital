"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getExchangeRates,
  createExchangeRate,
  deleteExchangeRate,
} from "@/lib/actions/exchange-rate.actions"
import type { ExchangeRate } from "@/app/db/schema"

// ============================================================================
// Exchange Rate Manager — Settings page component
// ============================================================================

export function ExchangeRateManager() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fromCurrency, setFromCurrency] = useState("")
  const [toCurrency, setToCurrency] = useState("")
  const [rate, setRate] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getExchangeRates()
      setRates(data)
    } catch {
      setError("Failed to load exchange rates")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const handleAdd = async () => {
    setSaving(true)
    setError(null)
    try {
      const rateNum = parseFloat(rate)
      if (isNaN(rateNum) || rateNum <= 0) {
        setError("Rate must be a positive number")
        return
      }
      if (rateNum === 0) {
        setError("Rate cannot be zero (division by zero)")
        return
      }

      await createExchangeRate({
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate: rateNum,
        effectiveDate,
      })

      setFromCurrency("")
      setToCurrency("")
      setRate("")
      setShowForm(false)
      await loadRates()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rate")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExchangeRate(id)
      await loadRates()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rate")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            Exchange Rates
          </h3>
          <p className="text-sm text-zinc-400">
            Add exchange rates for multi-currency portfolio consolidation.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add Rate"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {showForm && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From Currency</Label>
              <Input
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                placeholder="EUR"
                maxLength={3}
                className="mt-1 uppercase"
              />
            </div>
            <div>
              <Label>To Currency</Label>
              <Input
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                placeholder="USD"
                maxLength={3}
                className="mt-1 uppercase"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="1.0850"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving || !fromCurrency || !toCurrency || !rate}>
            {saving ? "Saving..." : "Add Exchange Rate"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-zinc-800" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4 text-center">
          No exchange rates configured. Add one to enable multi-currency consolidation.
        </p>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-2 text-left text-zinc-400 font-medium">Pair</th>
                <th className="px-4 py-2 text-right text-zinc-400 font-medium">Rate</th>
                <th className="px-4 py-2 text-right text-zinc-400 font-medium">Effective Date</th>
                <th className="px-4 py-2 text-right text-zinc-400 font-medium">Source</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-2 font-mono text-zinc-200">
                    {r.fromCurrency}/{r.toCurrency}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-300 font-mono">
                    {parseFloat(r.rate).toFixed(4)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">
                    {new Date(r.effectiveDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500 capitalize">
                    {r.source}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
