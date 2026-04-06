# Google Calendar Setup Guide

Google Calendar integration lets advisors sync events bidirectionally, view upcoming meetings in the dashboard, and automatically create calendar events when booking requests are approved.

---

## 1. Prerequisites

This integration reuses the same Google Cloud project and OAuth credentials as Google sign-in. You should already have:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in `.env`
- A Google Cloud project with OAuth consent screen configured

If not, follow [google-oauth-setup.md](google-oauth-setup.md) first.

---

## 2. Enable the Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** > **Library**
4. Search for **Google Calendar API**
5. Click **Enable**

---

## 3. Add Calendar Scopes to OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Click **Edit App**
3. Under **Scopes**, add:
   - `https://www.googleapis.com/auth/calendar.readonly` — Read events
   - `https://www.googleapis.com/auth/calendar.events` — Create/modify events
4. Save

---

## 4. Add the OAuth Callback URL

1. Go to **APIs & Services** > **Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.com/api/webhooks/google-calendar/callback
   ```
   For local dev: `http://localhost:3000/api/webhooks/google-calendar/callback`
4. Save

---

## 5. How It Works

The integration uses a per-organization OAuth flow:

```
User clicks "Connect Google Calendar" (Integrations page)
  → Server generates OAuth URL with Calendar scopes
  → User consents on Google
  → Callback exchanges code for tokens
  → Tokens stored in `integrations` table (encrypted in settings JSONB)
  → Events sync into `calendar_events` table
```

### Key files

| File | Purpose |
|------|---------|
| `lib/integrations/google-calendar.ts` | OAuth flow, token refresh, event sync/push |
| `app/api/webhooks/google-calendar/callback/route.ts` | OAuth callback handler |
| `lib/actions/integration.actions.ts` | Server actions (auth URL, disconnect) |
| `lib/hooks/crud/use-calendar-events.ts` | Client-side Apollo hooks |
| `app/(dashboard)/app/calendar/page.tsx` | Advisor calendar page |
| `app/(client)/client/calendar/page.tsx` | Client portal calendar |

### Token management

- Access tokens auto-refresh when within 60 seconds of expiration
- Tokens stored in `integrations.settings` JSONB with `_` prefix (stripped from client responses)
- Disconnect revokes tokens with Google (best-effort) and clears settings

### Event sync (pull)

- Pulls events from Google Calendar within a date range
- Upserts into `calendar_events` by `metadata.googleEventId` (no duplicates)
- Handles cancelled events via soft delete (`deletedAt` timestamp)
- All-day events: Google uses exclusive end dates (June 15 event → end June 16); we convert to inclusive
- Handles 429 rate limits (partial sync) and 401 revoked tokens (marks integration as error)

### Event creation (push)

- Creates events directly in the user's Google Calendar
- Attendees receive automatic calendar invitations from Google

---

## 6. Personal Calendar (for Booking Confirmations)

A separate module (`lib/schedule/google-calendar.ts`) creates events on the advisor's personal calendar when booking requests are approved. This uses a long-lived refresh token instead of per-org OAuth.

### One-time setup via OAuth Playground

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (top right) > check **Use your own OAuth credentials**
3. Enter your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
4. In the left panel, find **Calendar API v3** > select `https://www.googleapis.com/auth/calendar.events`
5. Click **Authorize APIs** > sign in with your personal Google account
6. Click **Exchange authorization code for tokens**
7. Copy the **Refresh token**

### Add to `.env`

```env
PERSONAL_GOOGLE_REFRESH_TOKEN=1//your-refresh-token-here
PERSONAL_GOOGLE_CALENDAR_ID=primary
```

---

## 7. Database Tables

### `integrations` (stores connection)

Relevant fields for Google Calendar:
- `provider`: `"google_calendar"`
- `status`: `connected | disconnected | error`
- `settings`: `{ _access_token, _refresh_token, expires_at }`
- `lastSyncAt`, `lastSyncStatus`, `syncErrorMessage`

### `calendar_events` (stores synced events)

| Column | Type | Notes |
|--------|------|-------|
| `orgId` | UUID | Organization scope |
| `clientId` | UUID? | Optional client association |
| `title` | text | Event title |
| `type` | enum | meeting, payment, dividend, deadline, document, call |
| `date` | text | "YYYY-MM-DD" |
| `time` / `endTime` | text? | "HH:MM" (null for all-day) |
| `attendees` | JSONB | Array of email strings |
| `metadata` | JSONB | `{ googleEventId, source, isAllDay, isRecurring }` |

---

## 8. Testing

```bash
# Integration tests
npm test -- tests/integration/google-calendar-sync.test.ts

# Unit tests
npm test -- tests/unit/google-calendar.edge-cases.test.ts
npm test -- tests/unit/calendar-event.schema.test.ts

# E2E
npm run test:e2e -- tests/e2e/google-calendar.spec.ts
```

---

## 9. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Connect" button doesn't appear | `GOOGLE_CLIENT_ID` not set | Set env var, restart server |
| Sync fails with "invalid_grant" | User revoked access in Google settings | Disconnect and reconnect |
| Events not appearing | Sync hasn't run yet | Trigger manual sync from integrations page |
| All-day events off by one day | Google exclusive end date issue | Should be handled — check `metadata.isAllDay` |
