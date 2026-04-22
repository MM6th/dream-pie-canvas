

## Fix Contest Sync, Audio, Poll, and Mobile Layout Issues

This plan addresses six related issues in the live contest experience: clock drift between contestant and viewer, redirect lag between devices, clock reset on refresh, missing audio on contestant desktop, missing poll widget on viewer mobile, and the mobile power bar overlap.

### 1. Synchronized clocks across all viewers (server-anchored timing)

**Root cause**: `ContestSession.tsx` runs an independent local countdown on each device, started from the moment that client connects. A spectator joining 30 seconds late sees the clock at 5:00 while the contestant sees 4:30. A refresh re-runs `setPhase('warmup')` from the top.

**Fix**:
- Use `contest_sessions.started_at` (already stored at session creation) as the single source of truth.
- Replace the local `startCountdown` chain with a tick effect that, every second, computes:
  - `elapsed = now - started_at`
  - `phase` and `timeLeft` derived from elapsed vs `WARMUP_SECONDS`, `LIVE_SECONDS`, `OVERTIME_SECONDS`.
- On mount (including refresh), the component immediately resolves to the correct phase and remaining time.
- Pass `startedAt` from `ContestLive.tsx` into `<ContestSession>` (already fetched as part of the session row — just expose it).
- Phase-transition sounds (`playStartSound`, `playOvertime`, `playChampionWins`, etc.) fire only when the local phase value changes, guarded by refs so a late joiner doesn't replay earlier sounds.

### 2. Simultaneous redirects for contestant and viewer

**Root cause**: 
- `useContestRedirect` (participants) polls every 15s and triggers at `scheduled_at`.
- `useContestInviteRedirect` (spectators) polls every 15s but **only redirects once a `contest_sessions` row exists with `status='live'`** — created by whichever participant arrives first. So spectators always lag participants by up to 15s plus participant connect time.

**Fix**:
- Change `useContestInviteRedirect` to redirect at `scheduled_at` (mirroring participants), by joining to `bulletin_posts.scheduled_at` rather than waiting for a session row.
- Tighten polling cadence to 5s for both hooks during the 60-second window before `scheduled_at` so the actual launch-time gap is small.
- Keep the sessionStorage `contest_ended_*` guard in place.

### 3. Refresh-resilient clock

Covered by item 1: because the clock is derived from `started_at`, refreshing the page restores the exact correct phase and time left.

### 4. Audio announcements on contestant desktop

**Root cause**: Desktop browsers block `Audio.play()` without a user gesture in the current page. Mobile got lucky because navigation to the contest URL may have come from a tap. The contestant's first sound (`playPrepareSound`) is fired inside an effect with no preceding gesture on desktop, so it's silently rejected.

**Fix**:
- Add a single full-screen "Tap to Enter Contest" overlay on first mount of `ContestSession` (for all roles). On click, prime the audio context: call `.play()` then `.pause()` on each contest sound element so subsequent autoplay calls are allowed.
- After the gesture, show the normal session UI and run the lifecycle.
- Also unlock on the existing camera/mic enablement step for participants (the `getUserMedia` prompt counts as a gesture in some browsers, but the explicit button is the reliable path).

### 5. Voting poll on viewer mobile

**Root cause check**: In the spectator return block, `PollWidget` is rendered when `isLiveOrOvertime`, positioned at `bottom-4 right-3`. On small mobile viewports the chat area (`h-36`) and tip button bar push it out of the visible video area, and `bottom-4` is measured from the video container — so it lands behind the chat bar.

**Fix**:
- Move the spectator `PollWidget` out of the absolute-positioned video overlay and into a dedicated row above the chat (visible on mobile and desktop).
- Add a mobile-specific compact variant that stays within viewport bounds and is always tappable when active.

### 6. Mobile layout — power bar centered under TWERK OFF

**Root cause**: Spectator power bar is positioned `absolute top-4 left-28 w-[150px]` which collides with the coin meter (`top-4 left-4`) on mobile widths.

**Fix** in the spectator view (and mirror logic in participant view as needed):
- Use `useIsMobile()` to detect mobile.
- On mobile: render the `PowerFlowBar` as a centered bar directly beneath the challenge title (TWERK OFF), e.g. `absolute top-[88px] left-1/2 -translate-x-1/2 w-[60%] max-w-[260px]`.
- On desktop: keep the existing `top-4 left-28` placement.
- Apply the same responsive split for the participant view's "You" and opponent power bars so they don't collide with the coin meter on small screens.

### Technical details

**Files to update**:
- `src/components/contest/ContestSession.tsx` — replace local countdown with `started_at`-derived clock, add audio-unlock overlay, reposition spectator poll widget, mobile-responsive power bar.
- `src/pages/ContestLive.tsx` — fetch and forward `started_at` from `contest_sessions` to `<ContestSession>` as a `startedAt` prop. Backfill `started_at` on existing rows that have it null when first loaded.
- `src/hooks/useContestInviteRedirect.tsx` — redirect at `scheduled_at` instead of waiting for `status='live'`; tighten polling to 5s near launch.
- `src/hooks/useContestRedirect.tsx` — tighten polling to 5s near launch.
- `src/pages/ContestTestPage.tsx` — keep the local-clock fallback for the sandbox test page (no DB session), gated by an `isTestMode` flag, so the test page still works without a server anchor.

**No DB schema changes** — `contest_sessions.started_at` already exists.

**Expected outcome**:
- Contestant and viewer clocks match within ~1 second regardless of join time or refresh.
- Both devices land in the contest within ~5 seconds of `scheduled_at`.
- Refreshing on either side restores the exact correct phase/time.
- Audio announcements (Prepare, Start, Overtime, Winner) play on contestant desktop after the one-time tap-to-enter gesture.
- Spectator mobile shows the poll widget in a stable, tappable location.
- Mobile power bar sits centered under the challenge title with no overlap of the coin meter.

