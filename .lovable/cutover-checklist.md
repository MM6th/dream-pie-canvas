# Fresh-Backend Cutover Checklist

Use this **only if** Supabase support cannot restore access. This wipes user accounts and data, but **keeps 100% of your app code**.

## What survives the cutover
- All `src/**` (frontend code, every page, component, hook, style)
- All `supabase/functions/**` (edge functions auto-deploy to new backend)
- All `supabase/migrations/**` (re-applied to new DB to recreate schema, RLS, triggers, functions)
- LiveKit, PayPal, Stripe (external — only webhook URLs need updating)

## What is lost
- All user accounts (auth.users) — users must re-register
- All DB data (profiles, purchases, token balances, posts, deliveries, etc.)
- All storage files (audio, video, avatars, backgrounds, thumbnails)
- All messaging history, livestream tips, contest history

## Steps

### 1. Provision new backend
- [ ] Create a new Lovable project OR have Lovable provision a new managed Supabase instance for this project
- [ ] Capture new `PROJECT_REF`, `URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`

### 2. Apply schema
- [ ] Run every file in `supabase/migrations/` in chronological order against the new DB
  - Lovable does this automatically when you re-run the migration tool against the new project
- [ ] Verify: all tables, RLS policies, 60+ DB functions, and triggers exist
- [ ] Re-create storage buckets (audio-files, user-media, avatars, backgrounds, thumbnails, message-audio, etc.) and their RLS policies

### 3. Re-add edge function secrets
Required secrets (from current project — re-enter values in new project):
- [ ] `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL`
- [ ] `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- [ ] `RESEND_API_KEY` (if used for email)
- [ ] Any others surfaced by `fetch_secrets`

### 4. Swap env vars
- [ ] Update `.env`:
  - `VITE_SUPABASE_URL` → new URL
  - `VITE_SUPABASE_PROJECT_ID` → new ref
  - `VITE_SUPABASE_PUBLISHABLE_KEY` → new anon key
- [ ] Update `src/integrations/supabase/client.ts` (hardcoded URL/key constants)
- [ ] Update `supabase/config.toml` `project_id`

### 5. Update external webhooks
- [ ] PayPal dashboard → webhook URL → new project's `paypal-webhook` edge function URL
- [ ] Stripe (if used) → same
- [ ] Any hardcoded URLs in code (search for `veaupehwfsbagzfuvach`):
  - `src/integrations/supabase/client.ts`
  - `supabase/functions/fix-delivery-segments/index.ts` (DB function `fix_delivery_video_segments` has a hardcoded storage URL — update or remove)

### 6. Smoke test
- [ ] Sign up a new test user
- [ ] Complete profile (avatar upload → tests storage RLS)
- [ ] Buy credits (tests PayPal + edge functions + token minting trigger)
- [ ] Send a message (tests messaging + credits)
- [ ] Go live (tests LiveKit token edge function)
- [ ] Upload audio (tests TUS resumable upload to new storage)

### 7. Communicate to existing users
- [ ] Post announcement explaining re-registration is required
- [ ] Offer credit/token grants to returning users as goodwill

### 8. Decommission old project
- [ ] After 1 week stable, delete old Supabase project to stop any residual billing

## Code locations with hardcoded project refs (search & replace these)
- `.env` — 3 lines
- `src/integrations/supabase/client.ts` — 2 constants
- `supabase/config.toml` — `project_id`
- `supabase/functions/fix-delivery-segments/index.ts` — storage URL inside SQL
- Any user notification messages or hardcoded download links

Run this to find all of them:
```
rg "veaupehwfsbagzfuvach" -l
```
