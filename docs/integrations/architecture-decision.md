# Integration Architecture: API Routes vs Server Actions

This document explains **why** each integration uses the approach it does.

---

## The Two Patterns

Lacoda Capital uses **Server Actions** for all internal data mutations (create client, update asset, etc.). But third-party integrations introduce a new requirement: **webhooks** — external services need to POST data to your app asynchronously.

| Pattern | When to Use | Example |
|---|---|---|
| **Server Actions** | User-initiated actions from the UI | "Connect my Plaid account", "Disconnect Stripe" |
| **API Routes** (`app/api/`) | External services calling YOUR app | Stripe webhook: "payment succeeded", Plaid webhook: "new transactions" |

**Rule of thumb**: If a human clicks a button → Server Action. If an external server sends you data → API Route.

---

## Integration-by-Integration Breakdown

### Plaid (Financial Data Aggregation)

| Component | Pattern | Why |
|---|---|---|
| Connect account | **Server Action** | User clicks "Connect Bank" → opens Plaid Link → exchanges token |
| Disconnect account | **Server Action** | User clicks "Disconnect" → revokes Plaid access token |
| Receive transactions | **API Route** (`/api/webhooks/plaid`) | Plaid POSTs to your webhook when new transactions arrive, accounts update, or errors occur |
| Fetch balances on-demand | **Server Action** | User clicks "Refresh" → server calls Plaid API → updates valuations |

**Why Plaid needs an API route**: After the initial connection, Plaid pushes data to you. You don't poll — Plaid tells you when something changes. This webhook is the core of how Plaid works. Without it, you'd need to poll every account every hour, which Plaid rate-limits and charges more for.

### Stripe (Payments & Billing)

| Component | Pattern | Why |
|---|---|---|
| Create checkout session | **Server Action** | User clicks "Pay Invoice" → server creates Stripe Checkout → redirects |
| Manage subscription | **Server Action** | User clicks "Manage Billing" → opens Stripe Customer Portal |
| Payment succeeded/failed | **API Route** (`/api/webhooks/stripe`) | Stripe POSTs webhook when payment completes, fails, or subscription changes |
| Sync billing status | Triggered by webhook | Webhook handler updates billing record status (paid/due/upcoming) |

**Why Stripe needs an API route**: Credit card payments are asynchronous. The user clicks "Pay", but the actual charge might take seconds to minutes (3D Secure, bank processing). Stripe confirms via webhook — you CANNOT rely on the redirect alone (user might close the tab).

### DocuSign (E-Signatures)

| Component | Pattern | Why |
|---|---|---|
| Send for signature | **Server Action** | Advisor clicks "Send for Signature" → creates DocuSign envelope |
| Check envelope status | **Server Action** | On-demand status check from the UI |
| Signature completed | **API Route** (`/api/webhooks/docusign`) | DocuSign POSTs when recipient signs, declines, or envelope expires |
| Download signed document | **Server Action** | Server fetches signed PDF from DocuSign → stores in Supabase Storage |

**Why DocuSign needs an API route**: You send a document for signature, but the client might sign it hours or days later. DocuSign notifies you via webhook when the status changes. Without it, you'd have to poll every envelope forever.

### Google Drive (Document Storage)

| Component | Pattern | Why |
|---|---|---|
| Connect account | **Server Action** | OAuth flow — user authorizes Google Drive access |
| Import files | **Server Action** | User picks files from Google Drive picker → server copies them |
| Sync folder | **Server Action** | User clicks "Sync Now" → server pulls new/changed files |

**Why Google Drive does NOT need an API route**: Unlike Plaid/Stripe/DocuSign, Google Drive doesn't push data to you. You pull files when the user asks. The Google Drive API supports push notifications, but for a wealth management platform, on-demand import is simpler and sufficient.

### QuickBooks (Accounting Sync)

| Component | Pattern | Why |
|---|---|---|
| Connect account | **Server Action** | OAuth flow — user authorizes QuickBooks access |
| Sync invoices | **Server Action** | User clicks "Sync" → server pushes billing records to QuickBooks |
| Pull chart of accounts | **Server Action** | Server fetches account list for mapping |
| Disconnect | **Server Action** | User revokes QuickBooks access |

**Why QuickBooks does NOT need an API route (initially)**: QuickBooks has webhooks, but for a wealth management platform, the sync is advisor-initiated ("push my invoices to QuickBooks"). Webhooks become useful later if you want real-time two-way sync, but that's Phase 2.

---

## Summary: What Lives Where

```
app/
├── api/
│   └── webhooks/
│       ├── stripe/route.ts      ← Stripe payment events
│       ├── plaid/route.ts       ← Plaid transaction/account updates
│       └── docusign/route.ts    ← DocuSign signature events
│
lib/
├── actions/
│   └── integration.actions.ts   ← All user-initiated integration actions
│
├── integrations/
│   ├── plaid.ts                 ← Plaid API client + helpers
│   ├── stripe.ts                ← Stripe API client + helpers
│   ├── docusign.ts              ← DocuSign API client + helpers
│   ├── google-drive.ts          ← Google Drive API client + helpers
│   └── quickbooks.ts            ← QuickBooks API client + helpers
│
├── hooks/crud/
│   └── use-integrations.ts      ← React hooks for integration UI
│
└── validations/
    └── integration.schema.ts    ← Zod schemas (already exists, will extend)
```

---

## Security: Webhook Verification

Every webhook API route MUST verify the request is authentic:

| Service | Verification Method |
|---|---|
| **Stripe** | `stripe.webhooks.constructEvent(body, sig, secret)` — verifies the `Stripe-Signature` header |
| **Plaid** | Verify `Plaid-Verification` header using your Plaid webhook secret |
| **DocuSign** | Verify HMAC signature in `X-DocuSign-Signature-1` header |

Never trust a webhook payload without verification. An attacker could POST fake "payment succeeded" events to mark unpaid invoices as paid.

---

## Why Not Just Use Server Actions for Everything?

Server Actions require a user session (cookie-based auth). Webhook requests come from external servers with no session — they authenticate via signatures/secrets. You physically cannot use a Server Action for a webhook because:

1. There's no browser making the request
2. There's no Supabase session cookie
3. `requireAuth()` would redirect to `/login` (which makes no sense for Stripe's servers)

API Routes (`app/api/`) handle raw HTTP requests with custom authentication — exactly what webhooks need.
