# Deployment & Operations

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- A Supabase project (free tier works)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Fill in required values (at minimum):
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
#    - DATABASE_URL
#    - DIRECT_URL
#    - NEXT_PUBLIC_SITE_URL
#    - ADMIN_EMAIL
#    - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (for auth)

# 4. Run database migrations
npm run db:migrate

# 5. Seed demo data (optional)
npm run db:seed

# 6. Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Useful dev commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run storybook` | Component development UI (port 6006) |
| `npm test -- --watch` | Vitest watch mode |
| `npm run test:e2e:ui` | Playwright interactive test UI |
| `npm run lint -- --fix` | Auto-fix linting issues |
| `npm run db:studio` | Drizzle Studio — browse/edit DB in browser |

---

## Database

### Connection strategy

| Variable | Port | Purpose |
|----------|------|---------|
| `DATABASE_URL` | 6543 | Transaction pooler — for app queries at runtime |
| `DIRECT_URL` | 5432 | Direct connection — for migrations and schema changes (bypasses PgBouncer) |

Both come from Supabase Dashboard > Project Settings > Database.

### Drizzle ORM config (`drizzle.config.ts`)

- Schema files: `app/db/schema/*.ts` (41 files)
- Migrations directory: `drizzle/migrations/`
- Dialect: PostgreSQL
- Strict mode and verbose logging enabled

### Migration workflow

```bash
# 1. Edit schema files in app/db/schema/
# 2. Generate SQL migration
npm run db:generate

# 3. Review the generated SQL in drizzle/migrations/
# 4. Apply migration
npm run db:migrate

# 5. Commit the migration file to git
```

CI runs `npx drizzle-kit check` on every PR to prevent schema/migration drift.

### Seed script (`scripts/seed.ts`)

Populates the database with realistic demo data. Idempotent — truncates seeded tables before inserting (CASCADE).

```bash
npm run db:seed
# or: npx tsx scripts/seed.ts
```

Seeds:
- 2 organizations, 4 users, 6 org memberships
- 5 clients, 10 entities (3-level hierarchy)
- 20 assets across all classes, 60 valuations
- 30 documents, 50 ledger events, 10 notifications
- 5 compliance controls, 3 compliance evidence items

Uses deterministic UUIDs for stable re-runs.

### Other scripts

| Script | Purpose |
|--------|---------|
| `scripts/apply-missing-schema.ts` | Apply schema changes with IF NOT EXISTS guards (idempotent) |
| `scripts/fix-entities-parent-id.ts` | One-shot: add parent_id column to entities |

---

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `dev` | Start Next.js dev server |
| `build` | Production build (outputs to `.next/`) |
| `start` | Start production server |
| `lint` | ESLint static analysis |
| `test` | Vitest unit tests (jsdom) |
| `test:watch` | Tests in watch mode |
| `test:story` | Storybook visual tests |
| `test:e2e` | Playwright E2E tests |
| `test:e2e:ui` | Playwright interactive UI |
| `db:generate` | Generate SQL migration from schema changes |
| `db:migrate` | Apply pending migrations |
| `db:push` | Push schema directly (dev only, not for prod) |
| `db:studio` | Drizzle Studio web UI |
| `db:seed` | Seed demo data |
| `storybook` | Launch Storybook (port 6006) |
| `build-storybook` | Build static Storybook artifact |

---

## CI/CD

### PR checks (`.github/workflows/ci.yml`)

5 parallel jobs that must all pass before merge:

| Job | Command | Purpose |
|-----|---------|---------|
| Type-check | `npx tsc --noEmit` | Catch TypeScript errors |
| Lint | `npm run lint` | ESLint rules |
| Test | `npm test` | Unit tests |
| Build | `npm run build` | Production build (uses placeholder env vars) |
| Migration-check | `npx drizzle-kit check` | Verify schema matches migrations |

### E2E tests (`.github/workflows/e2e.yml`)

Runs on push to `main` only (not on PRs — too slow).

1. Installs Playwright browsers
2. Builds Next.js app
3. Runs `npm run test:e2e`
4. Uploads HTML report on failure (screenshots, traces, video)

Playwright config auto-starts `next start` via `webServer` block.

---

## Production Deployment (Vercel)

### Environment variables

Set all required variables in Vercel project settings (Settings > Environment Variables). At minimum:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SITE_URL` (your production domain)
- `APP_URL` (same as SITE_URL)
- `ADMIN_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**For Sentry source maps (CI only):**
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

**Optional (enable features as needed):**
- Stripe, Plaid, DocuSign, QuickBooks, Salesforce, Dropbox keys
- PostHog, GTM keys
- Sanity CMS keys
- Discord webhook, alert recipients

### Build settings

No `vercel.json` needed — uses Next.js defaults:
- **Build command:** `npm run build`
- **Output directory:** `.next/`
- **Node version:** 20

### Pre-deployment checklist

1. All required env vars set in Vercel
2. Database migrations applied: `npm run db:migrate`
3. Supabase Edge Functions deployed (see [edge-functions.md](edge-functions.md))
4. Supabase secrets set for Edge Functions
5. pg_cron schedules configured for scheduled functions
6. OAuth callback URLs updated for production domain:
   - Google: `https://your-domain.com/api/webhooks/google-calendar/callback`
   - Supabase Auth: configured in Supabase Dashboard
7. Stripe webhook URL updated: `https://your-domain.com/api/webhooks/stripe`
8. DocuSign Connect URL updated (if using)

### Security headers

Configured in `next.config.ts` for all routes:
- Content-Security-Policy (allows self, PostHog, Stripe.js, Plaid Link, Supabase storage)
- Strict-Transport-Security (2-year max-age, HSTS preload)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/microphone/geolocation disabled

---

## Supabase Edge Functions

See [edge-functions.md](edge-functions.md) for the full guide covering:
- All 13 functions and their purposes
- Deployment commands
- Secret configuration
- pg_cron schedule setup
- Local development with `supabase functions serve`

---

## Environment Variables Reference

The complete list is in `.env.example` with inline documentation. Key categories:

| Category | Variables | Required |
|----------|-----------|----------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes |
| Database | `DATABASE_URL`, `DIRECT_URL` | Yes |
| Site URL | `NEXT_PUBLIC_SITE_URL`, `APP_URL` | Yes |
| Admin | `ADMIN_EMAIL` | Yes |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Yes |
| Stripe | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | For billing |
| Plaid | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` | For bank sync |
| DocuSign | `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_SECRET_KEY`, `DOCUSIGN_ACCOUNT_ID` | For e-sign |
| QuickBooks | `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET` | For accounting |
| Salesforce | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` | For CRM |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | For errors |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | For analytics |
| Sanity | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN` | For CMS |
| Alerts | `DISCORD_WEBHOOK_URL`, `ALERT_EMAIL_RECIPIENTS` | For ops alerts |
| Demo | `DEMO_EMAIL`, `DEMO_PASSWORD` | For demo mode |

### Supabase secrets (not in `.env`)

These are set directly as Supabase Edge Function secrets:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
npx supabase secrets set RESEND_API_KEY=re_xxx
```
