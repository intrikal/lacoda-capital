/**
 * ============================================================================
 * TEST FILE: plaid-error-handling.test.ts
 * ============================================================================
 *
 * Kevin, this file tests how our app responds to every error code Plaid
 * can send us. Getting these mappings right is critical — if we show the
 * wrong status or message, advisors won't know what action to take.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHERE PLAID ERRORS COME FROM                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Two places:                                                             │
 * │                                                                         │
 * │ 1. API RESPONSES — When we call Plaid's API and something is wrong,    │
 * │    Plaid returns a non-200 HTTP response with a JSON body:             │
 * │    { error_type, error_code, error_message, display_message }          │
 * │                                                                         │
 * │ 2. WEBHOOKS — Plaid sends POST requests to our webhook URL when         │
 * │    something happens asynchronously (e.g. user's bank session          │
 * │    expires overnight). The webhook body includes an "error" field.     │
 * │                                                                         │
 * │ Both paths should result in the integration record being updated       │
 * │ with an appropriate status and statusMessage.                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PLAID ERROR TYPE TAXONOMY                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ ITEM_ERROR        — Problems with the bank connection itself            │
 * │   ITEM_LOGIN_REQUIRED    — User's bank login expired, needs re-auth    │
 * │   INVALID_CREDENTIALS    — Wrong username/password stored              │
 * │   INVALID_MFA            — MFA verification failed                     │
 * │   ITEM_LOCKED            — Too many failed attempts, account locked    │
 * │   ITEM_NOT_SUPPORTED     — Institution doesn't support requested data  │
 * │   USER_PERMISSION_REVOKED — User removed Plaid's access from their bank│
 * │                                                                         │
 * │ INSTITUTION_ERROR — Problems with the bank's systems                   │
 * │   INSTITUTION_NOT_RESPONDING  — Bank is down/slow                      │
 * │   INSTITUTION_NOT_AVAILABLE   — Bank temporarily offline               │
 * │   INSTITUTION_DOWN            — Extended outage                        │
 * │                                                                         │
 * │ RATE_LIMIT_EXCEEDED — We called Plaid too many times                   │
 * │                                                                         │
 * │ API_ERROR          — Plaid's internal error                            │
 * │   INTERNAL_SERVER_ERROR — Plaid had a bug                              │
 * │   PLANNED_MAINTENANCE   — Plaid is doing maintenance                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/plaid.ts            — plaidRequest() throws on errors
 *   app/api/webhooks/plaid/route.ts      — ITEM.ERROR webhook handler
 *   lib/actions/integration.actions.ts  — disconnectIntegration()
 */

import { describe, it, expect } from "vitest"

// ─── The error-handling logic we're testing ───────────────────────────────
//
// These pure functions translate Plaid error codes into our integration
// record fields. They should live in lib/integrations/plaid.ts or a
// dedicated lib/integrations/plaid-errors.ts.
//
// We define them here as the spec. When you extract them to source files,
// update this to import from the actual module.

type IntegrationStatus = "connected" | "disconnected" | "error" | "pending"

type PlaidErrorCode =
  // ITEM errors
  | "ITEM_LOGIN_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "INVALID_MFA"
  | "ITEM_LOCKED"
  | "ITEM_NOT_SUPPORTED"
  | "USER_PERMISSION_REVOKED"
  // INSTITUTION errors
  | "INSTITUTION_NOT_RESPONDING"
  | "INSTITUTION_NOT_AVAILABLE"
  | "INSTITUTION_DOWN"
  // RATE / API errors
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR"
  | "PLANNED_MAINTENANCE"

type PlaidErrorResult = {
  /** What to set on integration.status */
  status: IntegrationStatus
  /** Human-readable message for the UI */
  statusMessage: string
  /** Whether the user needs to take action (re-authenticate) */
  requiresUserAction: boolean
  /** Whether we should retry automatically */
  shouldRetry: boolean
}

/**
 * Map a Plaid error code to our integration update payload.
 * This is the central error-routing function.
 */
