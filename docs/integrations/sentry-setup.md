# Sentry Error Tracking Setup Guide

Sentry captures runtime errors, performance data, and session replays for Lacoda Capital. It's **optional**: the app works without it, you just won't get error alerts or performance monitoring.

---

## 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Click **Start for free** and create an account
3. Create an organization (e.g., `lacoda-capital`)

---

## 2. Create a Project

1. In the Sentry dashboard, click **Projects** > **Create Project**
2. Select **Next.js** as the platform
3. Set:
   - **Project name**: `lacoda-capital`
   - **Team**: Select or create a team
4. Click **Create Project**
5. Sentry will show setup instructions — you can skip them (the app is already configured)

---

## 3. Get Your DSN and Auth Token

### DSN (Data Source Name)
1. Go to **Settings** > **Projects** > `lacoda-capital` > **Client Keys (DSN)**
2. Copy the DSN — it looks like:
   ```
   https://abc123@o123456.ingest.us.sentry.io/789456
   ```

### Organization & Project Slug
1. Go to **Settings** > **General Settings**
   - **Organization slug**: Something like `lacoda-capital` (visible in the URL)
2. Go to **Settings** > **Projects**
   - **Project slug**: Something like `lacoda-capital`

### Auth Token (for source maps)
1. Go to **Settings** > **Auth Tokens**
2. Click **Create New Token**
3. Give it the `project:releases` and `org:read` scopes
4. Copy the token — it starts with `sntrys_`

> The auth token is only needed at **build time** to upload source maps. It's not used at runtime.

---

## 4. Add to Your `.env` File

```env
# Sentry (optional — app works without it, just no error reporting)
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.us.sentry.io/789456
SENTRY_ORG=lacoda-capital
SENTRY_PROJECT=lacoda-capital
SENTRY_AUTH_TOKEN=sntrys_your_auth_token_here
```

---

## 5. How It Works in the Code

Sentry is configured in three files that run in different environments:

### Client-side errors (browser)
**File**: [sentry.client.config.ts](../../sentry.client.config.ts)

- Captures JavaScript errors in the browser
- **PII redaction**: Strips emails, SSNs, account numbers, credit cards, balances, salary data before sending to Sentry
- **Performance**: Samples 10% of transactions in production, 100% in development
- **Session Replay**: Records 1% of sessions, 100% of sessions with errors

### Server-side errors (Node.js)
**File**: [sentry.server.config.ts](../../sentry.server.config.ts)

- Captures errors in Server Components, Server Actions, and API routes

### Edge runtime errors
**File**: [sentry.edge.config.ts](../../sentry.edge.config.ts)

- Captures errors in Edge middleware

### Next.js integration
**File**: [next.config.ts](../../next.config.ts)

- The `withSentryConfig()` wrapper in the Next.js config uploads source maps at build time
- This makes error stack traces readable (shows your actual code, not minified bundles)

---

## 6. PII Protection

Since Lacoda Capital handles financial data, the Sentry config **automatically strips these fields** before any data leaves the browser:

| Field | Example |
|---|---|
| `email`, `user_email`, `userEmail` | User email addresses |
| `password` | Passwords |
| `ssn`, `social_security` | Social Security Numbers |
| `account_number`, `routing_number` | Bank account details |
| `credit_card`, `creditCard` | Credit card numbers |
| `balance`, `net_worth`, `netWorth` | Financial balances |
| `salary`, `income` | Income data |

All of these are replaced with `[REDACTED]` before the error event is sent.

---

## 7. Verify It's Working

1. Add the env vars and restart your dev server
2. Trigger a test error by adding this temporarily to any page:

```tsx
<button onClick={() => { throw new Error("Sentry test error") }}>
  Test Sentry
</button>
```

3. Click the button
4. Go to your Sentry dashboard > **Issues** — you should see the test error within ~30 seconds
5. Remove the test button

You can also test from the terminal:
```bash
# Build the app (this uploads source maps)
npm run build
```

If the build succeeds and you see "Sentry source maps uploaded" in the output, the auth token is working.

---

## 8. Recommended Sentry Configuration

After connecting, configure these in the Sentry dashboard:

### Alert Rules
1. Go to **Alerts** > **Create Alert**
2. Recommended alerts:
   - **New issue**: Notify on first occurrence of any new error
   - **Issue regression**: Notify when a previously resolved issue re-appears
   - **High volume**: Notify when an issue gets 100+ events in 1 hour

### Performance Monitoring
1. Go to **Performance** > **Overview**
2. Look at:
   - **Web Vitals**: Core Web Vitals (LCP, FID, CLS)
   - **Transactions**: Slowest API routes and page loads

### Team Notifications
1. Go to **Settings** > **Integrations**
2. Connect Slack or email for real-time error alerts

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No errors showing in Sentry | Check `NEXT_PUBLIC_SENTRY_DSN` is set and restart the dev server. Check `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN` in the config |
| Source maps not working (minified stack traces) | Make sure `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set at **build time** |
| "Invalid DSN" error in console | The DSN format is wrong — copy it again from Sentry > Settings > Client Keys |
| Build fails with Sentry error | Usually the auth token is expired or missing. Regenerate at Settings > Auth Tokens |
| Too many events (hitting limits) | Adjust `tracesSampleRate` in `sentry.client.config.ts` (currently 0.1 = 10% in production) |

---

## 9. Sentry vs App Alerts — When to Use Which

Lacoda Capital has **two** alerting systems that serve different purposes:

### Sentry — Code-Level Error Tracking

- **What it catches**: Unhandled exceptions, JavaScript errors, API route crashes, edge runtime errors
- **Who it's for**: Developers debugging production issues
- **How it works**: Automatic capture — errors are sent to Sentry without any manual code
- **Examples**: `TypeError: Cannot read property of undefined`, `500 Internal Server Error`, unhandled promise rejections
- **Dashboard**: [sentry.io](https://sentry.io) project dashboard with stack traces, breadcrumbs, and session replays

### App Alerts — Business Logic Monitoring

- **What it catches**: Operational conditions that need human attention but aren't code errors
- **Who it's for**: Operations team, advisors, admins
- **How it works**: Explicit `dispatchAlert()` calls in business logic
- **Examples**: Plaid sync stale for 24h, plan limit at 80%, compliance deadline in 3 days, new user signup
- **Channels**: Discord webhooks, email via Resend, in-app notification bell
- **Setup**: See [alerts-setup.md](../alerts-setup.md)

### Quick Decision Guide

| Situation | System |
|-----------|--------|
| Code threw an exception | Sentry (automatic) |
| Plaid API returned an error we handle gracefully | App Alert (manual dispatch) |
| React component crashed | Sentry (automatic via Error Boundary) |
| Document expires in 2 days | App Alert (from check-expirations cron) |
| Database connection dropped | Sentry (automatic) |
| Plan usage at 90% | App Alert (from checkPlanLimitAlerts) |
| Webhook handler crashed unexpectedly | **Both** — Sentry captures the error, App Alert notifies ops |

When a webhook catch block fires, it **both** logs to Sentry (automatic) and dispatches an App Alert (explicit). This is intentional: Sentry gives developers the stack trace, while the App Alert gives ops the business context and immediate visibility.

---

## Sentry Free Tier

- **5,000 errors/month**
- **10,000 performance transactions/month**
- **500 session replays/month**
- 1 team member
- For teams, the Team plan starts at $26/month
