"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getBillingRecords } from "@/lib/actions/billing-record.actions"
import type { BillingRecordItem } from "@/lib/types"

export interface BillingStats {
  ytdFeesPaid: number
  nextPaymentAmount: number
  nextPaymentDue: string | null
  effectiveRate: number
  annualRate: number
}

export interface ClientBillingRecord {
  id: string
  period: string
  amount: number
  aum: number
  status: "paid" | "upcoming" | "due"
  dueDate: string
  paidDate?: string
  effectiveRate: number
}

interface UseClientBillingReturn {
  billingHistory: ClientBillingRecord[]
  stats: BillingStats
  isLoading: boolean
}

const EMPTY_STATS: BillingStats = {
  ytdFeesPaid: 0,
  nextPaymentAmount: 0,
  nextPaymentDue: null,
  effectiveRate: 0.0085,
  annualRate: 0.034,
}

export function useClientBilling(): UseClientBillingReturn {
  const [items, setItems] = useState<BillingRecordItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getBillingRecords()
      setItems(result.items)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const billingHistory = useMemo<ClientBillingRecord[]>(
    () =>
      items.map((r) => ({
        id: r.id,
        period: r.period,
        amount: r.amount,
        aum: r.aum,
        status: r.status,
        dueDate: r.dueDate,
        paidDate: r.paidDate ?? undefined,
        effectiveRate: r.effectiveRate,
      })),
    [items]
  )

  const stats = useMemo<BillingStats>(() => {
    if (items.length === 0) return EMPTY_STATS
    const currentYear = new Date().getFullYear().toString()
    const ytdPaid = items
      .filter((r) => r.status === "paid" && r.paidDate?.startsWith(currentYear))
      .reduce((sum, r) => sum + r.amount, 0)
    const upcoming = items.find((r) => r.status === "upcoming" || r.status === "due")
    const effectiveRate = items[0]?.effectiveRate ?? 0.0085
    return {
      ytdFeesPaid: ytdPaid,
      nextPaymentAmount: upcoming?.amount ?? 0,
      nextPaymentDue: upcoming?.dueDate ?? null,
      effectiveRate,
      annualRate: effectiveRate * 4,
    }
  }, [items])

  return { billingHistory, stats, isLoading }
}
