

## Overtime Opt-In + Decision-Driven End

### Goal
Replace the contestant "End Contest" button with an "Overtime?" decision form that appears as the LIVE clock is winding down. The countdown becomes the only thing that ends the live phase. Each contestant chooses overtime (yes/no) independently. Overtime runs per-contestant. The match ends only when all opted-in overtimes have stopped.

### Behavior

1. **No more early-exit "End Contest" button.** The LIVE countdown is the sole authority for ending the live phase. The button is removed for both contestants (and from the spectator view).

2. **"Overtime?" decision card.** During the last 60 seconds of LIVE (and through the brief grace window after LIVE ends, until either contestant submits), each contestant sees a card:
   - "Need overtime?" with a Yes / No checkbox pair (mutually exclusive) and a Submit button.
   - Submit is disabled until a choice is made.
   - The choice is saved per-contestant in the DB so it survives refresh and is visible to both clients.

3. **Phase transition based on decisions.**
   - When LIVE elapses, the system checks the two decisions:
     - If **neither** chose overtime → phase goes straight to `ended`.
     - If **one or both** chose overtime → phase becomes `overtime` and a per-contestant overtime clock starts at 3:00 for each contestant who said yes. A contestant who said no stays in the room as a passive participant (their points are frozen at the LIVE-end value; no overtime clock for them).
   - If a contestant has not yet submitted by the moment LIVE ends, treat them as "no" by default (they can still submit during a 10-second grace window, after which the default locks).

4. **Per-contestant overtime clocks.** Each opted-in contestant has their own `overtime_started_at` timestamp. Their clock counts down 3:00 from that anchor and is broadcast to all clients via the DB row + realtime, so spectators and the other contestant see the same value.

5. **"End Session" button appears only during overtime, only for the contestant who opted in.** Pressing it stamps `overtime_ended_at` for that contestant, freezing their points/power at that instant. The other contestant (whether they're still in their own overtime, or sitting out as a "no") remains in the room.

6. **Match officially ends** when every opted-in contestant's overtime is finished (either by their own End Session press or by their 3:00 expiring). At that moment phase → `ended`, ceremony fires, ContestLive's `onEnd`/`session_ended_at` runs as today.

7. **Spectators** see both per-contestant overtime clocks (the global timer in the header switches to show the longer of the two remaining), and a small "OT" badge next to each contestant who is in overtime. Spectators have no decision UI and no End Session button.

### Database

Add four nullable columns to `contest_sessions`:
- `champion_overtime_choice` (text, null | 'yes' | 'no')
- `challenger_overtime_choice` (text, null | 'yes' | 'no')
- `champion_overtime_started_at` (timestamptz, null)
- `champion_overtime_ended_at` (timestamptz, null)
- `challenger_overtime_started_at` (timestamptz, null)
- `challenger_overtime_ended_at` (timestamptz, null)

RLS: extend the existing UPDATE policy on `contest_sessions` so a contestant can update only their own four columns. Spectators get SELECT only (already in place).

Realtime: add `contest_sessions` to the realtime publication if not already there, and set REPLICA IDENTITY FULL so updates broadcast cleanly.

### Phase computation (the new state machine)

`ContestSession.tsx` `computePhaseAndRemaining` is rewritten:
- `warmup`: `elapsed < WARMUP_SECONDS` (unchanged).
- `live`: `liveElapsed < liveSecondsTotal` (unchanged).
- After LIVE ends:
  - If both choices are `no` (or null past the 10s grace) → `ended`.
  - Else `overtime`. Per-contestant `remaining`:
    - If `<side>_overtime_started_at` is set: `max(0, 180 - (now - started))`, capped at 0 if `<side>_overtime_ended_at` is set.
    - If their choice is `yes` but `started_at` not yet stamped (the very first tick after LIVE ends), the contestant who is local stamps it; remote clients wait for the realtime update.
    - If their choice is `no`, their per-side remaining is 0 from the start.
  - Phase becomes `ended` once every `yes` side has either an `overtime_ended_at` or has hit the 0 mark.
- Header timer shows the larger of the two side remainings during overtime.

### Skill / scoring

`skillValue` in overtime is currently `(timeLeft / OVERTIME_SECONDS) * 100`. Make it per-side:
- For a side that opted out: skill is locked at the value it had at LIVE end (effectively 0 since LIVE-end skill is 0 in the current formula — confirm and keep current behavior).
- For a side in overtime: `(theirRemaining / 180) * 100`, freezing at the moment they press End Session.

`championPoints` / `challengerPoints` likewise use the per-side overtime remaining for their skill component.

### UI changes (ContestSession.tsx)

Participant view, controls row at the bottom:
- Remove the existing red `End Contest` button.
- Add a contextual control:
  - During warmup and most of live: nothing (just camera/mic toggles).
  - During the last 60s of live and during overtime grace (until they submit): "Overtime?" card with Yes/No + Submit. Disabled after submit; shows their locked-in choice as a small badge.
  - During overtime, if they opted yes and haven't ended yet: orange "End Session" button. Pressing it confirms via a small inline confirm ("End your overtime now?") then writes `overtime_ended_at`.
  - After their overtime ends (or if they opted no during overtime): a muted "Awaiting opponent…" label.

Spectator view: no end button (already the case). Add small "OT" badge next to the contestant label when that side is in overtime; nothing else changes.

Header timer label: keep `OVERTIME` text but use per-side remaining for the displayed seconds (the larger of the two).

### Files to update

- `src/components/contest/ContestSession.tsx` — phase math, scoring, controls, overtime card, realtime subscription to `contest_sessions` row.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration (do not hand-edit).
- New migration to add the 6 columns + RLS update + realtime publication entry.

No changes to `ContestLive.tsx`, redirect hooks, BulletinBoard, or test page logic. The end-of-match callback (`onEnd`) still fires once phase reaches `ended`, exactly as today.

### Edge cases

- **Refresh during overtime decision window**: choice is in DB, card re-renders showing locked-in state.
- **Refresh during overtime**: per-side started_at is in DB, clock continues from server anchor — same model as the current contest clock.
- **One contestant never submits**: 10s grace after LIVE ends, then defaulted to "no". They stay in room but can no longer affect overtime.
- **Both opt no**: contest ends immediately at LIVE expiry — no overtime audio plays.
- **One opts yes, one opts no**: overtime audio plays once; only the yes-side has a running clock and an End Session button; no-side sees "Awaiting opponent…" and frozen points.

