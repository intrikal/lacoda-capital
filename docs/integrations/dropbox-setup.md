# Dropbox Document Storage Setup Guide

Dropbox lets advisors import and sync client documents between a Dropbox folder and the Lacoda Capital vault.

---

## 1. Create a Dropbox App

1. Go to [https://www.dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)
2. Click **Create app**
3. Choose **Scoped access**
4. Choose **Full Dropbox** (or **App folder** if you want to restrict access)
5. Name your app (e.g., `Lacoda Capital`)
6. Click **Create app**

---

## 2. Configure Permissions

1. Go to the **Permissions** tab in your Dropbox App Console
2. Enable these scopes:
   - `files.metadata.read` — list files and folders
   - `files.content.read` — download files
   - `files.content.write` — upload files
   - `account_info.read` — get account details
3. Click **Submit** to save

> **Note**: Changes to permissions only take effect for new OAuth tokens. If you've already connected, you'll need to reconnect.

---

## 3. Add Redirect URI

1. Go to the **Settings** tab
2. Under **OAuth 2**, add redirect URIs:
   - `http://localhost:3000/api/webhooks/dropbox/callback` (development)
   - `https://your-domain.com/api/webhooks/dropbox/callback` (production)
3. Save

---

## 4. Get Your Credentials

From the **Settings** tab, copy:
- **App key** → `DROPBOX_APP_KEY`
- **App secret** → `DROPBOX_APP_SECRET`

---

## 5. Environment Variables

Add to your `.env` file:

```bash
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
```

---

## 6. How It Works

### Architecture
- **Server Actions** handle OAuth and file operations
- **PKCE** (Proof Key for Code Exchange) secures the OAuth flow — no client_secret sent to the browser
- **No webhook needed** — file import is on-demand
- **Cursor-based pagination** — Dropbox returns a cursor to resume listing where you left off

### Files
| File | Purpose |
|---|---|
| `lib/integrations/dropbox.ts` | Dropbox API client — OAuth PKCE, file listing, download, upload |
| `lib/actions/integration.actions.ts` | `getDropboxAuthUrl()` — starts OAuth flow |
| `lib/hooks/crud/use-integrations.ts` | `useOAuthConnect("dropbox")` — React hook |

### Flow
```
Admin clicks "Connect Dropbox" on Integrations page
  → OAuth redirect to Dropbox consent screen (with PKCE challenge)
  → User authorizes file access → redirected back with auth code
  → Server exchanges code + PKCE verifier for access + refresh tokens
  → Tokens stored encrypted in integration record

Advisor clicks "Import from Dropbox" in the Vault
  → listFiles() fetches folder contents from Dropbox
  → Advisor picks files to import
  → downloadFile() fetches each file
  → Files uploaded to Supabase Storage
  → Document records created in the database
```

### PKCE Flow (Why It's Different from Google Drive)
```
1. App generates random code_verifier (32 bytes)
2. App SHA-256 hashes verifier → code_challenge
3. Auth URL includes code_challenge (but NOT the verifier)
4. User authorizes → Dropbox sends auth code back
5. Token exchange sends code + code_verifier
6. Dropbox re-hashes verifier, checks it matches → issues tokens

This prevents anyone who intercepts the auth code from
exchanging it for tokens (they don't have the verifier).
```

---

## 7. Dropbox-Specific Considerations

### Path Handling
- Dropbox uses human-readable paths (`/Documents/2024`) not opaque IDs
- Paths are **case-insensitive**: `/Docs` and `/docs` are the same folder
- Empty string `""` means the root folder

### Cursor Pagination
- First listing returns a cursor + `has_more: true/false`
- To get the next page, call `/list_folder/continue` with the cursor
- Cursors expire after ~7 days of inactivity — restart from scratch if expired

### File Types
- Regular files: `is_downloadable: true` → import normally
- Dropbox Paper: `is_downloadable: false` → skip (can't download as file)
- Folders: skip (no document record needed)
- Deleted: mark existing vault document as deleted

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Invalid redirect URI" | Make sure the redirect URI in your Dropbox app settings matches exactly |
| "App not approved" | Your app may need Dropbox approval for production use. Development mode works for testing |
| Token refresh fails | Refresh token may have been revoked. User needs to reconnect |
| "path/not_found" error | The configured folder was renamed or deleted on Dropbox |
| "insufficient_space" | User's Dropbox quota is full — can't upload files |
| "too_many_write_operations" | Hit Dropbox rate limit — retry with exponential backoff |

---

## Dropbox API Pricing

- Dropbox API is **free** for development (up to 25 linked accounts)
- Production apps need Dropbox approval (also free for most use cases)
- Rate limits: ~100 requests per second per app (varies by endpoint)
- No per-file charges for downloading or uploading
