# Resend Email Setup Guide

Resend is the transactional email service for Lacoda Capital. It sends:
- **Document expiration reminders** — when documents are about to expire
- **Team invitation emails** — when someone is invited to join an org
- **Weekly digest emails** — summary of new assets, valuations, and deadlines

Emails are sent from a Supabase Edge Function (`send-email`), not from the Next.js app directly.

---

## 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click **Sign Up** and create an account
3. Verify your email address

---

## 2. Add and Verify Your Domain

To send emails from `notifications@lacoda.capital` (or your custom domain), you need to verify the domain.

1. In the Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `lacoda.capital`)
4. Resend will give you DNS records to add:

| Type | Name | Value |
|---|---|---|
| TXT | `_resend` | Verification string |
| MX | `send._domainkey` | Resend MX value |
| TXT | `send._domainkey` | DKIM key |

5. Add these DNS records at your domain registrar (Cloudflare, Namecheap, Route53, etc.)
6. Click **Verify** in Resend — DNS propagation can take up to 24 hours but usually takes minutes

> **For development**: You can skip domain verification and use Resend's free `onboarding@resend.dev` sender. Just note that emails sent from `onboarding@resend.dev` can only go to the email you signed up with.

---

## 3. Create an API Key

1. In the Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Set:
   - **Name**: `Lacoda Capital Production` (or `Development`)
   - **Permission**: **Sending access**
   - **Domain**: Select your verified domain (or "All domains")
4. Click **Create** and **copy the key** — it starts with `re_` and is only shown once

---

## 4. Add the API Key to Supabase Secrets

The Resend API key lives in Supabase Edge Function secrets, **not** in your `.env` file (the Edge Function runs on Supabase's servers, not yours).

```bash
# Set the secret via Supabase CLI
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

To verify it was set:
```bash
npx supabase secrets list
```

---

## 5. Update the Sender Email (if needed)

The sender email is hardcoded in the Edge Function. If you're using a different domain:

**File**: [supabase/functions/send-email/index.ts](../../supabase/functions/send-email/index.ts) — Line 2

```typescript
const FROM_EMAIL = "Lacoda Capital <notifications@lacoda.capital>"
```

Change `notifications@lacoda.capital` to match your verified domain, e.g.:
```typescript
const FROM_EMAIL = "Lacoda Capital <notifications@yourdomain.com>"
```

Then redeploy:
```bash
npx supabase functions deploy send-email
```

---

## 6. Deploy the Edge Function

If you haven't already (covered in the Supabase setup guide):

```bash
# Login and link to your project
npx supabase login
npx supabase link --project-ref your-project-ref

# Deploy the email function
npx supabase functions deploy send-email

# Also deploy the functions that call send-email
npx supabase functions deploy check-expirations
npx supabase functions deploy weekly-digest
```

---

## 7. Test Email Sending

Send a test email using curl:

```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "team_invite",
    "to": "your-email@example.com",
    "data": {
      "inviterName": "Kevin",
      "orgName": "Lacoda Capital",
      "role": "admin",
      "magicLink": "https://localhost:3000/auth/callback?token=test"
    }
  }'
```

You should receive a styled invitation email within seconds.

---

## 8. Email Types Reference

The `send-email` function supports three email types:

### `expiration_reminder`
```json
{
  "type": "expiration_reminder",
  "to": "user@example.com",
  "data": {
    "userName": "Kevin",
    "orgName": "Lacoda Capital",
    "documents": [
      {
        "name": "LLC Operating Agreement",
        "assetName": "Downtown Office",
        "expiresAt": "2024-03-15",
        "daysUntilExpiry": 7
      }
    ]
  }
}
```

### `team_invite`
```json
{
  "type": "team_invite",
  "to": "newuser@example.com",
  "data": {
    "inviterName": "Kevin",
    "orgName": "Lacoda Capital",
    "role": "assistant",
    "magicLink": "https://app.lacoda.capital/auth/callback?token=abc123"
  }
}
```

### `weekly_digest`
```json
{
  "type": "weekly_digest",
  "to": "user@example.com",
  "data": {
    "userName": "Kevin",
    "orgName": "Lacoda Capital",
    "period": "Mar 18 – Mar 24, 2024",
    "newAssets": [{"name": "Beach House", "assetClass": "Real Estate", "value": 850000}],
    "newValuations": [{"assetName": "Tech Fund", "value": 1200000, "change": 3.2}],
    "upcomingDeadlines": [{"title": "Q1 Report Filing", "dueDate": "Mar 31", "type": "Compliance"}]
  }
}
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Resend 403: Forbidden` | API key is wrong or expired. Regenerate in Resend dashboard and update the Supabase secret |
| `Resend 422: Sender not verified` | The `FROM_EMAIL` domain isn't verified in Resend. Add and verify your domain |
| Emails only go to your own address | You're using `onboarding@resend.dev` (free tier). Verify your own domain to send to anyone |
| Edge Function returns 502 | Check Supabase Dashboard > Edge Functions > Logs for the actual error |
| Emails go to spam | Add SPF, DKIM, and DMARC DNS records — Resend provides these during domain verification |

---

## Resend Free Tier Limits

- **100 emails/day** on the free plan
- **3,000 emails/month**
- For production, consider upgrading to Resend Pro ($20/month for 50,000 emails)
