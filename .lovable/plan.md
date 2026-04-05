

## Diagnosis: 1-on-1 Session Black Screen

### What I Found

**Critical evidence from edge function logs:** There are **zero** LiveKit token requests for any `1on1_` room in the recent logs. Every token issued is for the main `stream-*` rooms. This means the `LiveOneOnOneSession` component is failing **before** it even requests a LiveKit token — the connect function on line 170 of `LiveOneOnOneSession.tsx` is either:

1. Exiting early (e.g., `connectingRef.current` stuck at `true`)
2. Throwing an error in the `getToken` call that triggers `onClose()` immediately
3. The component is not mounting at all because `showSession` or `roomName` is never set correctly

### Root Cause Analysis

After the revert, the most likely issue is a **mismatch between reverted frontend code and the current database schema**. During our session, we added columns like `room_name` to the `one_on_one_requests` table. The reverted code may:

- Not include `room_name` in the select/update queries in `LiveOneOnOneRequests.tsx`
- Use a different room naming convention
- Have the viewer's `LiveOneOnOneButton` expecting a different flow to set `showSession = true`

### Proposed Fix (3 steps)

1. **Add console logging to the 1-on-1 connect flow** in `LiveOneOnOneSession.tsx` — right before `getToken` is called and in the catch block — so we can see exactly where it fails in the browser console.

2. **Verify `room_name` column** exists in the `one_on_one_requests` table and that both `LiveOneOnOneRequests.tsx` (host accept) and `LiveOneOnOneButton.tsx` (viewer receive) correctly read/write it.

3. **Check for stale `connectingRef`** — Add a safety reset at the top of the effect to ensure `connectingRef.current` can't get stuck from a previous failed attempt. The current code sets it `false` in cleanup, but if cleanup doesn't run (e.g., component stays mounted across state changes), it blocks all reconnection attempts.

### Is This a Lovable Platform Issue?

**No.** The LiveKit edge function is responding correctly (tokens issued for main streams), the Supabase realtime is working (requests are flowing), and the database is accessible. This is a **code-level** issue — specifically the 1-on-1 session flow not reaching the token request stage after the revert.

### Technical Details

**Files to modify:**
- `src/components/live/LiveOneOnOneSession.tsx` — Add diagnostic logging + fix `connectingRef` guard
- `src/components/live/LiveOneOnOneRequests.tsx` — Verify `room_name` is included in the accept update
- `src/components/live/LiveOneOnOneButton.tsx` — Verify `room_name` is read from the accepted payload

