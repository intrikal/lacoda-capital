const REQUIRED = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", reason: "needed for Supabase client" },
  {
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    reason: "needed for Supabase authentication",
  },
] as const

const OPTIONAL = [
  { key: "DATABASE_URL", label: "DATABASE_URL not set — database features disabled (demo mode only)" },
  { key: "DIRECT_URL", label: "DIRECT_URL not set — migrations will not work" },
  { key: "NEXT_PUBLIC_SENTRY_DSN", label: "Sentry not configured — error tracking disabled" },
  { key: "NEXT_PUBLIC_POSTHOG_KEY", label: "PostHog not configured — analytics disabled" },
  { key: "STRIPE_SECRET_KEY", label: "Stripe not configured — billing features disabled" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret not set — webhook verification disabled" },
  { key: "STRIPE_PRICE_STARTER_MONTHLY", label: "Stripe Starter monthly price not set" },
  { key: "STRIPE_PRICE_STARTER_ANNUAL", label: "Stripe Starter annual price not set" },
  { key: "STRIPE_PRICE_GROWTH_MONTHLY", label: "Stripe Growth monthly price not set" },
  { key: "STRIPE_PRICE_GROWTH_ANNUAL", label: "Stripe Growth annual price not set" },
  { key: "STRIPE_PRICE_PROFESSIONAL_MONTHLY", label: "Stripe Professional monthly price not set" },
  { key: "STRIPE_PRICE_PROFESSIONAL_ANNUAL", label: "Stripe Professional annual price not set" },
  { key: "STRIPE_PRICE_ELITE_MONTHLY", label: "Stripe Elite monthly price not set" },
  { key: "STRIPE_PRICE_ELITE_ANNUAL", label: "Stripe Elite annual price not set" },
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
