

## Fix Contest Livestream: 4 Issues

### Issue 1: Mobile challenger stuck on black screen + redirect loop

**Root cause:** The `useContestRedirect` hook runs globally in `App.tsx` and polls every 15 seconds. After a contest ends (via timer auto-end or "End Contest" button), there's a race condition: `session_ended_at` is set on the bulletin post, but `useContestRedirect` checks `session_ended_at IS NULL` on the post — if the contestant navigates away to `/bulletin` and the query fires before the DB update propagates, they get redirected back. On mobile, the black screen is the same layout issue compounded by this loop.

**Fix:**
- In `useContestRedirect`, add the current path check — skip redirecting if user is already on `/contest/`. Also check the `contest_sessions` table for `status = 'ended'` as a secondary guard.
- In `ContestLive.tsx`, when `handleEndContest` fires or when the timer expires, set a flag in `sessionStorage` (e.g. `contest_ended_<postId>`) so the redirect hooks skip that post ID.
- In `useContestRedirect` and `useContestInviteRedirect`, check sessionStorage before redirecting.

**Files:** `src/hooks/useContestRedirect.tsx`, `src/hooks/useContestInviteRedirect.tsx`, `src/pages/ContestLive.tsx`

---

### Issue 2: Chat sections share the same dialogue

**Root cause:** Both `OneOnOneChat` instances use the same `roomName` and write/read from the same `room_name` column in `one_on_one_chat_messages`. The `channelSuffix` only differentiates the Supabase Realtime channel name (fixing the duplicate subscription error) but both chats still query and insert with the same `room_name`, so messages appear in both.

**Fix:**
- Pass a different `roomName` to each chat: `{roomName}_champion` for the left chat, `{roomName}_challenger` for the right chat. This naturally separates the message storage since `OneOnOneChat` queries by `room_name`.
- Remove the now-unnecessary `channelSuffix` prop (the room names themselves are unique).

**Files:** `src/components/contest/ContestSession.tsx`

---

### Issue 3: Wrong icons — trophy should be PIE belt for champion, no trophy for challenge type label

**Fix:**
- Import `pieTitleBelt` from `@/assets/pie-title-belt.png` and `pieTitleTwerk` from `@/assets/pie-title-twerk.png`.
- Replace the `Trophy` icon next to "Champion" label with the PIE belt image (`<img src={pieTitleBelt} className="h-4 w-4" />`).
- In the floating header, replace the `Trophy` icon next to the challenge type label: use `pieTitleTwerk` for twerk-off challenges, and remove the trophy for other challenge types (just show the text).
- Remove the `Trophy` import if no longer needed.

**Files:** `src/components/contest/ContestSession.tsx`

---

### Issue 4: Each screen needs its own tip icon and ability (separate audience contributions)

**Current state:** The tip button on the champion's side tips the champion, and there's one shared tip meter. Spectators have separate tip buttons but participants don't tip each other's opponents properly.

**Fix:**
- **Champion's screen (left):** Show a `OneOnOneTipMeter` tracking tips to the champion. No tip button on your own screen.
- **Challenger's screen (right):** Show a `OneOnOneTipMeter` tracking tips to the challenger. No tip button on your own screen.
- **Spectator bar:** Already has separate tip buttons — keep as-is.
- To differentiate tip tracking, use different room name prefixes for each side's tips: `{roomName}_champion_tips` and `{roomName}_challenger_tips`. Pass these as `roomName` to the respective `OneOnOneTipMeter` and `OneOnOneTipButton` components.
- Each participant sees the opponent's tip button on the remote side: champion sees "Tip Challenger" on the right panel, challenger sees "Tip Champion" on the right panel.
- Each side has its own tip meter in the top-left of their respective video panel.

**Files:** `src/components/contest/ContestSession.tsx`

---

### Summary of file changes

| File | Changes |
|------|---------|
| `src/components/contest/ContestSession.tsx` | Replace trophy icons with PIE belt images, separate chat roomNames, separate tip roomNames per side, add tip buttons/meters to both panels |
| `src/hooks/useContestRedirect.tsx` | Add path check + sessionStorage guard to prevent redirect loops |
| `src/hooks/useContestInviteRedirect.tsx` | Add sessionStorage guard |
| `src/pages/ContestLive.tsx` | Set sessionStorage flag on contest end |

