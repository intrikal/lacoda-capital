import pino from "pino";

/**
 * Structured server-side logger using pino.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info({ orgId, userId }, "Document uploaded")
 *   logger.error({ err, entityId }, "Valuation sync failed")
 *
 * In development: uses pino-pretty for human-readable output.
 * In production: outputs structured JSON for log aggregators (Datadog, etc).
 *
 * IMPORTANT: Never log PII (emails, SSNs, account numbers, balances).
 * Use opaque IDs (userId, orgId, entityId) for traceability instead.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),

  // Redact sensitive fields if they accidentally end up in log context
  redact: {
    paths: [
      "email",
      "user_email",
      "userEmail",
      "password",
      "ssn",
      "social_security",
      "account_number",
      "accountNumber",
      "routing_number",
      "routingNumber",
      "credit_card",
      "creditCard",
      "balance",
      "net_worth",
      "netWorth",
      "salary",
      "income",
      "*.email",
      "*.password",
      "*.ssn",
      "*.account_number",
      "*.balance",
    ],
    censor: "[REDACTED]",
  },

  // Pretty-print in dev, structured JSON in prod
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});
