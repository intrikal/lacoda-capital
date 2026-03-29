# Salesforce CRM Integration Setup Guide

Salesforce syncs client records and pipeline deals bi-directionally between Salesforce and Lacoda Capital.

---

## 1. Create a Salesforce Connected App

1. Log in to Salesforce at [https://login.salesforce.com](https://login.salesforce.com)
2. Go to **Setup** (gear icon top-right) > search **App Manager**
3. Click **New Connected App**
4. Set:
   - **Connected App Name**: `Lacoda Capital`
   - **API Name**: `Lacoda_Capital` (auto-populated)
   - **Contact Email**: your admin email
5. Under **API (Enable OAuth Settings)**:
   - Check **Enable OAuth Settings**
   - **Callback URL**: add both:
     - `http://localhost:3000/api/webhooks/salesforce/callback` (development)
     - `https://your-domain.com/api/webhooks/salesforce/callback` (production)
   - **Selected OAuth Scopes**: add these:
     - `Access the identity URL service (id)`
     - `Manage user data via APIs (api)`
     - `Perform requests at any time (refresh_token, offline_access)`
6. Click **Save** (changes take 2-10 minutes to activate)
7. Go to **Manage Consumer Details** and copy:
   - **Consumer Key** (this is your Client ID)
   - **Consumer Secret** (this is your Client Secret)

---

## 2. Add to Your `.env` File

```env
# Salesforce
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

For **sandbox** orgs, change the login URL:

```env
SALESFORCE_LOGIN_URL=https://test.salesforce.com
```

---

## 3. How It Works

### Architecture
- **Server Actions** handle OAuth and data sync
- **No webhook needed initially** — sync is advisor-initiated
- See [architecture-decision.md](architecture-decision.md) for the full explanation

### Files
| File | Purpose |
|---|---|
| `lib/integrations/salesforce.ts` | Salesforce API client — OAuth, Contact/Opportunity sync, field mapping |
| `lib/actions/integration.actions.ts` | `getSalesforceAuthUrl()` — starts OAuth flow |
| `lib/hooks/crud/use-integrations.ts` | `useOAuthConnect("salesforce")` — React hook |

### Flow
```
Admin clicks "Connect Salesforce" on Integrations page
  -> OAuth redirect to Salesforce login/consent screen
  -> User authorizes API + refresh_token access -> redirected back with auth code
  -> Server exchanges code for access + refresh tokens + instance_url
  -> Tokens + instance_url stored encrypted in integration record

Advisor clicks "Sync Clients" on CRM page
  -> syncClients() queries Salesforce Contacts via SOQL
  -> Cursor-based pagination handles large orgs (50k+ records)
  -> Contacts mapped to our client schema via configurable field mapping
  -> Upserted into our clients table (no duplicates)

Advisor clicks "Sync Deals" on Pipeline page
  -> syncDeals() queries Salesforce Opportunities via SOQL
  -> Opportunities mapped to our deal schema
  -> Closed Won / Closed Lost handled via IsClosed + IsWon flags
```

### Key Concept: Instance URL
Salesforce orgs each have a unique **Instance URL** (e.g., `https://na1.salesforce.com` or a custom domain like `https://acme.my.salesforce.com`). This URL is returned during the OAuth flow and must be stored — every API call uses it as the base URL.

### Key Concept: SOQL
Salesforce uses **SOQL** (Salesforce Object Query Language), which is similar to SQL but specific to Salesforce. Example:
```sql
SELECT Id, FirstName, LastName, Email FROM Contact WHERE IsDeleted = false
```

---

## 4. Sandbox vs Production

| Environment | Login URL | Use case |
|---|---|---|
| Production | `https://login.salesforce.com` | Real client data |
| Sandbox | `https://test.salesforce.com` | Testing without affecting production |

Salesforce Developer Edition orgs (free) use the production login URL but have limited data capacity.

---

## 5. Token Behavior

- **Access tokens** expire after approximately **2 hours**
- **Refresh tokens** do **not expire** unless:
  - The admin revokes the connected app
  - The user changes their password (if the connected app's refresh token policy requires it)
  - The app is removed from the org
- The `getAccessToken()` function in `salesforce.ts` handles automatic refresh

---

## 6. Error Handling

| Error Code | Meaning | Our Response |
|---|---|---|
| `INVALID_SESSION_ID` | Token expired or revoked | Mark integration as "error", prompt re-auth |
| `REQUEST_LIMIT_EXCEEDED` | API rate limit hit | Retry with exponential backoff |
| `UNABLE_TO_LOCK_ROW` | Concurrent edit conflict | Retry up to 2 times |
| `ENTITY_IS_DELETED` | Record was deleted in SF | Skip the record |

---

## 7. API Limits

Salesforce enforces API request limits based on org edition:

| Edition | Daily API Requests |
|---|---|
| Developer | 15,000 |
| Professional | 100,000 |
| Enterprise | 100,000 |
| Unlimited | 5,000,000 |

Each SOQL query counts as 1 API request. Pagination (`nextRecordsUrl`) does not count as additional requests.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "invalid_grant" error | Auth code expired (15 min TTL), already used, or user denied access. Restart OAuth flow |
| "INVALID_CLIENT_ID" | Consumer Key is wrong or the connected app hasn't activated yet (wait 2-10 min) |
| "redirect_uri_mismatch" | Callback URL in Salesforce doesn't match `NEXT_PUBLIC_SITE_URL` + `/api/webhooks/salesforce/callback` |
| No Contacts returned | Check the connected user has read access to Contact records (profile/permission set) |
| "REQUEST_LIMIT_EXCEEDED" | You've hit your daily API limit. Wait until midnight UTC or contact Salesforce to increase limits |
| Custom fields not syncing | Update the field mapping in integration settings to include custom fields (e.g., `Custom_Field__c`) |

---

## Salesforce Pricing

- **Developer Edition**: Free (for development and testing)
- **Salesforce API**: Included in all paid editions (no per-call charges)
- **Paid editions** (required for production use):
  - Essentials: $25/user/month
  - Professional: $80/user/month
  - Enterprise: $165/user/month
  - Unlimited: $330/user/month
- Your app just syncs data — the client needs their own Salesforce subscription
