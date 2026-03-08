

## Root Cause: Host Never Receives Viewer's Join Request

### Evidence from Database
- Viewer's 2 `join-request` signals are present in `live_stream_signals`
- **Zero** `offer`, `answer`, or `ice-candidate` signals from the host
- This proves `createPeerConnectionForViewer` is never being called

### Why the Host Misses Join Requests

The host has two mechanisms to detect join requests:
1. **Realtime subscription** — listens for `INSERT` events with `filter: stream_id=eq.${data.id}`
2. **One-time poll on SUBSCRIBED** — queries for existing join-request signals

Both are failing:
- The **one-time poll** runs immediately when the host's subscription connects (before any viewer joins), finds nothing, and never runs again
- The **Realtime listener** appears to not deliver events — likely due to Supabase Realtime's known limitations with UUID column filters in `postgres_changes`. The filter `stream_id=eq.<uuid>` may silently fail to match rows

### Fix Plan

**Step 1: Remove the Realtime filter on the host side (GoLive.tsx)**
Instead of filtering by `stream_id` in the Realtime subscription (which may not work reliably with UUIDs), subscribe to ALL inserts on `live_stream_signals` and filter in the JavaScript callback. This guarantees the host receives every signal.

```tsx
// Before (unreliable):
filter: `stream_id=eq.${data.id}`

// After (reliable):
// No filter — check stream_id in the callback
```

**Step 2: Add periodic polling as a fallback (GoLive.tsx)**
Add an interval that polls for unprocessed join-request signals every 3 seconds while the stream is live. This ensures that even if Realtime drops an event, the host will still discover and connect to viewers.

**Step 3: Remove the Realtime filter on the viewer side too (LiveWatch.tsx)**
Apply the same fix — subscribe without a `stream_id` filter and check in the callback. This ensures the viewer reliably receives the host's SDP offer.

**Step 4: Add error logging to `createPeerConnectionForViewer`**
Wrap the function body in try/catch with `console.error` so that if the SDP offer creation or insertion fails, it's visible in the console.

### Files to Edit
- `src/pages/GoLive.tsx` — Remove Realtime filter, add polling interval, add error logging
- `src/pages/LiveWatch.tsx` — Remove Realtime filter, check stream_id in callback

