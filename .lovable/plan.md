

## Thorough Analysis of 4 Recurring Livestream Issues

After deep investigation of the codebase, database state, and storage policies, here are the **root causes** for each issue and the plan to fix them.

---

### Issue 1: No "Join Stream" button on the `/live` page (viewer cannot join)

**Root Cause:** The `/live` page filters streams with `gte("updated_at", activeCutoff)` where `activeCutoff` is 60 seconds ago. The host heartbeat (GoLive.tsx line 77) fires every 15 seconds but only updates `status` to `"live"` -- this triggers the `update_live_streams_timestamp` trigger which sets `updated_at`. However, the trigger fires on every UPDATE, so this should work... **unless the heartbeat silently fails** due to the RLS policy requiring `auth.uid() = merchant_id`.

The **real problem**: The `activeCutoff` filter is too aggressive. If there's any network hiccup or the heartbeat interval drifts, the stream disappears from the listing. Additionally, an old stream (id `9fd84f89`) is stuck with `status: 'live'` forever (no `ended_at`, `updated_at` from March 7th) which suggests heartbeats do fail.

**Fix:**
- Remove the `gte("updated_at", activeCutoff)` filter from Live.tsx. Just query `status = 'live'` streams.
- Clean up the stale stream in the database.
- Add a "Go Live" button prominently visible on the `/live` page for streamers, so viewers don't confuse the empty state with a bug.

---

### Issue 2: Chat card on viewer's mobile requires tapping to expand

**Root Cause:** The LiveChat card has a fixed height of `h-[45vh] min-h-[280px] max-h-[500px]`. On mobile in the LiveWatch page, the video takes `h-[28vh]`, plus the nav bar, title, back button, and gap elements. The Chat card's `45vh` height means it starts below the fold. When the user taps the header area, the ScrollArea content shifts into view, giving the appearance of "collapsing."

**Fix:**
- On mobile, reduce the Chat card height to `h-[32vh] min-h-[200px]` so the full card (header + input) fits on screen alongside the video.
- Alternatively, make the chat card use `flex-1` to fill remaining space in the viewport rather than a fixed `vh` height.
- Use a `calc(100vh - video - nav - gaps)` approach in the mobile layout so both components are guaranteed visible.

---

### Issue 3: No video connection between host and viewer (WebRTC signaling broken)

**Root Cause:** This is the most critical bug. The `live_stream_signals` table has **0 rows** in the database. This means signals are being inserted but then immediately lost, OR they are never successfully inserted.

Looking at the storage RLS policies, `live_stream_signals` has proper INSERT and SELECT policies. However, there's a deeper timing/architecture issue:

1. **Signal collision**: The viewer sends a `signal_type: "offer"` with `signal_data: { type: "join-request" }`. The host receives it and creates a real SDP offer, also with `signal_type: "offer"`. The viewer's `handleSignal` function checks `if (signal.signal_type === "offer")` and tries to set it as a remote description. But this means the viewer could process its OWN "offer" signal (the join-request) as an SDP offer, causing `setRemoteDescription` to fail silently.

2. **Self-filtering issue**: The viewer filters `signal.sender_id === user.id` to skip own signals -- this should prevent the above. But the **host** doesn't filter by `target_id` when processing signals. The host processes ALL signals where `sender_id !== user.id`, including signals meant for other viewers.

3. **The signals table is empty** because signals may have been cleaned up, OR the Realtime subscription filter `filter: stream_id=eq.${streamId}` might not be matching correctly with UUID formatting.

**The fundamental architecture flaw**: Using `signal_type: "offer"` for BOTH the viewer's join-request AND the host's actual SDP offer creates ambiguity. The viewer's `handleSignal` tries to `setRemoteDescription` on `{ type: "join-request" }` which is not a valid RTCSessionDescription.

**Fix:**
- Change the viewer's join request to use `signal_type: "join-request"` instead of `"offer"`. Add `"join-request"` to the CHECK constraint on the `live_stream_signals` table.
- Update the host to listen for `signal_type: "join-request"` signals (it currently checks for `signal.signal_type === "offer"` and looks for join-requests).
- In the viewer's `handleSignal`, only process signals where `signal_data.type === "offer"` (actual SDP) not join-requests.
- Add more robust error logging so failures are visible.

---

### Issue 4: No recordings saved to dashboard

**Root Cause:** Confirmed -- all 5 streams in the database have `recording_url: null`, and the `storage.objects` table has **0 files** in the `live-recordings/` path. The storage RLS policy for `user-media` INSERT requires:

```
(bucket_id = 'user-media') AND (auth.uid()::text = (storage.foldername(name))[1])
```

The upload path in GoLive.tsx is: `live-recordings/${user.id}/${streamId}-${Date.now()}.webm`

So `storage.foldername(name)` returns `['live-recordings', '<user-id>', ...]`. The first folder is `'live-recordings'`, NOT the user's ID. The policy checks `auth.uid() = foldername[1]` which is `'live-recordings'` -- **this will always fail**.

This is why no recordings are ever uploaded. The upload silently fails due to RLS, but the code doesn't properly surface the error because `endStream` navigates away before the async upload completes, or the error is caught but not visible.

**Fix:**
- Change the upload path to `${user.id}/live-recordings/${streamId}-${Date.now()}.webm` so the first folder is the user's ID, matching the RLS policy.
- OR add a new storage policy specifically for `live-recordings/` paths.
- Add proper error handling and logging for the upload step.

---

### Implementation Plan

**Step 1: Database migration**
- Add `'join-request'` to the `signal_type` CHECK constraint on `live_stream_signals`.
- Clean up the stale "live" stream from March 7th.

**Step 2: Fix storage upload path (GoLive.tsx)**
- Change `live-recordings/${user.id}/...` to `${user.id}/live-recordings/...` in both the `saveRecording` and `endStream` functions.
- Add console.error logging for upload failures.
- Ensure the `endStream` function waits for upload completion before cleanup.

**Step 3: Fix WebRTC signaling (GoLive.tsx + LiveWatch.tsx)**
- Viewer: Send join-request as `signal_type: "join-request"` instead of `"offer"`.
- Host: Listen for `signal_type: "join-request"` to trigger peer connection creation.
- Viewer: Only process real SDP offers (where `signal_data.sdp` exists) in `handleSignal`.

**Step 4: Fix `/live` page stream listing (Live.tsx)**
- Remove the `updated_at` staleness filter. Just query `status = 'live'`.

**Step 5: Fix mobile chat visibility (LiveWatch.tsx + LiveChat.tsx)**
- Use dynamic height calculation on mobile so chat fills remaining viewport space.
- Reduce chat card fixed height on mobile from 45vh to fit within the visible area.

