/**
 * PostHog server-side event capture.
 *
 * Use captureServerEvent() from server actions to record writes.
 * Fire-and-forget — never throws, never blocks the calling action.
 *
 * PII rules: only IDs, types, categories. NEVER names, amounts, or emails.
 */

import { PostHog } from "posthog-node"

let _posthog: PostHog | null = null

function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  if (!_posthog) {
    _posthog = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _posthog
}

export function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    const ph = getPostHog()
    if (!ph) return
    ph.capture({ distinctId: userId, event, properties: properties ?? {} })
  } catch {
    // Never throw from analytics
  }
}
