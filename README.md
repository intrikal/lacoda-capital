# Lacoda Capital

![CI](https://github.com/intrikal/lacoda-capital/actions/workflows/ci.yml/badge.svg)

**The Operating System for Asset Management & Holdings Firms**

Multi-tenant SaaS platform for wealth advisors to manage client portfolios, documents, compliance, and reporting. Includes a full client portal, AI-powered document extraction, 8 third-party integrations, and 13 serverless Edge Functions.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Supabase Auth (OAuth, SAML 2.0 SSO) |
| Payments | Stripe (subscriptions, 6 tiers) |
| Styling | TailwindCSS v4 + shadcn/ui (Radix primitives) |
| 3D / Animations | React Three Fiber + react-spring |
| Charts | Recharts |
| AI | Claude (Anthropic) via 4 agents |
| Email | Resend (6 HTML templates) |
| Analytics | PostHog + Sentry + GTM |
| Testing | Vitest + Playwright + Storybook |
| Edge Functions | 13 Supabase/Deno functions |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# See docs/deployment.md for what each variable does

# 3. Run database migrations
npm run db:migrate

# 4. Seed demo data (optional)
npm run db:seed

# 5. Start dev server
npm run dev
```

See [docs/deployment.md](docs/deployment.md) for the full setup guide, production deployment, and CI/CD documentation.

---

## Project Structure

```
lacoda-capital/
├── app/
│   ├── (marketing)/        # Public marketing pages (home, pricing, demo, etc.)
│   ├── (dashboard)/        # Advisor dashboard (requires auth: assistant+)
│   │   └── app/
│   │       ├── assets/     clients/     vault/       ledger/
│   │       ├── reports/    compliance/  calendar/    tasks/
│   │       ├── goals/      benchmarks/  billing/     deals/
│   │       ├── tax-writeoffs/           integrations/
│   │       └── settings/   help/
│   ├── (client)/           # Client portal (requires auth: client+)
│   │   └── client/
│   │       ├── portfolio/  assets/      documents/   vault/
│   │       ├── reports/    calendar/    messages/    billing/
│   │       ├── goals/      expenses/    beneficiaries/
│   │       ├── transfers/  transactions/ activity/
│   │       └── settings/   help/
│   ├── (auth)/             # Login, OAuth callback
│   ├── (onboarding)/       # Org setup wizard
│   ├── (demo)/             # Read-only demo environment (mock data)
│   ├── portal/             # External stakeholder portal
│   ├── db/
│   │   └── schema/         # 41 Drizzle ORM table definitions
│   └── api/
│       ├── v1/             # REST API (clients, assets, ledger, docs, entities, booking)
│       └── webhooks/       # Stripe, Plaid, DocuSign, Google Calendar
├── lib/
│   ├── actions/            # 51 server action files
│   ├── services/           # 19 business logic services
│   ├── integrations/       # 8 third-party integrations
│   ├── agents/             # 4 AI agents (extraction, narrative, email, alerts)
│   ├── stripe/             # Billing config (6 tiers: Free → Enterprise)
│   ├── hooks/              # React hooks (CRUD, forms, etc.)
│   ├── validations/        # Zod schemas
│   ├── schedule/           # Booking + calendar helpers
│   ├── sanity/             # CMS schemas + queries
│   ├── analytics/          # PostHog client + server tracking
│   ├── auth.ts             # Session, RBAC (admin/assistant/client)
│   ├── sso.ts              # SAML 2.0 (Okta, Azure AD, Google Workspace)
│   ├── rate-limiter.ts     # API rate limiting
│   └── logger.ts           # Pino structured logging
├── components/
│   ├── ui/                 # Base shadcn/ui components
│   ├── dashboard/          # Advisor dashboard components
│   ├── ai/                 # AI trigger buttons + dialogs
│   ├── forms/              # TanStack Form dialogs
│   ├── schedule/           # Booking form
│   ├── 3d/                 # Three.js scenes
│   └── marketing/          # Landing page components
├── supabase/
│   └── functions/          # 13 Edge Functions (Deno)
├── scripts/                # Seed, schema fixes
├── drizzle/
│   └── migrations/         # SQL migration files
├── tests/
│   ├── unit/               # Vitest unit tests
│   ├── integration/        # Vitest integration tests
│   └── e2e/                # Playwright E2E tests
└── docs/                   # Setup guides for every integration
```

---

## Features

### Advisor Dashboard
- **Portfolio Management** — Assets across 13 classes (real estate, equities, fixed income, PE, VC, crypto, etc.), valuations with historical tracking, multi-currency support
- **Client CRM** — Client profiles, entity hierarchy (personal/trust/LLC/corp/partnership), KYC verification
- **Document Vault** — Upload, tag, version, e-sign (DocuSign), AI data extraction
- **Immutable Ledger** — Append-only audit trail for every action
- **Reports** — PDF generation with AI-written narratives
- **Compliance** — SOC 2 controls checklist, evidence tracking, status management
- **Tasks** — Workflow management with assignments
- **Calendar** — Google Calendar sync, event management
- **Goals & Benchmarks** — Financial goal tracking, performance benchmarks
- **Billing** — Stripe subscriptions (6 tiers), invoice management, per-client billing records
- **Tax Deductions** — Client deduction tracking with IRS reference data
- **Deals Pipeline** — Investment opportunity tracking
- **Integrations** — Connect Stripe, Plaid, DocuSign, QuickBooks, Salesforce, Google Calendar, Google Drive, Dropbox

### Client Portal (17 pages)
- Portfolio overview, document access, messaging with advisors
- Calendar scheduling, expense tracking, beneficiary management
- Billing history, goal monitoring, activity feed

### AI Capabilities
- **Document Extraction** — Extract structured data from financial documents with confidence scores
- **Email Drafting** — Generate document request emails with auto-selected tone
- **Report Narratives** — AI-written portfolio summaries with key highlights
- **Alert Digest** — Weekly AI-prioritized alert emails with urgency scoring

### Enterprise
- **Multi-tenant** — Complete org isolation, row-level security
- **RBAC** — Admin / Assistant / Client roles with granular permissions
- **SSO** — SAML 2.0 (Okta, Azure AD, Google Workspace presets)
- **API Keys** — Developer API access with rate limiting
- **GDPR** — Data deletion request workflow

### Demo Mode
- Read-only preview of both advisor dashboard and client portal
- Uses hardcoded mock data, no auth required
- "Try Demo" button on marketing site

---

## Integrations

| Service | Purpose | Setup Guide |
|---------|---------|-------------|
| Supabase | Database, Auth, Storage, Edge Functions | [supabase-setup.md](docs/integrations/supabase-setup.md) |
| Stripe | Payments, subscriptions, billing | [stripe-setup.md](docs/integrations/stripe-setup.md) |
| Plaid | Bank account sync, auto-balance updates | [plaid-setup.md](docs/integrations/plaid-setup.md) |
| DocuSign | E-signature workflows | [docusign-setup.md](docs/integrations/docusign-setup.md) |
| QuickBooks | Accounting sync | [quickbooks-setup.md](docs/integrations/quickbooks-setup.md) |
| Salesforce | CRM sync (bi-directional) | [salesforce-setup.md](docs/integrations/salesforce-setup.md) |
| Google Calendar | Calendar sync, booking confirmations | [google-calendar-setup.md](docs/integrations/google-calendar-setup.md) |
| Google Drive | Document import | [google-drive-setup.md](docs/integrations/google-drive-setup.md) |
| Dropbox | Document import | [dropbox-setup.md](docs/integrations/dropbox-setup.md) |
| Resend | Transactional email (6 templates) | [resend-setup.md](docs/integrations/resend-setup.md) |
| Sentry | Error tracking & APM | [sentry-setup.md](docs/integrations/sentry-setup.md) |
| PostHog | Product analytics + session replay | [posthog-setup.md](docs/integrations/posthog-setup.md) |
| Sanity | Marketing CMS | [sanity-setup.md](docs/integrations/sanity-setup.md) |

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/deployment.md](docs/deployment.md) | Local setup, database migrations, seed script, CI/CD, Vercel deployment, env vars |
| [docs/edge-functions.md](docs/edge-functions.md) | All 13 Edge Functions: what they do, deployment, pg_cron schedules, secrets |
| [docs/ai-agents.md](docs/ai-agents.md) | 4 AI agents: extraction, narrative, email, alerts — prompts, schemas, UI flow |
| [docs/alerts-setup.md](docs/alerts-setup.md) | Alert routing: Discord, email, in-app notifications |
| [docs/integrations/](docs/integrations/) | Per-integration setup guides (14 guides) |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Browse database in browser |
| `npm run storybook` | Component development UI |

---

## Design Principles

1. **Enterprise Trust** — Dark theme with zinc/slate base, teal/cyan accents used sparingly
2. **Purposeful Animation** — react-spring transitions add meaning; all respect `prefers-reduced-motion`
3. **Information Density** — Dashboard designed for real work, not just demos
4. **Mobile Responsive** — All pages work on mobile
5. **Keyboard Accessible** — Full keyboard navigation, visible focus indicators, semantic HTML

---

## License

Private - Lacoda Capital Holdings
