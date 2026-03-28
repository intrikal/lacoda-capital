# Sanity CMS Setup Guide

Sanity is a headless CMS used for managing marketing content on Lacoda Capital (blog posts, landing pages, etc.). It's **optional**: the main app (dashboard, client portal) works without it.

---

## 1. Create a Sanity Account

1. Go to [https://www.sanity.io](https://www.sanity.io)
2. Click **Get started** and create an account (Google, GitHub, or email)

---

## 2. Create a New Project

1. Go to [https://www.sanity.io/manage](https://www.sanity.io/manage)
2. Click **Create New Project**
3. Set:
   - **Project name**: `Lacoda Capital`
   - **Use the free plan** (Sanity's free tier is generous)
4. Click **Create Project**
5. Note your **Project ID** — it looks like `a1b2c3d4` (shown in the project URL and settings)

---

## 3. Create a Dataset

Sanity organizes content into datasets (like database environments).

1. In your project settings, go to **Datasets**
2. You should already have a `production` dataset (created by default)
3. Optionally create a `staging` dataset for testing content changes

---

## 4. Create an API Token

1. In your project settings, go to **API** > **Tokens**
2. Click **Add API Token**
3. Set:
   - **Name**: `Lacoda Capital Backend`
   - **Permissions**: **Editor** (or **Viewer** if you only need read access)
4. Click **Save** and copy the token — it's only shown once

> **Note**: The token is needed for write operations and draft content. Public read operations work without a token if your dataset visibility is set to "Public".

---

## 5. Configure CORS Origins

For the Sanity client to work from your app:

1. In your project settings, go to **API** > **CORS Origins**
2. Add:
   - `http://localhost:3000` (development)
   - `https://your-production-domain.com` (production)
3. Check **Allow credentials** for both

---

## 6. Add to Your `.env` File

```env
# Sanity CMS (optional)
NEXT_PUBLIC_SANITY_PROJECT_ID=a1b2c3d4
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=skxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 7. How It Works in the Code

### Sanity Client
**File**: [lib/sanity/client.ts](../../lib/sanity/client.ts)

- Creates two clients: a public CDN client (for fast reads) and a preview client (with auth token for draft content)
- `isSanityConfigured` flag — code can check this to skip Sanity calls when not configured
- `urlFor()` helper for generating image URLs from Sanity image assets

### Queries
**File**: `lib/sanity/queries.ts`

- GROQ queries for fetching content from Sanity

### Data Fetching
**File**: `lib/sanity/fetch.ts`

- Wrapper functions for fetching Sanity content with error handling

---

## 8. Set Up Sanity Studio (Optional)

Sanity Studio is the content editor UI. You can either:

### Option A: Use the hosted Studio
1. Go to [https://www.sanity.io/manage](https://www.sanity.io/manage) > Your Project
2. Click **Studio** — Sanity hosts a studio at `https://your-project.sanity.studio`

### Option B: Embed in your Next.js app
If you want the CMS editor at a route like `/studio`:

```bash
npm install sanity @sanity/vision
```

Then create a studio route in your Next.js app. See [Sanity's Next.js guide](https://www.sanity.io/docs/nextjs-app-router) for details.

---

## 9. Define Your Content Schema

In Sanity Studio, you define schemas that describe your content types. Common schemas for Lacoda Capital:

- **Blog Post**: title, slug, body (rich text), author, publishedAt, featured image
- **Landing Page**: hero section, feature blocks, testimonials, CTA
- **Team Member**: name, role, photo, bio
- **FAQ**: question, answer, category

Create these in Sanity Studio's schema editor or in code (if using an embedded studio).

---

## 10. Verify It's Working

1. Add the env vars and restart your dev server
2. Check that `isSanityConfigured` returns `true`:
   ```typescript
   import { isSanityConfigured } from "@/lib/sanity/client"
   console.log("Sanity configured:", isSanityConfigured) // should be true
   ```
3. Add some test content in Sanity Studio
4. Fetch it from your app:
   ```typescript
   import { sanityClient } from "@/lib/sanity/client"
   const posts = await sanityClient.fetch('*[_type == "post"]')
   console.log(posts)
   ```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `isSanityConfigured` is `false` | `NEXT_PUBLIC_SANITY_PROJECT_ID` is not set or empty. Restart the dev server after adding it |
| CORS error in browser | Add your origin to Project Settings > API > CORS Origins |
| "Insufficient permissions" | Your API token doesn't have the right permissions. Create a new one with Editor access |
| Images not loading | Make sure you're using the `urlFor()` helper from `lib/sanity/client.ts` |
| Draft content not showing | Draft content requires the preview client (with auth token). Use `getClient(true)` |

---

## Sanity Free Tier

- **200k API CDN requests/month**
- **1M API requests/month**
- **500k assets**
- **10GB bandwidth**
- 3 non-admin users
- Very generous for most projects