function mapPlaidErrorToIntegrationUpdate(errorCode: string): PlaidErrorResult {
  switch (errorCode) {
    // ── User must re-authenticate ──────────────────────────────────────────
    case "ITEM_LOGIN_REQUIRED":
      return {
        status: "error",
        statusMessage:
          "Your bank login has expired. Please reconnect to continue syncing your accounts.",
        requiresUserAction: true,
        shouldRetry: false,
      }

    case "INVALID_CREDENTIALS":
      return {
        status: "error",
        statusMessage:
          "Your bank login credentials are no longer valid. Please reconnect your account.",
        requiresUserAction: true,
        shouldRetry: false,
      }

    case "INVALID_MFA":
      return {
        status: "error",
        statusMessage:
          "Multi-factor authentication failed. Please reconnect and complete the verification step.",
        requiresUserAction: true,
        shouldRetry: false,
      }

    case "ITEM_LOCKED":
      return {
        status: "error",
        statusMessage:
          "Your bank account has been locked due to too many failed attempts. Please unlock it at your bank, then reconnect.",
        requiresUserAction: true,
        shouldRetry: false,
      }

    case "USER_PERMISSION_REVOKED":
      return {
        status: "disconnected",
        statusMessage:
          "Access was revoked at the bank. Reconnect to resume syncing.",
        requiresUserAction: true,
        shouldRetry: false,
      }

    // ── Item not supported — no user action possible ───────────────────────
    case "ITEM_NOT_SUPPORTED":
      return {
        status: "error",
        statusMessage:
          "Your bank does not support the data requested. Please contact support.",
        requiresUserAction: false,
        shouldRetry: false,
      }

    // ── Institution temporarily unavailable — retry automatically ─────────
    case "INSTITUTION_NOT_RESPONDING":
      return {
        status: "error",
        statusMessage:
          "Your bank is not responding. We'll try again automatically — no action needed.",
        requiresUserAction: false,
        shouldRetry: true,
      }

    case "INSTITUTION_NOT_AVAILABLE":
      return {
        status: "error",
        statusMessage: "Your bank is temporarily unavailable. We'll retry shortly.",
        requiresUserAction: false,
        shouldRetry: true,
      }

    case "INSTITUTION_DOWN":
      return {
        status: "error",
        statusMessage: "Your bank is experiencing an outage. We'll retry when it's back online.",
        requiresUserAction: false,
        shouldRetry: true,
      }

    // ── Rate limiting — retry with backoff ────────────────────────────────
    case "RATE_LIMIT_EXCEEDED":
      return {
        status: "error",
        statusMessage: "Sync temporarily paused due to high request volume. Will resume automatically.",
        requiresUserAction: false,
        shouldRetry: true,
      }

    // ── Plaid's own errors ─────────────────────────────────────────────────
    case "INTERNAL_SERVER_ERROR":
      return {
        status: "error",
        statusMessage: "A temporary error occurred. We'll retry automatically.",
        requiresUserAction: false,
        shouldRetry: true,
      }

    case "PLANNED_MAINTENANCE":
      return {
        status: "error",
        statusMessage: "Plaid is undergoing maintenance. Syncing will resume when complete.",
        requiresUserAction: false,
        shouldRetry: true,
      }

    // ── Unknown / future error codes ───────────────────────────────────────
    default:
      return {
        status: "error",
        statusMessage: "An unexpected error occurred with your bank connection. Please try reconnecting.",
        requiresUserAction: false,
        shouldRetry: false,
      }
  }
}

/**
 * Parse a Plaid API error response body and throw a typed error.
 * Represents what plaidRequest() should do when it gets a non-200 response.
 */
function parsePlaidApiError(responseBody: unknown): {
  errorType: string
  errorCode: string
  errorMessage: string
  displayMessage: string | null
} {
  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("error_code" in responseBody)
  ) {
    return {
      errorType: "UNKNOWN",
      errorCode: "UNKNOWN",
      errorMessage: "Unknown error from Plaid API",
      displayMessage: null,
    }
  }

  const body = responseBody as Record<string, unknown>
  return {
    errorType: (body.error_type as string) ?? "UNKNOWN",
    errorCode: (body.error_code as string) ?? "UNKNOWN",
    errorMessage: (body.error_message as string) ?? "Unknown error",
    displayMessage: (body.display_message as string) ?? null,
  }
}

