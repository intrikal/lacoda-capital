import { createHash, randomBytes } from "crypto"

/**
 * API key utilities.
 *
 * Key format: lch_<32 random hex chars> (total 36 chars)
 * Storage: only SHA-256 hash stored in DB; raw key shown once at creation.
 */

const KEY_PREFIX = "lch_"

/**
 * Generate a new API key and its hash.
 * Returns both the raw key (to display once) and the hash (to store).
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const random = randomBytes(32).toString("hex")
  const rawKey = `${KEY_PREFIX}${random}`
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = rawKey.slice(0, 12) // "lch_" + first 8 hex chars

  return { rawKey, keyHash, keyPrefix }
}

/**
 * Hash an API key using SHA-256.
 * Used both at creation time and at verification time.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex")
}

/**
 * Validate API key format.
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length === 68 // "lch_" + 64 hex chars
}

/**
 * Sanitize API key name — strip control characters, limit length.
 */
export function sanitizeKeyName(name: string): string {
  return name
    .replace(/[^\w\s\-_.]/g, "")
    .trim()
    .slice(0, 100)
}
