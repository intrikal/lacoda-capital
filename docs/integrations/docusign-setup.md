# DocuSign E-Signature Setup Guide

DocuSign lets advisors send documents for electronic signature directly from Lacoda Capital — client agreements, authorization forms, operating agreements, etc.

---

## 1. Create a DocuSign Developer Account

1. Go to [https://developers.docusign.com](https://developers.docusign.com)
2. Click **Get Started** and create a free developer account
3. You get a **sandbox** (demo) environment with 50 free envelopes/month

---

## 2. Create an App (Integration Key)

1. Go to [https://admindemo.docusign.com/apps-and-keys](https://admindemo.docusign.com/apps-and-keys)
2. Click **Add App and Integration Key**
3. Set:
   - **App Name**: `Lacoda Capital`
4. Copy the **Integration Key** (this is your client ID)
5. Under **Authentication**, click **+ Add Secret Key**
6. Copy the **Secret Key** (only shown once)
7. Under **Additional Settings** > **Redirect URIs**, add:
   - `http://localhost:3000/api/webhooks/docusign/callback` (development)
   - `https://your-domain.com/api/webhooks/docusign/callback` (production)
8. Click **Save**

---

## 3. Get Your Account ID

1. On the same Apps and Keys page, find **API Account ID** at the top
2. Copy it — looks like `12345678-abcd-efgh-ijkl-123456789012`

---

## 4. Add to Your `.env` File

```env
# DocuSign
DOCUSIGN_INTEGRATION_KEY=12345678-abcd-efgh-ijkl-123456789012
DOCUSIGN_SECRET_KEY=your-secret-key
DOCUSIGN_ACCOUNT_ID=your-api-account-id
DOCUSIGN_BASE_URL=https://demo.docusign.net
DOCUSIGN_WEBHOOK_SECRET=your-hmac-key
```

For production, change `DOCUSIGN_BASE_URL` to your production base URL (e.g., `https://na1.docusign.net`).

---

## 5. How It Works

### Architecture
- **Server Actions** send documents for signature and check status
- **OAuth flow** authorizes DocuSign access per-org
- **Webhook API Route** (`/api/webhooks/docusign`) receives signature events
- See [architecture-decision.md](architecture-decision.md) for the full explanation

### Files
| File | Purpose |
|---|---|
| `lib/integrations/docusign.ts` | DocuSign API client — OAuth, envelopes, document download |
| `app/api/webhooks/docusign/route.ts` | Webhook handler — envelope completed/declined/voided |
| `lib/actions/integration.actions.ts` | `getDocuSignAuthUrl()` — starts OAuth flow |
| `lib/hooks/crud/use-integrations.ts` | `useOAuthConnect("docusign")` — React hook |

### Flow
```
Admin clicks "Connect DocuSign" on Integrations page
  → OAuth redirect to DocuSign consent screen
  → User authorizes → redirected back with auth code
  → Server exchanges code for access + refresh tokens
  → Tokens stored encrypted in integration record

Advisor clicks "Send for Signature" on a document
  → sendForSignature() creates a DocuSign envelope
  → Client receives email from DocuSign
  → Client signs electronically
  → DocuSign sends webhook → /api/webhooks/docusign
  → Document status updated to "verified"
  → Signed PDF downloaded and stored in Supabase Storage
```

---

## 6. Signing Anchor Tags

Documents sent through DocuSign use **anchor tags** to position signature fields. Add these text markers to your documents:

| Marker | Field |
|---|---|
| `/sig1/` | "Sign Here" field |
| `/date1/` | "Date Signed" field |

These are invisible in the final signed document. Place them where you want the signature to appear.

---

## 7. Test in Sandbox

The sandbox environment uses `demo.docusign.net`. Test envelopes:
- Send to any email address
- Recipient gets a real DocuSign email
- Signing works exactly like production
- No charges for sandbox envelopes

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "AUTHORIZATION_INVALID_GRANT" | Auth code expired (5 min TTL). Restart the OAuth flow |
| "USER_AUTHENTICATION_FAILED" | Integration Key or Secret Key is wrong |
| Redirect URI mismatch | The redirect URI in your app must exactly match what's registered in DocuSign |
| Webhook not received | Check that `eventNotification` is included in the envelope creation payload |
| "ENVELOPE_CANNOT_VOID_ENVELOPE" | Envelope is already completed or already voided |

---

## DocuSign Pricing

- **Developer sandbox**: Free (50 envelopes/month)
- **Personal**: $10/month (5 envelopes/month)
- **Standard**: $25/user/month (unlimited envelopes)
- **Business Pro**: $40/user/month (advanced features)
- For API access at scale, contact DocuSign sales
