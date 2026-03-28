# Google Drive Document Storage Setup Guide

Google Drive lets advisors import client documents directly from Google Drive into the Lacoda Capital vault.

---

## 1. Use Your Existing Google Cloud Project

Google Drive uses the **same Google Cloud project** as Google OAuth sign-in. You already have `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — you just need to enable the Drive API and add Drive scopes.

---

## 2. Enable the Google Drive API

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Select your `Lacoda Capital` project
3. Go to **APIs & Services** > **Library**
4. Search for **Google Drive API**
5. Click **Enable**

---

## 3. Add Drive Scopes to OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Click **Edit App**
3. Under **Scopes**, click **Add or Remove Scopes**
4. Add: `https://www.googleapis.com/auth/drive.readonly`
5. Save

> **Note**: `drive.readonly` only allows reading files — your app cannot modify or delete files in the user's Drive. This is the safest scope for document import.

---

## 4. Add Redirect URI

1. Go to **APIs & Services** > **Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/integrations/google-drive/callback` (development)
   - `https://your-domain.com/api/integrations/google-drive/callback` (production)
4. Save

---

## 5. Environment Variables

No new env vars needed — Google Drive reuses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the Google OAuth setup.

---

## 6. How It Works

### Architecture
- **Server Actions** handle OAuth and file operations
- **No webhook needed** — file import is on-demand
- See [architecture-decision.md](architecture-decision.md) for the full explanation

### Files
| File | Purpose |
|---|---|
| `lib/integrations/google-drive.ts` | Google Drive API client — OAuth, file listing, file download |
| `lib/actions/integration.actions.ts` | `getGoogleDriveAuthUrl()` — starts OAuth flow |
| `lib/hooks/crud/use-integrations.ts` | `useOAuthConnect("google_drive")` — React hook |

### Flow
```
Admin clicks "Connect Google Drive" on Integrations page
  → OAuth redirect to Google consent screen (with Drive scope)
  → User authorizes file access → redirected back with auth code
  → Server exchanges code for access + refresh tokens
  → Tokens stored encrypted in integration record

Advisor clicks "Import from Drive" in the Vault
  → listFiles() fetches folder contents from Google Drive
  → Advisor picks files to import
  → downloadFile() fetches each file
  → Files uploaded to Supabase Storage
  → Document records created in the database
```

---

## 7. Google Drive Picker (Optional Enhancement)

For a better UX, you can use the Google Picker API to let users browse their Drive in a modal:

```bash
# No additional packages needed — the Picker is a Google-hosted JS widget
```

Add to your Google Cloud project:
1. Go to **APIs & Services** > **Library**
2. Search for **Google Picker API**
3. Click **Enable**

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Access Not Configured" | Google Drive API is not enabled. Go to APIs & Services > Library and enable it |
| "Insufficient Permission" | The OAuth token doesn't have Drive scope. User needs to re-authorize |
| Can't see shared drives | Shared drive files require `drive.readonly` scope and the `supportsAllDrives` query parameter |
| Token refresh fails | Refresh token may have been revoked. User needs to reconnect |
| Large files timing out | Google Drive has a 10MB direct download limit. For larger files, use resumable downloads |

---

## Google Drive Pricing

- Google Drive API is **free** (part of Google Cloud free tier)
- Rate limits: 12,000 queries per 100 seconds per project
- No per-file charges for downloading
