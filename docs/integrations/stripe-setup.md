# Stripe Payment Setup Guide

Stripe handles payment collection for Lacoda Capital — advisory fee invoices, subscription billing, and payment tracking.

---

## 1. Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Create an account and verify your email
3. Complete the business onboarding (bank account for payouts, business info)

---

## 2. Get Your API Keys

1. Go to **Developers** > **API keys** in the Stripe Dashboard
2. You'll see two key pairs — **test** and **live**:

| Key | Prefix | Where it goes |
|---|---|---|
| **Publishable key** | `pk_test_` / `pk_live_` | `.env` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (safe for browser) |
| **Secret key** | `sk_test_` / `sk_live_` | `.env` as `STRIPE_SECRET_KEY` (server-only, never expose) |

Start with **test keys** for development. Switch to **live keys** for production.

---

## 3. Set Up Webhooks

Stripe notifies your app when payments complete, fail, or change.

1. Go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Set:
   - **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
   - **Events to send**: Select these:
     - `invoice.paid`
     - `invoice.payment_failed`
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`) — this goes in your `.env`

For local development, use the Stripe CLI:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will print a webhook signing secret — use that for local testing.

---

## 4. Create Subscription Products & Prices

Lacoda Capital uses 4 paid subscription tiers. You must create these as Products in Stripe before the billing UI will work.

### In Stripe Dashboard → Product catalog:

Create 4 products, each with a **monthly** and **annual** price:

| Product name | Monthly price | Annual price (20% off) |
|---|---|---|
| **Starter** | $299/month | $239/month (billed $2,868/year) |
| **Growth** | $599/month | $479/month (billed $5,748/year) |
| **Professional** | $999/month | $799/month (billed $9,588/year) |
| **Elite** | $1,499/month | $1,199/month (billed $14,388/year) |

For each product:
1. Click **Add product**
2. Set the product name (e.g. "Lacoda Starter")
3. Set billing as **Recurring**
4. Add a **monthly** price and an **annual** price
5. Copy each price ID (starts with `price_`)

### Add all 8 price IDs to `.env`:

```env
STRIPE_PRICE_STARTER_MONTHLY=price_xxxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxxx
STRIPE_PRICE_GROWTH_ANNUAL=price_xxxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxxx
STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_xxxx
STRIPE_PRICE_ELITE_MONTHLY=price_xxxx
STRIPE_PRICE_ELITE_ANNUAL=price_xxxx
```

---

## 5. Add to Your `.env` File

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

# Subscription plan price IDs (see section 4 above)
STRIPE_PRICE_STARTER_MONTHLY=price_xxxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxxx
STRIPE_PRICE_GROWTH_ANNUAL=price_xxxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxxx
STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_xxxx
STRIPE_PRICE_ELITE_MONTHLY=price_xxxx
STRIPE_PRICE_ELITE_ANNUAL=price_xxxx
```

---

## 6. How It Works

### Architecture
- **Server Actions** handle user-initiated operations (create invoice, open checkout)
- **Webhook API Route** (`/api/webhooks/stripe`) handles async events from Stripe
- See [architecture-decision.md](architecture-decision.md) for the full explanation

### Files
| File | Purpose |
|---|---|
| `lib/integrations/stripe.ts` | Stripe API client — customer management, invoices, checkout sessions |
| `app/api/webhooks/stripe/route.ts` | Webhook handler — processes payment events |
| `lib/actions/integration.actions.ts` | `connectStripeIntegration()` — registers Stripe for an org |
| `lib/hooks/crud/use-integrations.ts` | `useStripeConnect()` — React hook for the UI |

### Flow
```
Advisor creates billing record
  → createInvoice() creates Stripe Invoice
  → Stripe emails the client
  → Client clicks "Pay" → Stripe Checkout
  → Payment processes → Stripe sends webhook
  → /api/webhooks/stripe receives "invoice.paid"
  → Billing record updated to "paid"
```

---

## 7. Stripe Customer Portal

Clients can manage their own payment methods and view invoice history:

```typescript
const url = await createBillingPortalSession(customerId, returnUrl)
// Redirect client to url
```

To enable the Customer Portal:
1. Go to **Settings** > **Billing** > **Customer Portal**
2. Configure which features clients can access
3. Add your branding (logo, colors)

---

## 8. Test with Test Cards

Stripe provides test card numbers for development:

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | Requires 3D Secure |
| `4000 0000 0000 0002` | Card declined |

Use any future expiry date, any 3-digit CVC, any billing postal code.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "No Stripe price configured for growth monthly" | Add the missing `STRIPE_PRICE_GROWTH_MONTHLY` env var (see section 4) |
| "No Stripe price configured for elite monthly" | Add `STRIPE_PRICE_ELITE_MONTHLY` — you need all 8 price IDs set |
| Plan stays "free" after checkout | Stripe webhook not configured — check `STRIPE_WEBHOOK_SECRET` and section 3 |

### Original troubleshooting

| Problem | Solution |
|---|---|
| "No such customer" error | Customer hasn't been created yet — `getOrCreateCustomer()` handles this automatically |
| Webhook returns 400 | Check `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard |
| Payments work in test but not live | Switch from `sk_test_` to `sk_live_` keys and verify business onboarding is complete |
| "Your account cannot currently make live charges" | Complete Stripe's identity verification in Settings > Account details |

---

## Stripe Pricing

- **2.9% + $0.30** per successful card charge
- **0.5%** additional for international cards
- **Invoicing**: Free for up to 25 invoices/month, then $0.40/invoice
- No monthly fees, no setup fees
