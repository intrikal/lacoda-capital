"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

/**
 * Initialize PostHog on the client side.
 * - Only initializes if NEXT_PUBLIC_POSTHOG_KEY is set
 * - Does NOT capture on /demo/* routes (opt-out for demo mode)
 * - Identifies by org_id + user_id only — NO PII
 */
function initPostHog() {
  if (typeof window === "undefined") return
  if (posthog.__loaded) return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false, // We capture manually to exclude demo routes
    capture_pageleave: true,
    persistence: "localStorage",
    autocapture: false,
  })
}

/**
 * Track page views manually, excluding /demo/* routes.
 */
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return
    if (pathname.startsWith("/demo")) return // No tracking on demo routes

    const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")
    ph.capture("$pageview", { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

/**
 * PostHog provider wrapper.
 * Safe to render even without POSTHOG_KEY — it just does nothing.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
