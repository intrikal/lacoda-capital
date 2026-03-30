/**
 * API Rate Limiter — sliding window with configurable limits per action.
 *
 * Default: 100 requests/minute per key.
 * Auth presets: login (5/email/15min), signup (3/IP/hour), forgot-password (3/email/hour).
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

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,    // 1 minute
  maxRequests: 100,
}

// ─── Auth rate-limit presets ─────────────────────────────────────────────────

export const AUTH_RATE_LIMITS = {
  login:           { windowMs: 15 * 60_000, maxRequests: 5 },  // 5 per email per 15 min
  signup:          { windowMs: 60 * 60_000, maxRequests: 3 },  // 3 per IP per hour
  forgotPassword:  { windowMs: 60 * 60_000, maxRequests: 3 },  // 3 per email per hour
} as const satisfies Record<string, RateLimitConfig>

// ─── In-memory fallback ──────────────────────────────────────────────────────

interface WindowEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, WindowEntry>()

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxRequests - 1, limit: config.maxRequests, resetAt }
  }

  entry.count++
  const remaining = Math.max(0, config.maxRequests - entry.count)
  const allowed = entry.count <= config.maxRequests

  return { allowed, remaining, limit: config.maxRequests, resetAt: entry.resetAt }
}

// ─── Upstash Redis rate limiter ──────────────────────────────────────────────

async function upstashRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return memoryRateLimit(key, config)

  const now = Date.now()
  const windowKey = `rl:${key}:${Math.floor(now / config.windowMs)}`
  const resetAt = (Math.floor(now / config.windowMs) + 1) * config.windowMs

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", windowKey],
        ["PEXPIRE", windowKey, String(config.windowMs)],
      ]),
    })

    const results = await response.json() as Array<{ result: number }>
    const count = results[0]?.result ?? 1
    const remaining = Math.max(0, config.maxRequests - count)
    const allowed = count <= config.maxRequests

    return { allowed, remaining, limit: config.maxRequests, resetAt }
  } catch {
    return memoryRateLimit(key, config)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check rate limit for the given key identifier.
 * Optionally pass a config to override the default window/limit.
 */
export async function checkRateLimit(
  keyId: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return upstashRateLimit(keyId, config)
  }
  return memoryRateLimit(keyId, config)
}

/**
 * Export for testing — reset the in-memory store.
 */
export function _resetMemoryStore() {
  memoryStore.clear()
}