// ============================================================================
// 1. ITEM_LOGIN_REQUIRED
// ============================================================================

describe("ITEM_LOGIN_REQUIRED error handling", () => {
  it("sets status to 'error'", () => {
    const result = mapPlaidErrorToIntegrationUpdate("ITEM_LOGIN_REQUIRED")
    expect(result.status).toBe("error")
  })

  it("statusMessage tells user to reconnect", () => {
    const result = mapPlaidErrorToIntegrationUpdate("ITEM_LOGIN_REQUIRED")
    expect(result.statusMessage.toLowerCase()).toMatch(/reconnect|re-connect|re-auth/)
  })

  it("requiresUserAction is true", () => {
    const result = mapPlaidErrorToIntegrationUpdate("ITEM_LOGIN_REQUIRED")
    expect(result.requiresUserAction).toBe(true)
  })

  it("shouldRetry is false (user action needed, not automatic)", () => {
    const result = mapPlaidErrorToIntegrationUpdate("ITEM_LOGIN_REQUIRED")
    expect(result.shouldRetry).toBe(false)
  })
})

// ============================================================================
// 2. INVALID_CREDENTIALS
// ============================================================================

describe("INVALID_CREDENTIALS error handling", () => {
  it("sets status to 'error'", () => {
    const result = mapPlaidErrorToIntegrationUpdate("INVALID_CREDENTIALS")
    expect(result.status).toBe("error")
  })

  it("statusMessage mentions credentials or reconnect", () => {
    const result = mapPlaidErrorToIntegrationUpdate("INVALID_CREDENTIALS")
    expect(result.statusMessage.toLowerCase()).toMatch(/credential|reconnect|login/)
  })

  it("requiresUserAction is true", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INVALID_CREDENTIALS").requiresUserAction).toBe(true)
  })

  it("shouldRetry is false", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INVALID_CREDENTIALS").shouldRetry).toBe(false)
  })
})

// ============================================================================
// 3. INVALID_MFA
// ============================================================================

describe("INVALID_MFA error handling", () => {
  it("sets status to 'error'", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INVALID_MFA").status).toBe("error")
  })

  it("statusMessage mentions MFA or verification", () => {
    const result = mapPlaidErrorToIntegrationUpdate("INVALID_MFA")
    expect(result.statusMessage.toLowerCase()).toMatch(/mfa|multi-factor|verification|reconnect/)
  })

  it("requiresUserAction is true", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INVALID_MFA").requiresUserAction).toBe(true)
  })
})

// ============================================================================
// 4. ITEM_LOCKED
// ============================================================================

describe("ITEM_LOCKED error handling", () => {
  it("sets status to 'error'", () => {
    expect(mapPlaidErrorToIntegrationUpdate("ITEM_LOCKED").status).toBe("error")
  })

  it("statusMessage tells user to unlock at bank", () => {
    const result = mapPlaidErrorToIntegrationUpdate("ITEM_LOCKED")
    expect(result.statusMessage.toLowerCase()).toMatch(/lock|bank/)
  })

  it("requiresUserAction is true", () => {
    expect(mapPlaidErrorToIntegrationUpdate("ITEM_LOCKED").requiresUserAction).toBe(true)
  })

  it("shouldRetry is false (useless to retry a locked account)", () => {
    expect(mapPlaidErrorToIntegrationUpdate("ITEM_LOCKED").shouldRetry).toBe(false)
  })
})

// ============================================================================
// 5. USER_PERMISSION_REVOKED
// ============================================================================

describe("USER_PERMISSION_REVOKED error handling", () => {
  it("sets status to 'disconnected' (not 'error' — user intentionally revoked)", () => {
    // This is semantically different — the user chose to revoke access,
    // so we mark it disconnected, not errored.
    expect(mapPlaidErrorToIntegrationUpdate("USER_PERMISSION_REVOKED").status).toBe("disconnected")
  })

  it("statusMessage mentions revoked access and reconnecting", () => {
    const result = mapPlaidErrorToIntegrationUpdate("USER_PERMISSION_REVOKED")
    expect(result.statusMessage.toLowerCase()).toMatch(/revok|access|reconnect/)
  })

  it("requiresUserAction is true", () => {
    expect(mapPlaidErrorToIntegrationUpdate("USER_PERMISSION_REVOKED").requiresUserAction).toBe(true)
  })
})

