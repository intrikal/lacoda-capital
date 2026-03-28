# PostHog Analytics Setup Guide

PostHog provides product analytics for Lacoda Capital — tracking page views, feature usage, and user behavior. It's **optional**: the app works without it, you just won't have analytics.

---

## 1. Create a PostHog Account

1. Go to [https://posthog.com](https://posthog.com)
2. Click **Get started — free** and create an account
3. Choose **PostHog Cloud** (US or EU region)
   - US: `https://us.i.posthog.com`
   - EU: `https://eu.i.posthog.com`

---

## 2. Create a Project

1. After signing in, you'll be prompted to create a project
2. Name it `Lacoda Capital`
3. Select **Web** as the platform
4. You'll be shown a code snippet — you don't need it (the app already has PostHog integrated)

---

## 3. Get Your API Key

1. Go to **Project Settings** (gear icon in the sidebar)
2. Find **Project API Key** — it looks like `phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Copy it

---

## 4. Add to Your `.env` File

```env
# PostHog (optional — app works without it, just no analytics)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Use `https://eu.i.posthog.com` if you chose the EU region in Step 1.

---

## 5. How It Works in the Code

PostHog is integrated in three files:

### Provider (wraps the app)
**File**: [lib/analytics/posthog-provider.tsx](../../lib/analytics/posthog-provider.tsx)

- Initializes PostHog on the client side
- Captures page views manually (to exclude `/demo/*` routes)
- If `NEXT_PUBLIC_POSTHOG_KEY` is not set, the provider renders children without PostHog — no errors

### Server-side tracking
**File**: `lib/analytics/posthog-server.ts`

- For server-side event tracking (e.g., from Server Actions)

### Event tracking helper
**File**: `lib/analytics/track.ts`

- Provides `trackEvent()` helper for custom events throughout the app

---

## 6. Events Being Tracked

The app currently tracks these custom events:

| Event | When it fires |
|---|---|
| `asset_created` | User creates a new asset |
| `document_uploaded` | User uploads a document |
| `report_generated` | User generates a report |
| `search_performed` | User searches (global search) |
| `compliance_control_created` | User creates a compliance control |
| `$pageview` | Every page navigation (except `/demo/*` routes) |

---

## 7. Verify It's Working

1. Add the env vars and restart your dev server: `npm run dev`
2. Navigate around the app
3. In PostHog dashboard, go to **Activity** > **Live events**
4. You should see `$pageview` events appearing in real-time

---

## 8. Recommended PostHog Setup

After connecting, configure these in the PostHog dashboard for best results:

### Session Recording (optional)
1. Go to **Session Recording** in the sidebar
2. Enable it to see screen recordings of user sessions
3. Useful for debugging UI issues

### Feature Flags (optional)
1. Go to **Feature Flags** in the sidebar
2. Create flags to gradually roll out new features
3. Use `posthog.isFeatureEnabled('flag-name')` in your code

### Dashboards
1. Go to **Dashboards** > **New Dashboard**
2. Create a dashboard with:
   - Page views over time
   - Most used features (by event count)
   - User retention (weekly cohort)
   - Active users (DAU/WAU/MAU)

---

## Privacy Notes

The Lacoda Capital PostHog integration is configured with privacy in mind:

- **No autocapture**: Only explicitly tracked events are sent (see `autocapture: false`)
- **No demo tracking**: Events on `/demo/*` routes are not captured
- **No PII in events**: Users are identified by `org_id` + `user_id` only — no emails or names
- **LocalStorage persistence**: Uses `localStorage` instead of cookies

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No events showing in PostHog | Check that `NEXT_PUBLIC_POSTHOG_KEY` is set and you've restarted the dev server |
| Events show but wrong project | You may have copied the key from the wrong PostHog project |
| Ad blockers blocking PostHog | PostHog is blocked by some ad blockers. For production, consider using a [reverse proxy](https://posthog.com/docs/advanced/proxy) |
| `NEXT_PUBLIC_POSTHOG_HOST` wrong | US region: `https://us.i.posthog.com`, EU: `https://eu.i.posthog.com` |

---

## PostHog Free Tier

- **1 million events/month** free
- **5,000 session recordings/month** free
- **Unlimited** team members
- More than enough for most startups
