# QuickBooks Accounting Sync Setup Guide

QuickBooks syncs billing records from Lacoda Capital to your accounting system — invoices, customers, and payment status.

---

## 1. Create an Intuit Developer Account

1. Go to [https://developer.intuit.com](https://developer.intuit.com)
2. Click **Sign Up** and create an account
3. You get access to the **Sandbox** environment (free test company)

---

## 2. Create an App

1. Go to **Dashboard** > **My Apps** > **Create an App**
2. Select **QuickBooks Online and Payments**
3. Set:
   - **App Name**: `Lacoda Capital`
   - **Scope**: Select **Accounting**
4. Click **Create App**
5. Go to your app's **Keys & OAuth** page
6. Copy:
   - **Client ID**
   - **Client Secret**

---

## 3. Configure Redirect URIs

1. In your app settings, go to **Keys & OAuth**
2. Under **Redirect URIs**, add:
   - `http://localhost:3000/api/webhooks/quickbooks/callback` (development)
   - `https://your-domain.com/api/webhooks/quickbooks/callback` (production)
3. Save

---

## 4. Add to Your `.env` File

```env
# QuickBooks
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_ENV=sandbox
```

Change `QUICKBOOKS_ENV` to `production` when ready.

---

## 5. How It Works

### Architecture
- **Server Actions** handle OAuth and accounting sync
- **No webhook needed initially** — sync is advisor-initiated
- See [architecture-decision.md](architecture-decision.md) for the full explanation

### Files
| File | Purpose |
|---|---|
| `lib/integrations/quickbooks.ts` | QuickBooks API client — OAuth, invoices, chart of accounts |
| `lib/actions/integration.actions.ts` | `getQuickBooksAuthUrl()` — starts OAuth flow |
| `lib/hooks/crud/use-integrations.ts` | `useOAuthConnect("quickbooks")` — React hook |

### Flow
```
Admin clicks "Connect QuickBooks" on Integrations page
  → OAuth redirect to Intuit consent screen
  → User authorizes accounting access → redirected back with auth code + realmId
  → Server exchanges code for access + refresh tokens
  → Tokens + realmId stored encrypted in integration record

Advisor clicks "Sync to QuickBooks" on Billing page
  → getChartOfAccounts() fetches account list for mapping
  → createInvoice() pushes billing records as QB invoices
  → QB customers auto-created if they don't exist
  → Invoice appears in QuickBooks for the client
```

### Key Concept: Realm ID
QuickBooks identifies each company with a **Realm ID** (also called Company ID). This is returned during the OAuth flow and must be stored — every API call requires it.

---

## 6. Test with Sandbox Company

Intuit provides a sandbox company with test data:

1. Go to [https://developer.intuit.com/app/developer/sandbox](https://developer.intuit.com/app/developer/sandbox)
2. You'll see a pre-populated test company with customers, invoices, accounts
3. Use this to test your sync without affecting real data

---

## 7. Token Refresh

QuickBooks access tokens expire after **1 hour**. Refresh tokens expire after **100 days**.

The `getAccessToken()` function in `quickbooks.ts` handles automatic refresh. If the refresh token expires, the user will need to re-authorize.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Invalid_grant" error | Auth code expired (10 min TTL) or has already been used. Restart OAuth flow |
| "AuthenticationFailed" | Client ID or Secret is wrong, or doesn't match the environment |
| "Business Validation Error" on invoice | Required fields missing. Check customer exists and amount is positive |
| "Stale Object Error" (409) | Another process modified the object. Fetch the latest version and retry |
| Refresh token expired | User must re-authorize. Refresh tokens last 100 days |

---

## QuickBooks Pricing

- **QuickBooks API**: Free to use (no per-API-call charges)
- **QuickBooks Online subscription** (required for end users):
  - Simple Start: $30/month
  - Essentials: $60/month
  - Plus: $90/month
- Your app just syncs data — the client needs their own QB subscription
