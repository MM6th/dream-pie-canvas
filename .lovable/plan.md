

## Root Cause: Database-Based WebRTC Signaling is Fundamentally Unreliable

After 4 rounds of fixes, the DB signals table still shows only `join-request` signals from the viewer and **zero** `offer`/`answer`/`ice-candidate` signals from the host. The host's `createPeerConnectionForViewer` is never executing, likely because:

1. `autoStartRecording()` at GoLive.tsx line 182 is called **BEFORE** the signal listener and poll setup (lines 184-258). If MediaRecorder construction throws (e.g., unsupported MIME type `video/webm;codecs=vp9,opus` on certain browsers), the entire `handleGoLive` function crashes silently, and the signaling infrastructure is never created.

2. Even when signaling setup succeeds, `postgres_changes` Realtime subscriptions have proven unreliable for this use case across multiple attempts.

### The Fix: Replace DB Signaling with Supabase Broadcast Channels

Supabase Broadcast is designed for real-time client-to-client message passing. It does not write to the database, has no RLS issues, no UUID filter problems, and delivers messages in milliseconds. This is the correct tool for WebRTC signaling.

```text
Current (broken):
  Viewer → INSERT join-request → DB → postgres_changes → Host (never arrives)

Proposed (reliable):
  Viewer → broadcast("join-request") → Supabase Broadcast → Host (instant)
```

### Implementation

**GoLive.tsx changes:**
- Move `autoStartRecording()` AFTER signaling setup, wrapped in try/catch with fallback MIME types
- Replace the `postgres_changes` signal listener with a Supabase Broadcast channel: `supabase.channel(`rtc-${streamId}`)`
- Replace the DB poll with broadcast-based signaling
- Host listens for `join-request`, `answer`, `ice-candidate` broadcast events
- Host sends `offer`, `ice-candidate` events via broadcast
- Remove all `live_stream_signals` INSERT/SELECT calls from host

**LiveWatch.tsx changes:**
- Replace the `postgres_changes` signal listener with the same Broadcast channel
- Viewer sends `join-request` via broadcast instead of DB insert
- Viewer listens for `offer`, `ice-candidate` broadcast events
- Viewer sends `answer`, `ice-candidate` events via broadcast
- Remove all `live_stream_signals` INSERT/SELECT calls from viewer
- Remove the `offerPollInterval` (no longer needed)

**Broadcast channel pattern:**
```typescript
const channel = supabase.channel(`rtc-${streamId}`);
channel
  .on("broadcast", { event: "signal" }, ({ payload }) => {
    // payload: { type, from, to, data }
    if (payload.from === myId) return;
    if (payload.to && payload.to !== myId) return;
    handleSignal(payload);
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      // Ready to send/receive
    }
  });

// Send signal:
channel.send({ type: "broadcast", event: "signal", payload: { type: "offer", from: myId, to: viewerId, data: sdpOffer } });
```

**MediaRecorder robustness (GoLive.tsx):**
- Try `video/webm;codecs=vp9,opus` first
- Fall back to `video/webm;codecs=vp8,opus`
- Fall back to `video/webm`
- Wrap in try/catch so recording failure never blocks signaling

### What This Eliminates
- All database writes for signaling (no more RLS issues)
- All `postgres_changes` subscriptions for signals (no more UUID filter issues)
- All polling intervals for signals (no more missed messages)
- The `live_stream_signals` table is no longer used for active signaling

### Files to Edit
- `src/pages/GoLive.tsx` — Broadcast signaling for host, robust MediaRecorder
- `src/pages/LiveWatch.tsx` — Broadcast signaling for viewer

