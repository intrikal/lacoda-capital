# Google OAuth Setup Guide

Google OAuth lets users sign in to Lacoda Capital with their Google account (the "Continue with Google" button on login/signup).

This requires setup in **two** places: Google Cloud Console and Supabase Dashboard.

---

## 1. Create a Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top and select **New Project**
3. Name it something like `Lacoda Capital` and click **Create**
4. Make sure the new project is selected in the dropdown

---

## 2. Configure the OAuth Consent Screen

Before creating credentials, Google requires you to set up a consent screen (what users see when they click "Continue with Google").

1. In the left sidebar, go to **APIs & Services** > **OAuth consent screen**
2. Click **Get Started** (or **Configure Consent Screen**)
3. Fill in:
   - **App name**: `Lacoda Capital`
   - **User support email**: Your email
   - **App logo**: Upload the Lacoda Capital logo (optional)
4. Under **Audience**, select:
   - **External** (unless you're only allowing users from your Google Workspace org)
5. Under **Contact Information**, add your developer email
6. Under **Scopes**, click **Add or Remove Scopes** and add:
   - `email`
   - `profile`
   - `openid`
7. Click **Save and Continue** through the remaining steps

> **Note**: While in "Testing" mode, only test users you explicitly add can sign in. To allow anyone, you'll need to **Publish** the app (Google may require verification for production apps).

---

## 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth client ID**
3. Set:
   - **Application type**: `Web application`
   - **Name**: `Lacoda Capital Web`
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local development)
   - `https://your-production-domain.com` (for production)
5. Under **Authorized redirect URIs**, add:
   - `https://YOUR-SUPABASE-PROJECT-REF.supabase.co/auth/v1/callback`

   > **Important**: This redirect URI points to **Supabase**, not your app. Supabase handles the OAuth exchange and then redirects to your app. Find your project ref in Supabase Dashboard > Settings > General.

6. Click **Create**
7. Copy the **Client ID** and **Client Secret** — you'll need both

---

## 4. Enable Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Google** and toggle it **ON**
5. Paste in:
   - **Client ID**: The client ID from Step 3
   - **Client Secret**: The client secret from Step 3
6. Click **Save**

---

## 5. Add to Your `.env` File

```env
# Google OAuth
# These are used by the app to display the provider name, but the actual
# OAuth flow is handled entirely by Supabase using the credentials you
# entered in the Supabase dashboard.
GOOGLE_CLIENT_ID=622824799035-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
```

---

## 6. How It Works in the Code

The OAuth flow is handled in [lib/actions/auth.actions.ts](../../lib/actions/auth.actions.ts):

```
User clicks "Continue with Google"
  → getOAuthUrlAction("google") is called
  → Supabase generates a Google OAuth URL
  → User is redirected to Google's consent screen
  → User approves → Google redirects to Supabase callback
  → Supabase creates/signs in the user
  → Supabase redirects to your app at /auth/callback
  → /auth/callback route exchanges the code for a session
  → User is redirected to /app (advisor) or /client (client portal)
```

---

## 7. Test It

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click **Continue with Google**
4. You should see Google's consent screen
5. After approving, you should be redirected back to the app and logged in
6. Check Supabase Dashboard > Authentication > Users — the Google user should appear

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Error 400: redirect_uri_mismatch" | The redirect URI in Google Console doesn't match Supabase's callback URL. Make sure it's `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` |
| "Access blocked: This app's request is invalid" | OAuth consent screen is not configured or app is in Testing mode and user isn't added as a test user |
| User signs in but gets "Login failed" | Check that the Google provider is enabled in Supabase Dashboard > Authentication > Providers |
| Works locally but not in production | Add your production domain to both Authorized JavaScript Origins and Redirect URIs in Google Console |
| "This app isn't verified" warning | Normal during development. For production, submit for Google verification |

---

## Production Checklist

- [ ] Add production domain to Authorized JavaScript Origins in Google Console
- [ ] Add production Supabase callback URL to Authorized Redirect URIs
- [ ] Add production URL to Supabase Authentication > URL Configuration > Redirect URLs
- [ ] Publish the OAuth consent screen (and verify with Google if required)
- [ ] Update `NEXT_PUBLIC_SITE_URL` in production environment to your domain
