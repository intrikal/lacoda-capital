/**
 * Server-side PostHog tracking.
 *
 * Used in server actions to capture events that happen entirely server-side.
 * Identifies by org_id + user_id only — NO PII.
 */

import { PostHog } from "posthog-node"

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (client) return client

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  })

  return client
}

export function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const ph = getClient()
  if (!ph) return

  ph.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      $lib: "posthog-node",
    },
  })
}

export async function shutdownPostHog() {
  if (client) {
    await client.shutdown()
    client = null
  }
}
