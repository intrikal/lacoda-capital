"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getIntegrations,
  getAvailableProviders,
  disconnectIntegration,
  deleteIntegration,
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  refreshPlaidBalances,
  connectStripeIntegration,
  getDocuSignAuthUrl,
  getGoogleDriveAuthUrl,
  getQuickBooksAuthUrl,
  getSalesforceAuthUrl,
  getDropboxAuthUrl,
  getGoogleCalendarAuthUrl,
} from "@/lib/actions/integration.actions"
import type { IntegrationRecord } from "@/lib/actions/integration.actions"

export type { IntegrationRecord }

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProviderStatus {
  configured: boolean
  connected: boolean
}

export interface IntegrationStats {
  total: number
  connected: number
  disconnected: number
  error: number
}

// ─── List Hook ──────────────────────────────────────────────────────────────

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([])
  const [providers, setProviders] = useState<Record<string, ProviderStatus>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [integrationsData, providersData] = await Promise.all([
        getIntegrations(),
        getAvailableProviders(),
      ])
      setIntegrations(integrationsData)
      setProviders(providersData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load integrations"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats: IntegrationStats = useMemo(() => {
    const connected = integrations.filter((i) => i.status === "connected").length
    const disconnected = integrations.filter((i) => i.status === "disconnected").length
    const errorCount = integrations.filter((i) => i.status === "error").length
    return { total: integrations.length, connected, disconnected, error: errorCount }
  }, [integrations])

  return { integrations, providers, isLoading, error, stats, refetch: load }
}

// ─── Disconnect Hook ────────────────────────────────────────────────────────

export function useDisconnectIntegration() {
  const [isPending, startTransition] = useTransition()

  const mutate = (
    id: string,
    options?: { onSuccess?: () => void; onError?: (e: Error) => void },
  ) => {
    startTransition(async () => {
      try {
        await disconnectIntegration(id)
        options?.onSuccess?.()
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("Disconnect failed"))
      }
    })
  }

  return { mutate, isPending }
}

// ─── Delete Hook ────────────────────────────────────────────────────────────

export function useDeleteIntegration() {
  const [isPending, startTransition] = useTransition()

  const mutate = (
    id: string,
    options?: { onSuccess?: () => void; onError?: (e: Error) => void },
  ) => {
    startTransition(async () => {
      try {
        await deleteIntegration(id)
        options?.onSuccess?.()
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("Delete failed"))
      }
    })
  }

  return { mutate, isPending }
}

// ─── Plaid Connect Hook ────────────────────────────────────────────────────

export function usePlaidConnect() {
  const [isPending, startTransition] = useTransition()

  const connect = (options?: {
    onLinkToken?: (token: string) => void
    onSuccess?: (result: { integrationId: string; itemId: string }) => void
    onError?: (e: Error) => void
  }) => {
    startTransition(async () => {
      try {
        const linkToken = await createPlaidLinkToken()
        options?.onLinkToken?.(linkToken)
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("Plaid Link failed"))
      }
    })
  }

  const exchangeToken = (
    publicToken: string,
    options?: {
      onSuccess?: (result: { integrationId: string; itemId: string }) => void
      onError?: (e: Error) => void
    },
  ) => {
    startTransition(async () => {
      try {
        const result = await exchangePlaidPublicToken(publicToken)
        options?.onSuccess?.(result)
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("Token exchange failed"))
      }
    })
  }

  return { connect, exchangeToken, isPending }
}

// ─── Plaid Refresh Hook ────────────────────────────────────────────────────

export function usePlaidRefresh() {
  const [isPending, startTransition] = useTransition()

  const refresh = (
    integrationId: string,
    options?: {
      onSuccess?: (accounts: { name: string; balance: number | null }[]) => void
      onError?: (e: Error) => void
    },
  ) => {
    startTransition(async () => {
      try {
        const result = await refreshPlaidBalances(integrationId)
        options?.onSuccess?.(result.accounts)
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("Refresh failed"))
      }
    })
  }

  return { refresh, isPending }
}

// ─── Stripe Connect Hook ───────────────────────────────────────────────────

export function useStripeConnect() {
  const [isPending, startTransition] = useTransition()

  const connect = (options?: {
    onSuccess?: (integrationId: string) => void
    onError?: (e: Error) => void
  }) => {
    startTransition(async () => {
      try {
        const id = await connectStripeIntegration()
        options?.onSuccess?.(id)
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("Stripe connect failed"))
      }
    })
  }

  return { connect, isPending }
}

// ─── OAuth Connect Hook (DocuSign, Google Drive, QuickBooks) ────────────────

export function useOAuthConnect() {
  const [isPending, startTransition] = useTransition()

  const connect = (
    provider: "docusign" | "google_drive" | "google_calendar" | "quickbooks" | "salesforce" | "dropbox",
    options?: { onError?: (e: Error) => void },
  ) => {
    startTransition(async () => {
      try {
        let url: string
        switch (provider) {
          case "docusign":
            url = await getDocuSignAuthUrl()
            break
          case "google_drive":
            url = await getGoogleDriveAuthUrl()
            break
          case "google_calendar":
            url = await getGoogleCalendarAuthUrl()
            break
          case "quickbooks":
            url = await getQuickBooksAuthUrl()
            break
          case "salesforce":
            url = await getSalesforceAuthUrl()
            break
          case "dropbox":
            url = await getDropboxAuthUrl()
            break
        }
        // Redirect to OAuth provider
        window.location.href = url
      } catch (e) {
        options?.onError?.(e instanceof Error ? e : new Error("OAuth connect failed"))
      }
    })
  }

  return { connect, isPending }
}
