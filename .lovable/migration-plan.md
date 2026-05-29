# Migration Plan: Away from External Supabase → Lovable Cloud (or other host)

Status: draft — May 2026

## Why
The project currently runs on a self-managed Supabase org with hard quotas. When storage exceeds quota, **the entire project is restricted** (DB, auth, edge functions, storage all blocked) until manual upgrade. Moving to Lovable Cloud or a higher-tier Supabase plan gives us auto-scaling storage and removes the single-quota chokepoint.

Note: Lovable Cloud is Supabase under the hood. The "move" is really swapping the Supabase project the app points to, not switching engines.

## Options

### Option A — Stay on Supabase, upgrade plan (easiest, ~30 min)
1. Upgrade the existing project (`veaupehwfsbagzfuvach`) to Pro plan.
2. No code changes. No data migration. No downtime.
3. Recurring cost increases.

### Option B — Move to a fresh Lovable Cloud project (clean break, ~1–2 days)
Spin up a new Lovable Cloud-managed Supabase project and migrate data + storage to it.

## Migration steps (Option B)

### 1. Spin up the target project
- In Lovable, create a new project shell OR enable Lovable Cloud on a new project, which provisions a managed Supabase instance.
- Note its `PROJECT_REF`, `URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`.

### 2. Move schema
- Export current schema: `supabase db dump --schema public --schema-only > schema.sql`
- Apply to new project via SQL editor or `supabase db push`.
- Re-create all 60+ DB functions, triggers, and RLS policies. Most are already captured in `supabase/migrations/` — apply them in order against the new DB.
- Re-create storage buckets and their policies (audio-files, user-media, avatars, backgrounds, thumbnails, etc.).

### 3. Move data
- `pg_dump --data-only --schema=public > data.sql` from source, `psql` into target.
- Move `auth.users` separately using Supabase's user migration export (preserves password hashes & IDs).
- Critically: **keep user UUIDs identical** so storage paths (`${user.id}/...`) and all FKs remain valid.

### 4. Move storage objects
- For each bucket: list objects on source, download, re-upload to target.
- Script using service_role on both sides. Batch in 200s.
- Public-bucket URLs change (new project ref). Update any hardcoded URLs in the DB (e.g. `astrology_deliveries.admin_video_url`).

### 5. Move secrets & edge functions
- Re-add all edge function secrets in the new project (PayPal, LiveKit, Resend, etc.).
- Edge functions in `supabase/functions/` will auto-deploy on the new project once it's the connected one.

### 6. Swap the app
- Update `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` → new project values.
- Smoke test: login, profile load, audio playback, payments, livestream, contests.
- Update any external webhooks (Stripe, PayPal, LiveKit) to point to the new project's edge function URLs.

### 7. Decommission
- After 1 week of stable operation, downgrade or delete the old Supabase project.

## What does NOT need to move
- **LiveKit** — stays as-is (external SFU, no Supabase dependency).
- **Stripe / PayPal** — stays, only webhook URLs need updating.
- **Frontend code** — no logic changes, only env vars.

## Risks & mitigations
- **User UUID drift** breaks `${user.id}/` storage paths → use Supabase's auth migration export to preserve IDs.
- **Realtime channels** rely on REPLICA IDENTITY FULL — re-apply on target tables.
- **Large audio files** — TUS resumable upload endpoint changes; verify mobile clients still work after env swap.
- **Cutover downtime** — minimize by doing data sync, then a brief read-only window for final delta sync, then DNS/env swap.

## Recommendation
**Start with Option A (upgrade plan)** to unblock the app today. Plan Option B only if you also want to consolidate billing under Lovable Cloud or get out of the current Supabase org for other reasons. Either way, free up the immediate quota first by deleting the two users' folders in the dashboard.
