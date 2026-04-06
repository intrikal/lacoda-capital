# Integration Setup Guides

Complete setup instructions for every third-party service used by Lacoda Capital.

For the architectural reasoning behind API routes vs server actions, see [architecture-decision.md](architecture-decision.md).

---

## Required Integrations

These must be configured for the app to run:

| Integration | Guide | What it does |
|---|---|---|
| **Supabase** | [supabase-setup.md](supabase-setup.md) | Database, authentication, Edge Functions |
| **Google OAuth** | [google-oauth-setup.md](google-oauth-setup.md) | "Continue with Google" sign-in |

---

## Core Business Integrations

These power the key workflows — payments, financial data, signatures, accounting:

| Integration | Guide | What it does | Needs Webhook? |
|---|---|---|---|
| **Stripe** | [stripe-setup.md](stripe-setup.md) | Payment collection, invoicing, billing | Yes |
| **Plaid** | [plaid-setup.md](plaid-setup.md) | Bank balances, investment holdings, transactions | Yes |
| **DocuSign** | [docusign-setup.md](docusign-setup.md) | Electronic signatures on documents | Yes |
| **QuickBooks** | [quickbooks-setup.md](quickbooks-setup.md) | Accounting sync (invoices, chart of accounts) | No |
| **Google Drive** | [google-drive-setup.md](google-drive-setup.md) | Import documents from Google Drive | No |
| **Dropbox** | [dropbox-setup.md](dropbox-setup.md) | Import and sync documents from Dropbox | No |
| **Salesforce** | [salesforce-setup.md](salesforce-setup.md) | CRM sync (clients, deals, activity) | No |
| **Google Calendar** | [google-calendar-setup.md](google-calendar-setup.md) | Bidirectional calendar sync, booking | Yes |

---

## System Integrations

| Guide | What it covers |
|---|---|
| **[Booking & Scheduling](booking-scheduling-setup.md)** | Public booking form → Sanity review → Google Calendar + email |
| **[Edge Functions](../edge-functions.md)** | All 13 Supabase Edge Functions, deployment, pg_cron |
| **[AI Agents](../ai-agents.md)** | 4 Claude-powered agents, prompts, schemas, UI |
| **[Deployment](../deployment.md)** | Local setup, migrations, CI/CD, Vercel, env vars |

---

## Supporting Integrations

The app works without these — they add email, analytics, error tracking, and CMS:

| Integration | Guide | What it does |
|---|---|---|
| **Resend** | [resend-setup.md](resend-setup.md) | Transactional emails (invitations, alerts, digest) |
| **Google Tag Manager** | [gtm-setup.md](gtm-setup.md) | Conversion pixels, ad tracking tags |
| **PostHog** | [posthog-setup.md](posthog-setup.md) | Product analytics and event tracking |
| **Sentry** | [sentry-setup.md](sentry-setup.md) | Error tracking, performance monitoring |
| **Sanity CMS** | [sanity-setup.md](sanity-setup.md) | Headless CMS for marketing content |
| **Microsoft OAuth** | [microsoft-oauth-setup.md](microsoft-oauth-setup.md) | "Continue with Microsoft" sign-in |

---

## Quick Start

1. Copy `.env.example` to `.env`
2. Set up **Supabase** first (everything depends on it)
3. Set up **Google OAuth** for sign-in
4. Add **Stripe** + **Plaid** for core functionality
5. Add the rest as needed
6. Run `npm run dev`

---

## Architecture

| File | What it contains |
|---|---|
| `lib/integrations/*.ts` | API clients for each provider (Plaid, Stripe, etc.) |
| `lib/actions/integration.actions.ts` | Server Actions for user-initiated operations |
| `lib/hooks/crud/use-integrations.ts` | React hooks for the integrations UI |
| `app/api/webhooks/*/route.ts` | Webhook handlers for async events |
| `app/(dashboard)/app/integrations/page.tsx` | Integrations management page |

See [architecture-decision.md](architecture-decision.md) for why each integration uses API routes vs server actions.

---

## Environment Variables Reference

All environment variables are documented in `.env.example` with links to the relevant setup guide.

### Required

| Variable | Guide |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase](supabase-setup.md) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | [Supabase](supabase-setup.md) |
| `DATABASE_URL` | [Supabase](supabase-setup.md) |
| `DIRECT_URL` | [Supabase](supabase-setup.md) |
| `NEXT_PUBLIC_SITE_URL` | [Supabase](supabase-setup.md) |
| `GOOGLE_CLIENT_ID` | [Google OAuth](google-oauth-setup.md) |
| `GOOGLE_CLIENT_SECRET` | [Google OAuth](google-oauth-setup.md) |

### Core Business

| Variable | Guide |
|---|---|
| `STRIPE_SECRET_KEY` | [Stripe](stripe-setup.md) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | [Stripe](stripe-setup.md) |
| `STRIPE_WEBHOOK_SECRET` | [Stripe](stripe-setup.md) |
| `PLAID_CLIENT_ID` | [Plaid](plaid-setup.md) |
| `PLAID_SECRET` | [Plaid](plaid-setup.md) |
| `PLAID_ENV` | [Plaid](plaid-setup.md) |
| `PLAID_WEBHOOK_SECRET` | [Plaid](plaid-setup.md) |
| `DOCUSIGN_INTEGRATION_KEY` | [DocuSign](docusign-setup.md) |
| `DOCUSIGN_SECRET_KEY` | [DocuSign](docusign-setup.md) |
| `DOCUSIGN_ACCOUNT_ID` | [DocuSign](docusign-setup.md) |
| `DOCUSIGN_BASE_URL` | [DocuSign](docusign-setup.md) |
| `QUICKBOOKS_CLIENT_ID` | [QuickBooks](quickbooks-setup.md) |
| `QUICKBOOKS_CLIENT_SECRET` | [QuickBooks](quickbooks-setup.md) |
| `QUICKBOOKS_ENV` | [QuickBooks](quickbooks-setup.md) |
| `SALESFORCE_CLIENT_ID` | [Salesforce](salesforce-setup.md) |
| `SALESFORCE_CLIENT_SECRET` | [Salesforce](salesforce-setup.md) |
| `SALESFORCE_LOGIN_URL` | [Salesforce](salesforce-setup.md) |
| `DROPBOX_APP_KEY` | [Dropbox](dropbox-setup.md) |
| `DROPBOX_APP_SECRET` | [Dropbox](dropbox-setup.md) |

### Supporting

| Variable | Guide |
|---|---|
| `AZURE_CLIENT_ID` | [Microsoft OAuth](microsoft-oauth-setup.md) |
| `NEXT_PUBLIC_SENTRY_DSN` | [Sentry](sentry-setup.md) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | [Sentry](sentry-setup.md) |
| `NEXT_PUBLIC_GTM_ID` | [Google Tag Manager](gtm-setup.md) |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | [PostHog](posthog-setup.md) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `SANITY_API_TOKEN` | [Sanity](sanity-setup.md) |

### Supabase Edge Function Secrets (set via CLI, not in `.env`)

| Secret | Guide |
|---|---|
| `RESEND_API_KEY` | [Resend](resend-setup.md) |
| `SUPABASE_SERVICE_ROLE_KEY` | [Supabase](supabase-setup.md) |
