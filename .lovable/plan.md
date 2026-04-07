

## Fix Contest Livestream: Chat Not Rendering + Challenger Connection Broken

### Root Cause

Two issues introduced in the last edit:

1. **Challenger connection broken**: The right side (remote) panel is missing the `isolate` class that the left side has. Without `isolate`, the `z-index` stacking context leaks, and the connecting overlay (z-30) can interfere with the video element rendering. More critically, the structural change from a single `flex-1` div to a `flex flex-col` wrapper may have disrupted the video ref attachment flow.

2. **Chat not rendering visibly**: The `OneOnOneChat` component renders inside a `Card` with `bg-card` background. Inside the contest's dark layout, the chat sections are there but may appear collapsed because the parent `flex-1 min-h-0` container has no guaranteed minimum height when the video panel uses `shrink-0` with fixed heights. On desktop, `h-[55%]` leaves only 45% for chat, but `min-h-0` combined with `overflow-hidden` can cause the chat to collapse to zero if the flex container isn't computing height correctly.

### Plan

**File: `src/components/contest/ContestSession.tsx`**

1. **Match 1-on-1 layout exactly for both sides**: Instead of splitting video and chat into separate flex children with fixed video heights, use the same `isolate relative flex-1 overflow-hidden` pattern from LiveOneOnOneSession for both video panels — video fills each panel via `absolute inset-0`.

2. **Move chat to a dedicated bottom section**: Place a single shared chat section beneath the split-screen container (not duplicated under each video panel). This mirrors how the 1-on-1 mobile layout works — chat sits below the video area as its own flex child with a fixed height.

3. **Restore `isolate` on both panels**: Both left and right video panels get `isolate relative flex-1 overflow-hidden` to maintain proper stacking context.

4. **Layout structure**:
```text
┌─────────────────────────────────┐
│  [Floating Timer + Label]       │  (absolute, z-20)
├────────────────┬────────────────┤
│                │                │
│   Champion     │   Challenger   │  flex-1 (fills most of screen)
│   (video)      │   (video)      │
│   + controls   │   + label      │
│                │                │
├────────────────┴────────────────┤
│   Shared Chat Section           │  h-[25vh] sm:h-[30%]
│   (OneOnOneChat)                │
└─────────────────────────────────┘
```

5. **Ensure both panels use `absolute inset-0` for video**: This is the proven pattern from 1-on-1 that prevents collapsed screens — video fills the container regardless of whether tracks have attached yet.

### Technical Details

**Key changes in `ContestSession.tsx`:**
- Remove duplicated `OneOnOneChat` from each side panel
- Add single `OneOnOneChat` in a bottom container with `h-[25vh] sm:h-[30%] shrink-0`
- Both side panels: `isolate relative flex-1 overflow-hidden` (no fixed heights, no `flex-col`)
- Video elements: `absolute inset-0 z-0` with `object-cover`
- Controls overlay: `relative z-10 w-full h-full flex flex-col justify-between`
- No other connection logic changes — the LiveKit code is correct and matches 1-on-1

**Files modified:**
- `src/components/contest/ContestSession.tsx` (layout restructure only)

