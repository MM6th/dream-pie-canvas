

## Analysis: Three Remaining Issues

### Findings from Database

**Signal table**: 4 `join-request` signals from the viewer. **Zero** `offer`, `answer`, or `ice-candidate` signals from the host. This confirms the host's `createPeerConnectionForViewer` is either never executing or silently failing.

**Recordings**: All 6 streams have `recording_url: null`. Zero files in `user-media` storage matching `live-recording`. The upload is failing silently.

**Stream status**: Stream `3d69bd0c` correctly set to `status: 'ended'`, but the viewer never detected it.

---

### Issue 1: Stream never connects (host never sends SDP offer)

**Root cause**: `createPeerConnectionForViewer` in GoLive.tsx has TWO silent exit points and ZERO error checking on signal inserts:

1. Line 238: `if (!streamRef.current || !user) return;` — silently exits with no log
2. Lines 270-276: The `offer` signal INSERT does not check for errors — if it fails, nobody knows
3. Lines 257-263: The ICE candidate INSERT also doesn't check for errors

The host's polling IS finding join-requests (the code structure is correct), but `createPeerConnectionForViewer` is silently failing. Most likely `pc.createOffer()` or `pc.setLocalDescription()` throws, and while there's no try/catch around those WebRTC calls in the function body, the outer try/catch in the poll only catches if the whole function throws synchronously.

**Fix**:
- Wrap the entire body of `createPeerConnectionForViewer` in a try/catch with detailed console.error logging at every step
- Add error checking on every signal INSERT (log the error)
- Add `console.log` before and after each critical step: addTrack, createOffer, setLocalDescription, insert signal
- As a safety measure, also add polling on the viewer side for offer signals (not just rely on Realtime)

### Issue 2: Viewer stays on "Connecting" after stream ends

**Root cause**: LiveWatch.tsx line 241-252 uses `filter: id=eq.${streamId}` on the `live_streams` table Realtime subscription. This is the **same UUID filter issue** we already fixed for `live_stream_signals` but forgot to fix for `live_streams` status changes. The viewer never receives the `status: "ended"` update.

**Fix**:
- Remove the UUID filter from the stream-status Realtime channel
- Filter by `payload.new.id === streamId` in the JavaScript callback
- Add a polling fallback: check stream status every 5 seconds, navigate away if ended

### Issue 3: Recording never saves to dashboard

**Root cause**: Storage policies look correct (`Users can upload their own media` matches path pattern). But the `endStream` function at line 382 calls `mediaRecorderRef.current.stop()` which triggers the async `onstop` callback at line 359. This callback does the upload. However, two problems:

1. The upload error might be swallowed — the `console.log("Recording blob size:", blob.size)` at line 361 fires but if the blob is empty (0 bytes), the upload is skipped silently
2. More critically: the `mediaRecorderRef.current.onstop` is being **reassigned** at line 359 AFTER the MediaRecorder was already set up with a different `onstop` handler at line 109. If `.stop()` fires before the reassignment completes (race condition), the OLD handler runs instead, which only sets `setRecordedBlob(blob)` but never uploads

**Fix**:
- Don't reassign `onstop` at stream end. Instead, handle the upload flow in the original `onstop` handler or use a ref/state to signal that upload should happen when recording stops
- Add detailed error logging for the upload attempt
- Check and log the actual error from `supabase.storage.upload()`
- As a fallback, show a "Save Recording" button if auto-save fails

---

### Implementation Plan

**Step 1: Fix `createPeerConnectionForViewer` (GoLive.tsx)**
- Wrap entire function body in try/catch with step-by-step logging
- Check and log INSERT errors for offer and ICE candidate signals
- Add a viewer-side polling interval (every 3s) for offer signals as a fallback

**Step 2: Fix stream-end detection (LiveWatch.tsx)**
- Remove UUID filter from `stream-status` Realtime channel, filter in JS
- Add a 5-second polling interval that checks stream status and navigates away if ended

**Step 3: Fix recording save (GoLive.tsx)**
- Remove the `onstop` reassignment pattern; use a ref flag instead
- When `endStream` is called, set a `shouldUploadRef.current = true` flag
- In the original `onstop` handler (set during `autoStartRecording`), check the flag and upload if true
- Add comprehensive error logging for every step of the upload flow
- If auto-upload fails, keep the blob in state and show a manual "Save Recording" button

**Step 4: Add viewer-side offer polling (LiveWatch.tsx)**
- Add a 3-second interval that polls for `offer` and `ice-candidate` signals from the host
- Process any found signals through `handleSignal`
- This ensures connection even if Realtime misses the host's offer

