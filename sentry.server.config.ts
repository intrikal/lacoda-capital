import * as Sentry from "@sentry/nextjs";

// ─── PII fields to strip from server-side error reports ────────────
const PII_KEYS = new Set([
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
]);

function stripPii(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PII_KEYS.has(key)) {
      cleaned[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripPii(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Gracefully handle missing DSN — app works without Sentry
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% in prod, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Strip PII before sending to Sentry
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }

    if (event.extra) {
      event.extra = stripPii(event.extra as Record<string, unknown>);
    }

    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.data) {
          crumb.data = stripPii(crumb.data as Record<string, unknown>);
        }
        return crumb;
      });
    }

    return event;
  },
});
