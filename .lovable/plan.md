

## Plan: Port Contest Test UI Features to Real Live Contest Session

This is a large integration. To avoid breaking existing connectivity, I'll implement it incrementally across 4 steps, each building on the last.

### Key Architecture Decision: Role-Based Views

- **Spectators** see a split-screen with BOTH contestants' gauges (tanks, polls, power bars, total points) — similar to the test UI
- **Participants (champion/challenger)** see only their OWN panel full-screen — no visibility into opponent's tanks, polls, or points
- The test UI (`ContestTestPage.tsx`) remains completely untouched

### Step 1: Extract Shared UI Components

Create `src/components/contest/ContestOverlays.tsx` with reusable components extracted from ContestTestPage:
- `VerticalTank` — Tips/Votes, Skill, Sample gauges
- `PollWidget` — 4-slider voting interface  
- `PowerFlowBar` — horizontal power meter
- `TotalPointsBar` — hidden-until-reveal points bar
- `TankBubbles` — fizzy bubble animation
- Inject the CSS keyframes (bubble-rise, badge-fly, title-text-appear)

Update `ContestTestPage.tsx` to import from the shared file instead of defining locally (no visual change).

### Step 2: Add Session Lifecycle to ContestSession

Add contest phases (warmup → live → overtime → ended) to `ContestSession.tsx`:
- 5s warmup with `playPrepareSound()`
- Configurable live phase with `playStartSound()`
- 60s overtime with `playOvertime()`, skill drain
- Ended phase with winner reveal and audio (`playChampionWins` / `playChallengerWins` / `playWinnerContest`)
- Poll warning at ≤60s (`playPollWarning()`)
- Replace the simple countdown timer with the phase-aware timer (WARMUP/LIVE/OVERTIME/ENDED labels)

### Step 3: Wire Real-Time Data to Gauges (Spectator View)

For spectators — overlay the shared components on both video panels:
- **Tips/Votes tank**: fed from existing `OneOnOneTipMeter` real-time data (sum from `one_on_one_tips` table per room) + poll vote power
- **Skill tank**: driven by overtime countdown (100% → 0%)
- **Sample tank**: uses `SAMPLE_RATIO_FORMULA` with real LiveKit participant counts (voters = spectators who tipped, viewers = total spectators on that side)
- **Poll widgets**: spectators submit polls for the contestant who invited them
- **Power flow + Total points**: calculated from formula, hidden until ended phase
- **Belt animation + title change ceremony**: triggered on ended phase
- **Heart overflow**: triggers when tip+vote tank exceeds 100

### Step 4: Participant (Merchant) View

For champion/challenger — show only their OWN panel full-screen:
- Their video feed fills the screen (no split)
- Opponent's video shown as a small picture-in-picture or not at all
- Only their own tanks, power bar, and total points visible
- No poll widget (participants don't vote)
- Camera/mic controls and End Contest button remain
- Chat for their own side only
- On ended phase: see the winner reveal and ceremony

### What Stays the Same
- All LiveKit connectivity logic (token, room, track attachment)
- Chat isolation (champion/challenger rooms)
- Tip isolation (champion_tips/challenger_tips rooms)
- Spectator inviter lookup and access control
- The test UI page (`/contest-test`) — completely preserved

### Files Changed
1. **New**: `src/components/contest/ContestOverlays.tsx` — shared visual components
2. **Edit**: `src/pages/ContestTestPage.tsx` — import from shared file (no visual change)
3. **Edit**: `src/components/contest/ContestSession.tsx` — add phases, overlays, role-based rendering

