# Google Tag Manager Setup Guide

Google Tag Manager (GTM) gives you a single container to manage all your conversion pixels, ad tracking tags, and marketing scripts — without code deploys. It's **optional**: the app works without it, you just won't be able to add conversion tracking from the GTM UI.

---

## 1. Create a GTM Account

1. Go to [https://tagmanager.google.com](https://tagmanager.google.com)
2. Click **Create Account**
3. Fill in:
   - **Account Name**: `Lacoda Capital`
   - **Country**: your country
4. Under **Container Setup**:
   - **Container Name**: `lacodacapital.com`
   - **Target Platform**: **Web**
5. Click **Create** and accept the Terms of Service

---

## 2. Get Your Container ID

1. After creating, you'll land on the container dashboard
2. Your **Container ID** is shown at the top — it looks like `GTM-XXXXXXX`
3. Copy it

---

## 3. Add to Your `.env` File

```env
# Google Tag Manager (optional — for conversion pixels & ad tracking)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

That's it. Restart your dev server (`npm run dev`) and GTM is active.

---

## 4. How It Works in the Code

GTM is integrated in a single file:

### GTM Component
**File**: [lib/analytics/gtm.tsx](../../lib/analytics/gtm.tsx)

- `GoogleTagManager` — renders the GTM `<script>` tag in `<head>` using Next.js `<Script>` with `afterInteractive` strategy
- `GoogleTagManagerNoscript` — renders the `<noscript>` iframe fallback right after `<body>`
- If `NEXT_PUBLIC_GTM_ID` is not set, both components render nothing — no errors

Both components are mounted in the root layout ([app/layout.tsx](../../app/layout.tsx)).

---

## 5. Adding Tags (Pixels, Conversion Tracking)

The whole point of GTM is that you add tags from the GTM web UI, not in code. Here are common ones:

### Google Ads Conversion Tracking
1. In GTM, go to **Tags** > **New**
2. Choose **Google Ads Conversion Tracking**
3. Enter your Conversion ID and Conversion Label (from your Google Ads account)
4. Set the trigger (e.g., "Page View" on your thank-you page, or a custom event)
5. **Submit** to publish

### Meta (Facebook) Pixel
1. In GTM, go to **Tags** > **New**
2. Choose **Custom HTML**
3. Paste the Meta Pixel base code from your Meta Events Manager
4. Trigger: **All Pages**
5. For conversion events, create additional tags triggered on specific pages or custom events

### LinkedIn Insight Tag
1. In GTM, go to **Tags** > **New**
2. Choose **Custom HTML** (or use the LinkedIn Insight Tag template from the Community Template Gallery)
3. Paste the LinkedIn Insight Tag code from LinkedIn Campaign Manager
4. Trigger: **All Pages**

### Google Analytics 4
1. In GTM, go to **Tags** > **New**
2. Choose **Google Analytics: GA4 Configuration**
3. Enter your Measurement ID (e.g., `G-XXXXXXXXXX`)
4. Trigger: **All Pages**

---

## 6. Sending Custom Events to GTM

If you need to push custom events to the GTM `dataLayer` (e.g., for tracking signups or form submissions as conversions), use:

```typescript
// Push an event to the GTM dataLayer
window.dataLayer?.push({
  event: "signup_completed",
  plan: "pro",
})
```

Then in GTM, create a trigger that fires on the custom event `signup_completed`.

---

## 7. Verify It's Working

### Using GTM Preview Mode
1. In the GTM dashboard, click **Preview** (top right)
2. Enter your site URL and click **Connect**
3. A debug panel will open showing all tags firing on each page
4. Verify your tags are firing correctly

### Using Browser DevTools
1. Open your site and open DevTools (F12)
2. In the **Network** tab, filter by `gtm.js`
3. You should see a request to `https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX`

---

## 8. Best Practices

- **Always use Preview mode** before publishing changes — broken tags can affect page performance
- **Use GTM's built-in tag templates** when available (Google Ads, GA4) rather than Custom HTML — they're faster and safer
- **Set up a "Staging" workspace** in GTM for testing changes before publishing to production
- **Don't put PostHog in GTM** — it's already integrated directly in the app with proper controls (see [posthog-setup.md](posthog-setup.md))

---

## 9. GTM + PostHog

Lacoda Capital uses PostHog for product analytics (integrated directly in the app) and GTM for marketing/ad tags. They serve different purposes:

| | PostHog | GTM |
|---|---|---|
| **Purpose** | Product analytics, feature flags | Marketing pixels, conversion tracking |
| **Integration** | Direct (npm package) | Container script |
| **Control** | Code deploys | GTM web UI |
| **Events** | Custom app events | Page views, custom dataLayer pushes |

Both can coexist without conflicts.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Tags not firing | Check that `NEXT_PUBLIC_GTM_ID` is set and you've restarted the dev server |
| GTM script blocked | Ad blockers block GTM. This is expected — you'll lose tracking for those users |
| Preview mode not connecting | Disable ad blockers temporarily, or try a different browser |
| Tags fire on wrong pages | Check your trigger configuration in GTM — use URL path matching |
| Double-counting events | Make sure you're not loading the same pixel both in GTM and directly in code |

---

## GTM Free Tier

Google Tag Manager is **completely free** with no usage limits.
