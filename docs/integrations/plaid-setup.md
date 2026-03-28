# Plaid Financial Data Setup Guide

Plaid connects bank accounts, brokerages, and investment platforms to automatically pull account balances, holdings, and transactions into Lacoda Capital.

---

## 1. Create a Plaid Account

1. Go to [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Create an account and verify your email
3. You start in **Sandbox** mode (free, uses test credentials)

---

## 2. Get Your API Keys

1. Go to **Team Settings** > **Keys** in the Plaid Dashboard
2. You'll see keys for each environment:

| Environment | Use Case | Cost |
|---|---|---|
| **Sandbox** | Development/testing with fake data | Free |
| **Development** | Testing with real bank accounts (100 live Items) | Free |
| **Production** | Live users connecting real accounts | Per-connection pricing |

Copy your:
- **Client ID** (same across all environments)
- **Secret** (different per environment)

---

## 3. Configure Products

In the Plaid Dashboard, go to **Products** and enable:
- **Auth** — Account and routing numbers
- **Transactions** — Transaction history
- **Investments** — Holdings, securities, and investment transactions

These are the products requested in `lib/integrations/plaid.ts` during Link token creation.

---

## 4. Set Up Webhooks

Plaid sends webhooks when data changes (new transactions, holdings updates, connection errors).

The webhook URL is configured per-connection during Link token creation (already handled in the code). But you need to know:

- **URL**: `https://your-domain.com/api/webhooks/plaid`
- Plaid signs webhooks with a verification key

For the webhook verification secret:
1. Go to **Team Settings** > **Webhooks**
2. Enable webhook verification
3. Copy the verification key

---

## 5. Add to Your `.env` File

```env
# Plaid
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
PLAID_WEBHOOK_SECRET=your_webhook_verification_key
```

Change `PLAID_ENV` to `development` or `production` when ready.

---

## 6. How It Works

### Architecture
- **Server Actions** create Link tokens and exchange public tokens
- **Plaid Link** (browser-side) handles the bank login UI
- **Webhook API Route** (`/api/webhooks/plaid`) receives data updates
- See [architecture-decision.md](architecture-decision.md) for the full explanation

### Files
| File | Purpose |
|---|---|
| `lib/integrations/plaid.ts` | Plaid API client — Link tokens, token exchange, balance/holdings fetching |
| `app/api/webhooks/plaid/route.ts` | Webhook handler — processes transaction/holdings/error events |
| `lib/actions/integration.actions.ts` | `createPlaidLinkToken()`, `exchangePlaidPublicToken()`, `refreshPlaidBalances()` |
| `lib/hooks/crud/use-integrations.ts` | `usePlaidConnect()`, `usePlaidRefresh()` — React hooks |

### Flow
```
User clicks "Connect Bank"
  → createPlaidLinkToken() creates a Link token (server-side)
  → Plaid Link opens in the browser
  → User logs into their bank through Plaid's UI
  → Plaid returns a public_token to the browser
  → exchangePublicToken() exchanges it for a permanent access_token (server-side)
  → Access token stored encrypted, integration record created
  → Plaid sends webhooks when data changes
  → /api/webhooks/plaid updates integration status
```

---

## 7. Test with Sandbox Credentials

In Sandbox mode, use these test credentials when Plaid Link opens:

| Field | Value |
|---|---|
| **Username** | `user_good` |
| **Password** | `pass_good` |

This connects a fake bank with test account data.

Other test users:
- `user_error` / `pass_error` — Triggers error states
- `user_custom` / `pass_custom` — Custom MFA flows

---

## 8. Plaid Link Component

To complete the integration, you'll need the Plaid Link React component:

```bash
npm install react-plaid-link
```

Then use it in a component:
```tsx
import { usePlaidLink } from "react-plaid-link"

function PlaidLinkButton({ linkToken, onSuccess }) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      // Exchange the public token via server action
      onSuccess(publicToken)
    },
  })

  return (
    <Button onClick={() => open()} disabled={!ready}>
      Connect Bank Account
    </Button>
  )
}
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "INVALID_API_KEYS" | Client ID or Secret is wrong. Check they match the environment |
| Link opens but shows "Something went wrong" | Check that the products you're requesting are enabled in Plaid Dashboard |
| Webhook not received | Verify webhook URL is accessible. For local dev, use ngrok or similar tunnel |
| "ITEM_LOGIN_REQUIRED" webhook | User's bank login expired. They need to re-authenticate via Plaid Link update mode |
| Holdings endpoint returns empty | Make sure "Investments" product is enabled and the test account has investment data |

---

## Plaid Pricing

- **Sandbox**: Free
- **Development**: Free (100 live Items)
- **Production**: Custom pricing based on volume
  - Typically $0.30–$1.50 per connection/month
  - Volume discounts available
  - Contact Plaid sales for a quote