// ============================================================================
// 6. INSTITUTION_NOT_RESPONDING
// ============================================================================

describe("INSTITUTION_NOT_RESPONDING error handling", () => {
  it("sets status to 'error'", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INSTITUTION_NOT_RESPONDING").status).toBe("error")
  })

  it("statusMessage does NOT ask user to take action", () => {
    const result = mapPlaidErrorToIntegrationUpdate("INSTITUTION_NOT_RESPONDING")
    // Should say "we'll retry" not "please reconnect"
    expect(result.statusMessage.toLowerCase()).toMatch(/retry|try again|automatic/)
  })

  it("requiresUserAction is false (transient — just wait)", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INSTITUTION_NOT_RESPONDING").requiresUserAction).toBe(false)
  })

  it("shouldRetry is true", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INSTITUTION_NOT_RESPONDING").shouldRetry).toBe(true)
  })
})

// ============================================================================
// 7. INSTITUTION_NOT_AVAILABLE / INSTITUTION_DOWN
// ============================================================================

describe("INSTITUTION_NOT_AVAILABLE and INSTITUTION_DOWN", () => {
  for (const code of ["INSTITUTION_NOT_AVAILABLE", "INSTITUTION_DOWN"] as const) {
    describe(`${code}`, () => {
      it("sets status to 'error'", () => {
        expect(mapPlaidErrorToIntegrationUpdate(code).status).toBe("error")
      })

      it("requiresUserAction is false", () => {
        expect(mapPlaidErrorToIntegrationUpdate(code).requiresUserAction).toBe(false)
      })

      it("shouldRetry is true", () => {
        expect(mapPlaidErrorToIntegrationUpdate(code).shouldRetry).toBe(true)
      })
    })
  }
})

// ============================================================================
// 8. RATE_LIMIT_EXCEEDED
// ============================================================================

describe("RATE_LIMIT_EXCEEDED error handling", () => {
  it("sets status to 'error'", () => {
    expect(mapPlaidErrorToIntegrationUpdate("RATE_LIMIT_EXCEEDED").status).toBe("error")
  })

  it("shouldRetry is true (backoff and retry)", () => {
    expect(mapPlaidErrorToIntegrationUpdate("RATE_LIMIT_EXCEEDED").shouldRetry).toBe(true)
  })

  it("requiresUserAction is false", () => {
    expect(mapPlaidErrorToIntegrationUpdate("RATE_LIMIT_EXCEEDED").requiresUserAction).toBe(false)
  })

  it("statusMessage mentions paused or rate limit", () => {
    const result = mapPlaidErrorToIntegrationUpdate("RATE_LIMIT_EXCEEDED")
    expect(result.statusMessage.toLowerCase()).toMatch(/pause|rate|volume|resum/)
  })
})

// ============================================================================
// 9. INTERNAL_SERVER_ERROR (Plaid's own bug)
// ============================================================================

describe("INTERNAL_SERVER_ERROR error handling", () => {
  it("sets status to 'error'", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INTERNAL_SERVER_ERROR").status).toBe("error")
  })

  it("shouldRetry is true", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INTERNAL_SERVER_ERROR").shouldRetry).toBe(true)
  })

  it("requiresUserAction is false", () => {
    expect(mapPlaidErrorToIntegrationUpdate("INTERNAL_SERVER_ERROR").requiresUserAction).toBe(false)
  })
})

// ============================================================================
// 10. Unknown / future error codes — defensive fallback
// ============================================================================

