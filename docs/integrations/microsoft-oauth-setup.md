# Microsoft / Azure OAuth Setup Guide

Microsoft OAuth lets users sign in to Lacoda Capital with their Microsoft account or work/school (Azure AD) account — the "Continue with Microsoft" button on login/signup.

This requires setup in **two** places: Microsoft Azure Portal and Supabase Dashboard.

---

## 1. Create an Azure App Registration

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with a Microsoft account (personal or work/school)
3. Search for **App registrations** in the top search bar
4. Click **+ New registration**
5. Fill in:
   - **Name**: `Lacoda Capital`
   - **Supported account types**: Choose based on your needs:
     - **Personal Microsoft accounts only** — for consumer apps
     - **Accounts in any organizational directory and personal accounts** — for both work and personal accounts (most common)
     - **Accounts in any organizational directory only** — for enterprise/B2B only
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `https://YOUR-SUPABASE-PROJECT-REF.supabase.co/auth/v1/callback`
6. Click **Register**

---

## 2. Get Your Client ID and Secret

### Client (Application) ID
After registration, you'll see the **Overview** page. Copy the:
- **Application (client) ID** — looks like `12345678-abcd-efgh-ijkl-1234567890ab`

### Client Secret
1. In the left sidebar, click **Certificates & secrets**
2. Click **+ New client secret**
3. Set:
   - **Description**: `Lacoda Capital Production`
   - **Expires**: Choose an expiration (6 months, 12 months, or 24 months)
4. Click **Add**
5. **Copy the Value immediately** — it's only shown once. It looks like `abcdefg~hijklmno_pqrstuvwxyz123456`

> **Important**: Set a calendar reminder to rotate the secret before it expires. Azure does NOT auto-renew secrets.

---

## 3. Configure API Permissions

1. In the left sidebar, click **API permissions**
2. Click **+ Add a permission** > **Microsoft Graph** > **Delegated permissions**
3. Add these permissions:
   - `openid` (should already be there)
   - `email`
   - `profile`
   - `offline_access` (for refresh tokens)
4. Click **Add permissions**
5. If you see a "Grant admin consent" button and you're an Azure admin, click it. Otherwise, each user will consent individually on first login.

---

## 4. Enable Azure Provider in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Azure** (Microsoft) and toggle it **ON**
5. Paste in:
   - **Client ID**: The Application (client) ID from Step 2
   - **Client Secret**: The client secret value from Step 2
   - **Azure Tenant URL**: depends on your account type choice:
     - For "any organizational directory + personal": `https://login.microsoftonline.com/common`
     - For "organizational directory only": `https://login.microsoftonline.com/organizations`
     - For a specific tenant: `https://login.microsoftonline.com/YOUR-TENANT-ID`
6. Click **Save**

---

## 5. Add to Your `.env` File

The Microsoft OAuth flow is handled by Supabase, but you can optionally store the IDs for reference:

```env
# Microsoft / Azure OAuth
# The actual OAuth flow is handled by Supabase using the credentials you
# entered in the Supabase dashboard. These are here for reference.
AZURE_CLIENT_ID=12345678-abcd-efgh-ijkl-1234567890ab
AZURE_CLIENT_SECRET=abcdefg~hijklmno_pqrstuvwxyz123456
```

> These env vars aren't currently read by the app code — the OAuth is entirely handled by Supabase. They're here so you don't lose track of the values.

---

## 6. How It Works in the Code

The OAuth flow is handled in [lib/actions/auth.actions.ts](../../lib/actions/auth.actions.ts):

```
User clicks "Continue with Microsoft"
  → getOAuthUrlAction("azure") is called
  → Supabase generates a Microsoft OAuth URL
  → The "azure" provider requests these scopes: openid, email, profile, offline_access
  → User is redirected to Microsoft's login screen
  → User signs in and consents → Microsoft redirects to Supabase callback
  → Supabase creates/signs in the user
  → Supabase redirects to your app at /auth/callback
  → /auth/callback route exchanges the code for a session
  → User is redirected to /app or /client
```

Note the special scopes handling in the code:
```typescript
// Request offline_access for Azure so we get a refresh token
...(provider === "azure" && { scopes: "openid email profile offline_access" }),
```

---

## 7. Test It

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click **Continue with Microsoft**
4. Sign in with a Microsoft account
5. You should be redirected back and logged in
6. Check Supabase Dashboard > Authentication > Users — the Microsoft user should appear with `azure` as the provider

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "AADSTS50011: The redirect URI does not match" | The redirect URI in Azure doesn't match Supabase's callback. It must be exactly: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` |
| "AADSTS700016: Application not found" | Client ID is wrong. Copy it again from Azure > App registrations > Overview |
| "AADSTS7000215: Invalid client secret" | Client secret is wrong or expired. Create a new one in Azure > Certificates & secrets |
| Works with personal accounts but not work accounts | Check the "Supported account types" setting in Azure > App registrations > Authentication |
| "Admin consent required" error | An Azure admin needs to grant consent, or change the permission to not require admin consent |
| User signs in but no email in Supabase | Make sure `email` is in the API permissions and the user's Microsoft account has an email |

---

## Production Checklist

- [ ] Add production Supabase callback URL as a redirect URI in Azure
- [ ] Verify API permissions include `openid`, `email`, `profile`, `offline_access`
- [ ] Set a calendar reminder to rotate the client secret before it expires
- [ ] Grant admin consent if required for your organization
- [ ] Update `NEXT_PUBLIC_SITE_URL` in production environment
- [ ] If using a specific tenant, update the Azure Tenant URL in Supabase

---

## Azure Free Tier

- Azure App registrations and OAuth are **free** — no Azure subscription required
- You only need an Azure account (free to create)
- There are no per-authentication charges from Microsoft
