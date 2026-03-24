import { randomBytes } from "crypto"

/**
 * Stakeholder portal token utilities.
 *
 * Tokens are 64-char hex strings (32 random bytes) — non-guessable.
 * Used in portal URLs: /portal/{token}
 */

/**
 * Generate a unique, non-guessable portal token.
 */
export function generatePortalToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Validate token format (64 hex chars).
 */
export function isValidPortalToken(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token)
}
