/**
 * API Rate Limiter Tests
 *
 * Tests the in-memory rate limiter with both default and custom configs:
 * - Default: 100 requests/minute
 * - Auth presets: login (5/15min), signup (3/hour), forgot-password (3/hour)
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  checkRateLimit,
  _resetMemoryStore,
  AUTH_RATE_LIMITS,
} from "@/lib/rate-limiter"

beforeEach(() => {
  _resetMemoryStore()
})

describe("rate limiter (default config)", () => {
  it("allows the first request", async () => {
    const result = await checkRateLimit("key-1")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
    expect(result.limit).toBe(100)
  })

  it("allows request #100 (at the limit boundary)", async () => {
    for (let i = 0; i < 99; i++) {
      await checkRateLimit("key-boundary")
    }
    const result = await checkRateLimit("key-boundary")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it("blocks request #101 in a 1-minute window", async () => {
    for (let i = 0; i < 100; i++) {
      await checkRateLimit("key-block")
    }
    const result = await checkRateLimit("key-block")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("tracks independent limits for different keys", async () => {
    for (let i = 0; i < 100; i++) {
      await checkRateLimit("key-a")
    }

    const resultB = await checkRateLimit("key-b")
    expect(resultB.allowed).toBe(true)
    expect(resultB.remaining).toBe(99)

    const resultA = await checkRateLimit("key-a")
    expect(resultA.allowed).toBe(false)
  })

  it("returns correct remaining count", async () => {
    for (let i = 0; i < 50; i++) {
      await checkRateLimit("key-count")
    }
    const result = await checkRateLimit("key-count")
    expect(result.remaining).toBe(49) // 100 - 51
  })

  it("includes resetAt timestamp in result", async () => {
    const result = await checkRateLimit("key-reset")
    expect(result.resetAt).toBeGreaterThan(Date.now())
    expect(result.resetAt - Date.now()).toBeLessThanOrEqual(60_001)
  })
})

describe("rate limiter — login preset (5 per 15 min)", () => {
  const config = AUTH_RATE_LIMITS.login

  it("allows 5 login attempts", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit("login:user@test.com", config)
      expect(r.allowed).toBe(true)
    }
  })

  it("blocks the 6th login attempt", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("login:user@test.com", config)
    }
    const result = await checkRateLimit("login:user@test.com", config)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.limit).toBe(5)
  })

  it("uses a 15-minute window", async () => {
    const result = await checkRateLimit("login:window@test.com", config)
    expect(result.resetAt - Date.now()).toBeLessThanOrEqual(15 * 60_000 + 1)
  })

  it("tracks different emails independently", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("login:a@test.com", config)
    }
    const blocked = await checkRateLimit("login:a@test.com", config)
    expect(blocked.allowed).toBe(false)

    const other = await checkRateLimit("login:b@test.com", config)
    expect(other.allowed).toBe(true)
    expect(other.remaining).toBe(4)
  })
})

describe("rate limiter — signup preset (3 per hour)", () => {
  const config = AUTH_RATE_LIMITS.signup

  it("allows 3 signups from the same IP", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit("signup:1.2.3.4", config)
      expect(r.allowed).toBe(true)
    }
  })

  it("blocks the 4th signup from the same IP", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("signup:1.2.3.4", config)
    }
    const result = await checkRateLimit("signup:1.2.3.4", config)
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(3)
  })

  it("uses a 1-hour window", async () => {
    const result = await checkRateLimit("signup:5.6.7.8", config)
    expect(result.resetAt - Date.now()).toBeLessThanOrEqual(60 * 60_000 + 1)
  })
})

describe("rate limiter — forgot-password preset (3 per hour)", () => {
  const config = AUTH_RATE_LIMITS.forgotPassword

  it("allows 3 reset requests per email", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit("forgot:user@test.com", config)
      expect(r.allowed).toBe(true)
    }
  })

  it("blocks the 4th reset request", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("forgot:user@test.com", config)
    }
    const result = await checkRateLimit("forgot:user@test.com", config)
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(3)
  })
})