describe("unknown error codes — defensive fallback", () => {
  it("handles a completely unknown error code without throwing", () => {
    expect(() => mapPlaidErrorToIntegrationUpdate("SOME_FUTURE_ERROR_CODE")).not.toThrow()
  })

  it("returns status 'error' for unknown codes", () => {
    expect(mapPlaidErrorToIntegrationUpdate("SOME_FUTURE_ERROR_CODE").status).toBe("error")
  })

  it("returns a non-empty statusMessage for unknown codes", () => {
    const result = mapPlaidErrorToIntegrationUpdate("SOME_FUTURE_ERROR_CODE")
    expect(result.statusMessage.length).toBeGreaterThan(0)
  })

  it("handles empty string error code", () => {
    const result = mapPlaidErrorToIntegrationUpdate("")
    expect(result.status).toBe("error")
  })

  it("handles null-like string", () => {
    const result = mapPlaidErrorToIntegrationUpdate("null")
    expect(result.status).toBe("error")
  })
})

// ============================================================================
// 11. Errors that require user action vs. automatic retry
// ============================================================================

describe("error classification — user action vs. automatic retry", () => {
  const userActionErrors: PlaidErrorCode[] = [
    "ITEM_LOGIN_REQUIRED",
    "INVALID_CREDENTIALS",
    "INVALID_MFA",
    "ITEM_LOCKED",
    "USER_PERMISSION_REVOKED",
  ]

  const autoRetryErrors: PlaidErrorCode[] = [
    "INSTITUTION_NOT_RESPONDING",
    "INSTITUTION_NOT_AVAILABLE",
    "INSTITUTION_DOWN",
    "RATE_LIMIT_EXCEEDED",
    "INTERNAL_SERVER_ERROR",
    "PLANNED_MAINTENANCE",
  ]

  for (const code of userActionErrors) {
    it(`${code} → requiresUserAction=true, shouldRetry=false`, () => {
      const result = mapPlaidErrorToIntegrationUpdate(code)
      expect(result.requiresUserAction).toBe(true)
      expect(result.shouldRetry).toBe(false)
    })
  }

  for (const code of autoRetryErrors) {
    it(`${code} → requiresUserAction=false, shouldRetry=true`, () => {
      const result = mapPlaidErrorToIntegrationUpdate(code)
      expect(result.requiresUserAction).toBe(false)
      expect(result.shouldRetry).toBe(true)
    })
  }
})

// ============================================================================
// 12. parsePlaidApiError — parsing raw Plaid API error responses
// ============================================================================

describe("parsePlaidApiError — parsing Plaid API error response bodies", () => {
  it("parses a well-formed Plaid error response", () => {
    const body = {
      error_type: "ITEM_ERROR",
      error_code: "ITEM_LOGIN_REQUIRED",
      error_message: "the login details of this item have changed (credentials, MFA, or required user action)",
      display_message: "Login details have changed. Please reconnect your account.",
    }
    const parsed = parsePlaidApiError(body)

    expect(parsed.errorType).toBe("ITEM_ERROR")
    expect(parsed.errorCode).toBe("ITEM_LOGIN_REQUIRED")
    expect(parsed.errorMessage).toContain("login details")
    expect(parsed.displayMessage).toContain("reconnect")
  })

  it("handles a response with no display_message (returns null)", () => {
    const body = {
      error_type: "INSTITUTION_ERROR",
      error_code: "INSTITUTION_NOT_RESPONDING",
      error_message: "The institution is not responding",
    }
    const parsed = parsePlaidApiError(body)

    expect(parsed.errorCode).toBe("INSTITUTION_NOT_RESPONDING")
    expect(parsed.displayMessage).toBeNull()
  })

  it("handles a completely malformed response body", () => {
    const parsed = parsePlaidApiError("not an object")
    expect(parsed.errorCode).toBe("UNKNOWN")
    expect(parsed.errorMessage).toBeTruthy()
  })

  it("handles null response body", () => {
    const parsed = parsePlaidApiError(null)
    expect(parsed.errorCode).toBe("UNKNOWN")
  })

  it("handles an empty object", () => {
    const parsed = parsePlaidApiError({})
    // No error_code field — falls into unknown
    expect(parsed.errorCode).toBe("UNKNOWN")
  })

  it("handles a rate limit error response", () => {
    const body = {
      error_type: "RATE_LIMIT_EXCEEDED",
      error_code: "RATE_LIMIT_EXCEEDED",
      error_message: "You have exceeded the rate limit for this endpoint",
      display_message: null,
    }
    const parsed = parsePlaidApiError(body)
    expect(parsed.errorCode).toBe("RATE_LIMIT_EXCEEDED")
  })
})

