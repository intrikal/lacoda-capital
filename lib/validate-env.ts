const REQUIRED = [
  { key: "DATABASE_URL", reason: "needed for database connection" },
  { key: "DIRECT_URL", reason: "needed for migrations" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", reason: "needed for Supabase client" },
  {
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    reason: "needed for Supabase authentication",
  },
] as const

const OPTIONAL = [
  { key: "NEXT_PUBLIC_SENTRY_DSN", label: "Sentry not configured — error tracking disabled" },
  { key: "NEXT_PUBLIC_POSTHOG_KEY", label: "PostHog not configured — analytics disabled" },
  { key: "STRIPE_SECRET_KEY", label: "Stripe not configured — billing features disabled" },
  { key: "PLAID_CLIENT_ID", label: "Plaid not configured — bank sync disabled" },
  { key: "DOCUSIGN_INTEGRATION_KEY", label: "DocuSign not configured — e-signatures disabled" },
  { key: "QUICKBOOKS_CLIENT_ID", label: "QuickBooks not configured — accounting sync disabled" },
  { key: "SALESFORCE_CLIENT_ID", label: "Salesforce not configured — CRM sync disabled" },
  { key: "DISCORD_WEBHOOK_URL", label: "Discord webhook not configured — operational alerts disabled" },
  { key: "ALERT_EMAIL_RECIPIENTS", label: "Alert email recipients not configured" },
] as const

export function validateEnv(): void {
  // Collect all missing required vars at once
  const missing = REQUIRED.filter(({ key }) => !process.env[key])

  if (missing.length > 0) {
    const lines = missing.map(({ key, reason }) => `  - ${key} (${reason})`)
    throw new Error(
      `Missing required environment variables:\n${lines.join("\n")}\n\nSee .env.example for setup instructions.`
    )
  }

  // Warn about optional vars that are not configured
  for (const { key, label } of OPTIONAL) {
    if (!process.env[key]) {
      console.warn(`⚠ ${label}`)
    }
  }
}
