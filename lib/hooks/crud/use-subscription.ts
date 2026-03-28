/**
 * React hook for subscription and billing data.
 *
 * Wraps the subscription server actions with React state management.
 * Used by /app/settings/billing and the usage limit banner.
 */

"use client"

import * as React from "react"
import {
  getBillingOverview,
  getInvoices,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  resumeSubscription,
  type BillingOverview,
  type InvoiceItem,
} from "@/lib/actions/subscription.actions"
import type { BillingInterval } from "@/lib/stripe/plan-limits"

export function useSubscription() {
  const [overview, setOverview] = React.useState<BillingOverview | null>(null)
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [billingData, invoiceData] = await Promise.all([
        getBillingOverview(),
        getInvoices(),
      ])
      setOverview(billingData)
      setInvoices(invoiceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const checkout = React.useCallback(
    async (plan: "starter" | "professional", interval: BillingInterval) => {
      const { url } = await createCheckoutSession({ plan, interval })
      window.location.href = url
    },
    []
  )

  const openBillingPortal = React.useCallback(async () => {
    const { url } = await createBillingPortalSession()
    window.location.href = url
  }, [])

  const cancel = React.useCallback(async () => {
    await cancelSubscription()
    await fetchData()
  }, [fetchData])

  const resume = React.useCallback(async () => {
    await resumeSubscription()
    await fetchData()
  }, [fetchData])

  return {
    overview,
    invoices,
    isLoading,
    error,
    refetch: fetchData,
    checkout,
    openBillingPortal,
    cancel,
    resume,
  }
}
