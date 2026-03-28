/**
 * API Rate Limiter Tests
 *
 * Tests the in-memory rate limiter:
 * - Request #100 succeeds (at limit boundary)
 * - Request #101 is blocked
 * - Different keys have independent limits
 */

import { describe, it, expect, beforeEach } from "vitest"
import { checkRateLimit, _resetMemoryStore } from "@/lib/rate-limiter"

beforeEach(() => {
  _resetMemoryStore()
})

describe("rate limiter", () => {
  it("allows the first request", async () => {
    const result = await checkRateLimit("key-1")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
    expect(result.limit).toBe(100)
  })

  it("allows request #100 (at the limit boundary)", async () => {
    // Make 99 requests
    for (let i = 0; i < 99; i++) {
      await checkRateLimit("key-boundary")
    }
    // The 100th request should still succeed
    const result = await checkRateLimit("key-boundary")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it("blocks request #101 in a 1-minute window", async () => {
    // Make 100 requests (exhausts the limit)
    for (let i = 0; i < 100; i++) {
      await checkRateLimit("key-block")
    }
    // The 101st request should be blocked
    const result = await checkRateLimit("key-block")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("tracks independent limits for different keys", async () => {
    // Exhaust key A
    for (let i = 0; i < 100; i++) {
      await checkRateLimit("key-a")
    }

    // Key B should still be available
    const resultB = await checkRateLimit("key-b")
    expect(resultB.allowed).toBe(true)
    expect(resultB.remaining).toBe(99)

    // Key A should be blocked
    const resultA = await checkRateLimit("key-a")
    expect(resultA.allowed).toBe(false)
  })

  it("returns correct remaining count", async () => {
    // Make 50 requests
    for (let i = 0; i < 50; i++) {
      await checkRateLimit("key-count")
    }
    const result = await checkRateLimit("key-count")
    expect(result.remaining).toBe(49) // 100 - 51
  })

  it("includes resetAt timestamp in result", async () => {
    const result = await checkRateLimit("key-reset")
    expect(result.resetAt).toBeGreaterThan(Date.now())
    // Reset should be within ~60 seconds
    expect(result.resetAt - Date.now()).toBeLessThanOrEqual(60_001)
  })
})
