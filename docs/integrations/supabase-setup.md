# Supabase Setup Guide

Supabase is the core backend for Lacoda Capital — it handles authentication, the PostgreSQL database, and Edge Functions (email sending, scheduled tasks).

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization (or create one)
4. Fill in:
   - **Name**: `lacoda-capital` (or whatever you want)
   - **Database Password**: Generate a strong password and **save it** — you'll need it for the connection strings
   - **Region**: Pick the closest region to your users (e.g., `US East (N. Virginia)` for `aws-1-us-east-2`)
5. Click **Create new project** and wait for it to provision (~2 minutes)

---

## 2. Get Your Environment Variables

Once the project is ready, go to **Project Settings** (gear icon in the sidebar).

### API Keys (Settings > API)

| Variable | Where to find it | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > **Project URL** | The base URL for all Supabase API calls. Looks like `https://abcdefghijk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Settings > API > **Project API keys** > `anon` `public` | The public/anon key. Safe to expose in the browser — Row Level Security (RLS) controls access |

### Database Connection Strings (Settings > Database)

| Variable | Where to find it | What it does |
|---|---|---|
| `DATABASE_URL` | Settings > Database > **Connection string** > **URI** (use **Transaction mode / port 6543**) | Used by Drizzle ORM for pooled connections. Uses port `6543` (Supavisor transaction pooler) |
| `DIRECT_URL` | Settings > Database > **Connection string** > **URI** (use **Session mode / port 5432**) | Used for migrations (`drizzle-kit push/migrate`). Uses port `5432` (direct connection) |

**Important**: Replace `[YOUR-PASSWORD]` in both connection strings with the database password you set in Step 1.

The connection strings look like this:
```
postgresql://postgres.[project-ref]:[password]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
postgresql://postgres.[project-ref]:[password]@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

---

## 3. Add to Your `.env` File

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_your-anon-key

# Database (Supabase Postgres)
DATABASE_URL=postgresql://postgres.your-project-ref:YOUR-PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.your-project-ref:YOUR-PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# Site URL (used for OAuth redirects, email links, etc.)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 4. Run Database Migrations

Once your env vars are set, push the schema to your new database:

```bash
npx drizzle-kit push
```

This reads `drizzle.config.ts` and pushes all tables from `app/db/schema/` to your Supabase Postgres database.

---

## 5. Configure Authentication Settings

In the Supabase dashboard:

1. Go to **Authentication** > **URL Configuration**
2. Set:
   - **Site URL**: `http://localhost:3000` (or your production URL)
   - **Redirect URLs**: Add these:
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.com/auth/callback` (when you deploy)

3. Go to **Authentication** > **Email Templates** (optional)
   - Customize the confirmation email, magic link email, etc.
   - The default templates work fine for development

---

## 6. Set Up Edge Functions (for Emails)

Lacoda Capital uses three Supabase Edge Functions:

| Function | Purpose | Trigger |
|---|---|---|
| `send-email` | Sends emails via Resend API | Called by other functions |
| `check-expirations` | Checks for expiring documents | Daily cron schedule |
| `weekly-digest` | Sends weekly summary emails | Weekly cron schedule |

### Deploy Edge Functions

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Deploy all functions
npx supabase functions deploy send-email
npx supabase functions deploy check-expirations
npx supabase functions deploy weekly-digest
```

### Set Edge Function Secrets

Edge Functions use their own environment variables (not your `.env` file):

```bash
# Set the Resend API key for email sending
npx supabase secrets set RESEND_API_KEY=re_your_resend_api_key

# Set the Supabase service role key (for querying the DB from Edge Functions)
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find the **service role key** in Supabase Dashboard > Settings > API > `service_role` `secret`.

> **Warning**: The service role key bypasses Row Level Security. Never expose it in the browser. It's only used server-side in Edge Functions.

### Set Up Cron Schedules

In the Supabase dashboard:

1. Go to **Database** > **Extensions** and enable `pg_cron` if not already enabled
2. Go to the **SQL Editor** and run:

```sql
-- Check document expirations daily at 8:00 AM UTC
SELECT cron.schedule(
  'check-expirations',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/check-expirations',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Send weekly digest every Monday at 9:00 AM UTC
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * 1',
  $$SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/weekly-digest',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);
```

Replace `your-project-ref` and `YOUR_ANON_KEY` with your actual values.

---

## 7. Verify Everything Works

1. **Database**: Run `npx drizzle-kit studio` to open Drizzle Studio and verify tables exist
2. **Auth**: Start the app (`npm run dev`) and try signing up — you should see the user in Supabase Dashboard > Authentication > Users
3. **Edge Functions**: Test the email function:
   ```bash
   curl -X POST https://your-project-ref.supabase.co/functions/v1/send-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"type": "team_invite", "to": "test@example.com", "data": {"inviterName": "Test", "orgName": "Test Org", "role": "admin", "magicLink": "https://example.com"}}'
   ```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `connection refused` on `DATABASE_URL` | Make sure you're using port `6543` (pooler), not `5432` |
| Migrations fail with auth error | Check that your password doesn't have special characters that need URL-encoding |
| OAuth redirects to wrong URL | Check Authentication > URL Configuration > Redirect URLs in dashboard |
| Edge Function returns 401 | Make sure you're passing the `Authorization: Bearer` header with the anon key |
| `pg_cron` schedule not firing | Verify the extension is enabled: Database > Extensions > search "pg_cron" |
