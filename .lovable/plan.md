

## Perfect Live Challenge UI — Layout-Only Changes

**Zero changes** to LiveKit connection code (lines 105-321). All edits are in the JSX return block and props only.

### File: `src/components/contest/ContestSession.tsx`

**1. Tip button missing on champion's desktop**
The tip buttons (lines 378-384) are inside `isParticipant` but currently let champion tip challenger and vice versa. Since we're removing participant-to-participant tipping (point 4), this resolves itself — tip buttons removed from participant controls entirely. Only spectators see tip buttons.

**2. Participants cannot tip themselves**
Already handled by the current logic (tip button targets the OTHER person), but since point 4 removes all participant tipping, this is moot.

**3. No cross-chats — each participant locked to their own chat box**
Currently both chat boxes render for everyone. The left chat uses `championChatRoom`, right uses `challengerChatRoom`. The fix: conditionally disable input in the chat box that doesn't belong to the current participant. Champion can only type in the champion chat; challenger only in the challenger chat. Spectators can type in neither (or whichever side they're invited to — for now, neither).

This requires adding a `readOnly` prop to `OneOnOneChat`. In `ContestSession`, pass `readOnly={role !== "champion"}` to the champion chat and `readOnly={role !== "challenger"}` to the challenger chat.

**4. Remove participant-to-participant tipping**
Delete the `OneOnOneTipButton` renders inside the `isParticipant` controls block (lines 378-384). Keep only the spectator tip bar (lines 442-449).

**5. Remove trophy icon from Twerk Off sign**
Line 333 already only shows `pieTitleTwerk` for twerk-off. There's no trophy icon there currently — the label just has the twerk image + text. No change needed here; already correct.

**6. Challenger tip meter same height as champion's**
Currently champion's meter is at line 371-373 (inside a `flex-col items-start` with label above). Challenger's meter on the remote side is at line 419-421 inside a different layout (`flex items-start justify-between`). Fix: make both sides use the same layout — label top-left, meter below it with identical `mt-2` spacing.

**7. Move challenge label to center between both screens**
Remove the floating header's challenge label (lines 331-335) and replace with a centered overlay that spans the border between both screens. Use absolute positioning at `top-12 left-1/2 -translate-x-1/2` with large bold text. Keep the timer in the floating header but remove the challenge type from it.

### File: `src/components/live/OneOnOneChat.tsx`

Add optional `readOnly?: boolean` prop. When true, hide the input/send bar so the chat becomes view-only.

---

### Summary of changes

| # | What | Where |
|---|------|-------|
| 1-2,4 | Remove tip buttons from participant controls | ContestSession lines 376-384 |
| 3 | Add `readOnly` prop to chat, pass per-role | OneOnOneChat + ContestSession |
| 5 | No change needed (already correct) | — |
| 6 | Mirror champion's meter layout on remote side | ContestSession lines 417-426 |
| 7 | Move challenge label to centered overlay between screens | ContestSession lines 331-340 |

**Connection code (lines 105-321) is not touched.**

