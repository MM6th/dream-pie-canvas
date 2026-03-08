

## Diagnosis

From the edge function logs, the **host token was issued** for the current stream (`e9bdfce0`), but **no viewer token was ever issued** for this stream. The viewer's page loaded successfully (stream data fetched, title "See" displayed), but the `livekit-token` edge function was never successfully invoked by the viewer for this stream.

The auth logs show a `session_not_found` error for the viewer at 21:24:33, followed by a re-login. This suggests the viewer's auth token may have been in a transitional state when the LiveWatch `useEffect` fired, causing `supabase.functions.invoke` to silently fail (no valid auth header sent, edge function rejects with 401, but the frontend error handling may swallow it).

### Root Causes

1. **Auth race condition in LiveWatch**: The `useEffect` fires when `stream` and `user` are set, but `supabase.functions.invoke` uses the *current Supabase session token* (not the `user` object). If the session is being refreshed, the invoke call fails with 401 and the viewer gets stuck on "Connecting."

2. **No retry logic**: If the token fetch fails once, the viewer is permanently stuck. There's no retry mechanism.

3. **Silent error swallowing**: The `connectToRoom` catch block shows a toast, but if `supabase.functions.invoke` returns an error object (not a thrown exception), it may not be caught properly.

## Plan

### 1. Fix LiveWatch viewer connection (LiveWatch.tsx)

- **Wait for active session**: Before calling `getToken`, explicitly call `supabase.auth.getSession()` and verify a valid session exists. If not, wait/retry.
- **Add retry logic**: Retry the token fetch up to 3 times with 2-second delays if it fails.
- **Improve error handling**: Check `data` and `error` from `supabase.functions.invoke` explicitly, and log the full response for debugging.
- **Add console.log statements** at key points: before token fetch, after token fetch, on room connect, on track subscribe.

### 2. Fix useLiveKitToken hook (useLiveKitToken.tsx)

- Before invoking the edge function, call `supabase.auth.getSession()` to ensure a fresh session exists.
- If no session, throw a descriptive error instead of making a doomed request.
- Log the edge function response for debugging.

### 3. Edge function hardening (livekit-token/index.ts)

- Add `console.error` logging when auth fails so it appears in edge function logs (currently only returns 401 silently).
- Keep `getClaims` (it works when auth is valid) but add a log line on failure.

These changes ensure the viewer waits for a valid auth session before attempting the LiveKit connection, retries on transient failures, and provides visible debugging output.

