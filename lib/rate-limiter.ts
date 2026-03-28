/**
 * API Rate Limiter — sliding window, 100 requests/minute per key.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured.
 * Falls back to an in-memory Map for development.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number // Unix timestamp when the window resets
}

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 100

// ─── In-memory fallback ──────────────────────────────────────────────────────

interface WindowEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, WindowEntry>()

function memoryRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now >= entry.resetAt) {
    // New window
    const resetAt = now + WINDOW_MS
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: MAX_REQUESTS - 1, limit: MAX_REQUESTS, resetAt }
  }

  entry.count++
  const remaining = Math.max(0, MAX_REQUESTS - entry.count)
  const allowed = entry.count <= MAX_REQUESTS

  return { allowed, remaining, limit: MAX_REQUESTS, resetAt: entry.resetAt }
}

// ─── Upstash Redis rate limiter ──────────────────────────────────────────────

async function upstashRateLimit(key: string): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return memoryRateLimit(key)

  const now = Date.now()
  const windowKey = `rl:${key}:${Math.floor(now / WINDOW_MS)}`
  const resetAt = (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS

  try {
    // INCR + EXPIRE in a pipeline
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", windowKey],
        ["PEXPIRE", windowKey, String(WINDOW_MS)],
      ]),
    })

    const results = await response.json() as Array<{ result: number }>
    const count = results[0]?.result ?? 1
    const remaining = Math.max(0, MAX_REQUESTS - count)
    const allowed = count <= MAX_REQUESTS

    return { allowed, remaining, limit: MAX_REQUESTS, resetAt }
  } catch {
    // Redis unavailable — fall back to memory
    return memoryRateLimit(key)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check rate limit for the given key identifier.
 * Returns whether the request is allowed and remaining quota.
 */
export async function checkRateLimit(keyId: string): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return upstashRateLimit(keyId)
  }
  return memoryRateLimit(keyId)
}

/**
 * Export for testing — reset the in-memory store.
 */
export function _resetMemoryStore() {
  memoryStore.clear()
}