// ============================================================================
// 13. Webhook ITEM.ERROR event mapping
// ============================================================================
//
// The webhook handler at app/api/webhooks/plaid/route.ts receives ITEM.ERROR
// events and must update the integration. These tests verify the end-to-end
// mapping from webhook payload → integration update.

type PlaidWebhookErrorEvent = {
  webhook_type: "ITEM"
  webhook_code: "ERROR"
  item_id: string
  error: {
    error_code: string
    error_message: string
  }
}

/**
 * Process an ITEM.ERROR webhook event and return what the integration
 * record should be updated to.
 */
function processItemErrorWebhook(event: PlaidWebhookErrorEvent): {
  status: IntegrationStatus
  statusMessage: string
} {
  const mapping = mapPlaidErrorToIntegrationUpdate(event.error.error_code)
  return {
    status: mapping.status,
    statusMessage: mapping.statusMessage,
  }
}

describe("ITEM.ERROR webhook → integration update mapping", () => {
  it("ITEM_LOGIN_REQUIRED webhook → status error with reconnect message", () => {
    const event: PlaidWebhookErrorEvent = {
      webhook_type: "ITEM",
      webhook_code: "ERROR",
      item_id: "item_abc123",
      error: {
        error_code: "ITEM_LOGIN_REQUIRED",
        error_message: "the login details of this item have changed",
      },
    }
    const update = processItemErrorWebhook(event)
    expect(update.status).toBe("error")
    expect(update.statusMessage.toLowerCase()).toMatch(/reconnect|re-auth/)
  })

  it("INSTITUTION_NOT_RESPONDING webhook → status error with retry message", () => {
    const event: PlaidWebhookErrorEvent = {
      webhook_type: "ITEM",
      webhook_code: "ERROR",
      item_id: "item_abc123",
      error: {
        error_code: "INSTITUTION_NOT_RESPONDING",
        error_message: "The institution is not responding",
      },
    }
    const update = processItemErrorWebhook(event)
    expect(update.status).toBe("error")
    expect(update.statusMessage.toLowerCase()).toMatch(/retry|automatic/)
  })

  it("USER_PERMISSION_REVOKED webhook → status disconnected", () => {
    const event: PlaidWebhookErrorEvent = {
      webhook_type: "ITEM",
      webhook_code: "ERROR",
      item_id: "item_abc123",
      error: {
        error_code: "USER_PERMISSION_REVOKED",
        error_message: "User revoked access",
      },
    }
    const update = processItemErrorWebhook(event)
    expect(update.status).toBe("disconnected")
  })
})

// ============================================================================
// 14. Status message constraints — UI safety
// ============================================================================

describe("statusMessage constraints for UI safety", () => {
  const allErrorCodes: string[] = [
    "ITEM_LOGIN_REQUIRED",
    "INVALID_CREDENTIALS",
    "INVALID_MFA",
    "ITEM_LOCKED",
    "ITEM_NOT_SUPPORTED",
    "USER_PERMISSION_REVOKED",
    "INSTITUTION_NOT_RESPONDING",
    "INSTITUTION_NOT_AVAILABLE",
    "INSTITUTION_DOWN",
    "RATE_LIMIT_EXCEEDED",
    "INTERNAL_SERVER_ERROR",
    "PLANNED_MAINTENANCE",
  ]

  for (const code of allErrorCodes) {
    it(`${code} → statusMessage fits in DB column (≤ 500 chars)`, () => {
      const result = mapPlaidErrorToIntegrationUpdate(code)
      // DB column is varchar(500) per updateIntegrationSchema
      expect(result.statusMessage.length).toBeLessThanOrEqual(500)
    })

    it(`${code} → statusMessage is not empty`, () => {
      const result = mapPlaidErrorToIntegrationUpdate(code)
      expect(result.statusMessage.length).toBeGreaterThan(0)
    })
  }
})
