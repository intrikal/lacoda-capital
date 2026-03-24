/**
 * API Key Hash Tests
 *
 * Tests that:
 * - Generated keys match the expected format
 * - Raw key cannot be recovered from stored hash
 * - Hash is deterministic for the same key
 * - Key format validation works
 */

import { describe, it, expect } from "vitest"
import {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat,
  sanitizeKeyName,
} from "@/lib/api-key"

describe("API key generation", () => {
  it("generates a key starting with lch_", () => {
    const { rawKey } = generateApiKey()
    expect(rawKey.startsWith("lch_")).toBe(true)
  })

  it("generates a key of correct length (68 chars)", () => {
    const { rawKey } = generateApiKey()
    expect(rawKey.length).toBe(68) // "lch_" + 64 hex chars
  })

  it("generates unique keys on each call", () => {
    const key1 = generateApiKey()
    const key2 = generateApiKey()
    expect(key1.rawKey).not.toBe(key2.rawKey)
    expect(key1.keyHash).not.toBe(key2.keyHash)
  })

  it("returns a keyPrefix of 12 chars", () => {
    const { keyPrefix } = generateApiKey()
    expect(keyPrefix.length).toBe(12) // "lch_" + 8 hex chars
    expect(keyPrefix.startsWith("lch_")).toBe(true)
  })

  it("returns a keyHash that is a valid SHA-256 hex string", () => {
    const { keyHash } = generateApiKey()
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("API key hash — raw key cannot be recovered", () => {
  it("hash is deterministic for the same key", () => {
    const key = "lch_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    const hash1 = hashApiKey(key)
    const hash2 = hashApiKey(key)
    expect(hash1).toBe(hash2)
  })

  it("hash does not contain the raw key", () => {
    const { rawKey, keyHash } = generateApiKey()
    // The hash should not contain any substring of the raw key beyond 4 chars
    const rawHex = rawKey.slice(4) // Remove "lch_" prefix
    expect(keyHash).not.toContain(rawHex)
  })

  it("different keys produce different hashes", () => {
    const key1 = "lch_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    const key2 = "lch_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    expect(hashApiKey(key1)).not.toBe(hashApiKey(key2))
  })
})

describe("API key format validation", () => {
  it("accepts valid key format", () => {
    const { rawKey } = generateApiKey()
    expect(isValidApiKeyFormat(rawKey)).toBe(true)
  })

  it("rejects key without lch_ prefix", () => {
    expect(isValidApiKeyFormat("abc_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")).toBe(false)
  })

  it("rejects key that is too short", () => {
    expect(isValidApiKeyFormat("lch_short")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isValidApiKeyFormat("")).toBe(false)
  })
})

describe("API key name sanitization", () => {
  it("strips control characters", () => {
    expect(sanitizeKeyName("Production\x00Key")).toBe("ProductionKey")
  })

  it("allows hyphens, underscores, dots", () => {
    expect(sanitizeKeyName("my-key_v1.0")).toBe("my-key_v1.0")
  })

  it("trims whitespace", () => {
    expect(sanitizeKeyName("  My Key  ")).toBe("My Key")
  })

  it("limits to 100 characters", () => {
    const longName = "a".repeat(200)
    expect(sanitizeKeyName(longName).length).toBe(100)
  })

  it("strips special characters", () => {
    expect(sanitizeKeyName('Key<script>alert("xss")</script>')).toBe("Keyscriptalertxssscript")
  })
})
