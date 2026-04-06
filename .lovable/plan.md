

## Fix Contest Livestream: 3 Issues

### Problem Summary
1. **Collapsed screens** -- ContestSession uses its own bare LiveKit connection code instead of reusing the proven 1-on-1 session patterns (hardware release delays, retry token fetching, `connectingRef` guard, `attachLocalCamera` with MediaStream fallback).
2. **No auto-redirect** -- `useContestRedirect` only runs on `Index.tsx` (the home page). If the user is on their dashboard or any other page, the redirect never fires.
3. **Both sides stuck "waiting"** -- The contest uses identity-based track routing (`championId`/`challengerId`), but LiveKit participant identity may not match the raw user UUID. The 1-on-1 session avoids this by using simple local/remote refs without identity matching. Additionally, both participants try to create the session row simultaneously, causing race conditions.

---

### Plan

#### 1. Rewrite ContestSession to mirror LiveOneOnOneSession's architecture

**File: `src/components/contest/ContestSession.tsx`**

- Replace the dual-identity video ref system (`championVideoRef`/`challengerVideoRef` matched by participant identity) with the simpler local/remote pattern from LiveOneOnOneSession: `localVideoRef` for your own feed, `remoteVideoRef` for the other participant's feed.
- Port over the proven connection logic from LiveOneOnOneSession:
  - `connectingRef` guard to prevent double-connect
  - `getTokenWithRetry` (3 attempts, 1.5s intervals)
  - Hardware release delay (2.5s for first joiner, 800ms for second)
  - `attachLocalCamera` with `MediaStream` fallback and ref callback (`setLocalVideoElement`)
  - `LocalTrackPublished` event handler for re-attaching local camera
- Keep the contest-specific UI: Champion/Challenger labels, trophy icon, header bar with timer, "End Contest" button (champion only), tip buttons, spectator bar.
- Use `isolate relative flex-1 overflow-hidden` on each side panel (already present but screens collapse because the video elements have no content until tracks attach -- add `min-h-[30vh] sm:min-h-0` to each panel).
- Add avatar display when camera is off (like 1-on-1).

#### 2. Enable auto-redirect on all authenticated pages

**File: `src/App.tsx`** -- Create a small wrapper component that calls `useContestRedirect()` and `useContestInviteRedirect()` and render it inside the Router so the hooks fire on every page, not just Index.

**File: `src/pages/Index.tsx`** -- Remove the two hook calls from here (they'll be global now).

#### 3. Fix the "waiting for participant" deadlock

**File: `src/pages/ContestLive.tsx`**
- The current code navigates away if no session exists and the user is a spectator. But for champion/challenger, both try to insert simultaneously. Fix: add a retry loop -- if session insert fails and re-fetch also returns null, wait 2 seconds and retry up to 5 times before giving up. This handles the case where both arrive at the same moment.

**File: `src/components/contest/ContestSession.tsx`**
- Remove the `championConnected`/`challengerConnected` state tracking by identity. Instead use a single `remoteConnected` boolean (like 1-on-1). The "Waiting for..." overlay shows when `!remoteConnected && !connecting`.

---

### Technical Details

**Key patterns ported from LiveOneOnOneSession:**
- `attachLocalCamera()` -- detaches then reattaches via `MediaStream` constructor for reliability
- `setLocalVideoElement` -- ref callback that auto-attaches when the DOM element mounts
- Token retry with 3 attempts
- Hardware delay differentiated by role
- `connectingRef` to prevent duplicate connections on React strict-mode re-renders

**Files modified:**
- `src/components/contest/ContestSession.tsx` (major rewrite)
- `src/pages/ContestLive.tsx` (session creation retry logic)
- `src/App.tsx` (global contest redirect hooks)
- `src/pages/Index.tsx` (remove local hook calls)

