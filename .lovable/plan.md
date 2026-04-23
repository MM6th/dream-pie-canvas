

## Fix Premature Contest Start and Clock Drift

Root cause confirmed in code:

- `src/pages/ContestLive.tsx` line 142 inserts `contest_sessions.started_at = new Date().toISOString()` — i.e. the moment the FIRST contestant opens the contest URL. This makes the admin's scheduled time irrelevant. When a challenger accepts and the page (or a notification link) opens the contest URL early, the clock anchors to that moment, so a 2:46 PM scheduled contest can start the second the challenger accepts.
- Because the anchor is "whoever arrives first," any contestant who opens the page early starts the warmup countdown, and a later arriver sees the same row but the warmup is already half-spent — that's the clock drift you observed.

The fix is to anchor the clock to the admin-set `scheduled_at` and prevent any manual early entry.

### 1. Anchor `started_at` to `bulletin_posts.scheduled_at`

In `src/pages/ContestLive.tsx`:
- When fetching the post, also pull `scheduled_at`.
- When inserting a new `contest_sessions` row, set `started_at = post.scheduled_at` (fall back to `now()` only if `scheduled_at` is missing — e.g. legacy posts).
- When fetching an existing session row whose `started_at` is non-null but does not match `scheduled_at` (because the row was created under the old buggy code), correct it with an UPDATE so all clients converge on the admin-set anchor.
- Pass that corrected `started_at` to `<ContestSession>` as today.

Result: every client (champion, challenger, every spectator, refreshes included) computes `phase` and `timeLeft` from the same anchor — the admin-set `scheduled_at`. Clocks are guaranteed identical.

### 2. Block manual entry before `scheduled_at`

Even with the anchor fix, we don't want a contestant to load the room early and have negative-elapsed UI. In `ContestLive.tsx`:
- After fetching the post, if `now < scheduled_at`, redirect back to `/bulletin` with a toast: "This contest hasn't started yet. You'll be redirected automatically at [scheduled time]."
- The existing `useContestRedirect` hook (5-second polling, fires at `scheduled_at`) is what actually moves them into the room — no manual entry needed.

This guarantees: the only path into the contest room is the auto-redirect at `scheduled_at`, and the clock is anchored to that exact same `scheduled_at`.

### 3. Ensure the warmup phase starts from the scheduled time

Currently the lifecycle is: warmup (5 min) → live (admin duration) → overtime (3 min). With the new anchor:
- At `scheduled_at` exactly, the contest enters warmup with the full 5:00 on the clock.
- 5 minutes after `scheduled_at`, live starts at the admin-set duration.
- Overtime triggers only after live finishes.

If you'd rather have the live phase start AT `scheduled_at` (no warmup at scheduled time, warmup happens in the 5 minutes BEFORE), say the word and I'll invert the math: anchor = `scheduled_at - WARMUP_SECONDS`, redirect window opens at `scheduled_at - WARMUP_SECONDS`. Default in this plan is the simpler "warmup begins at scheduled_at" model that matches today's lifecycle.

### Technical details

Files to update:
- `src/pages/ContestLive.tsx` — pull `scheduled_at`; gate entry on `now >= scheduled_at`; insert/correct `contest_sessions.started_at` to equal `scheduled_at`.
- `src/components/contest/ContestSession.tsx` — no logic change required; it already derives the clock from the `startedAt` prop.
- `src/hooks/useContestRedirect.tsx` and `src/hooks/useContestInviteRedirect.tsx` — no change (already correctly fire at `scheduled_at`).

No DB schema changes. One-time backfill of `contest_sessions.started_at` for any in-flight rows is handled inline by the corrective UPDATE in `ContestLive.tsx`.

Expected outcome:
- A contest scheduled for 2:46 PM enters warmup at exactly 2:46 PM for every client.
- Clocks are byte-identical across champion, challenger, and every spectator regardless of when they joined or whether they refreshed.
- Manually opening the contest URL before `scheduled_at` bounces the user back to the bulletin board.
- The auto-redirect remains the only way into the room.

