
Root cause

The admin-set contest duration is not the problem. The duration is being fetched and passed correctly from `src/pages/ContestLive.tsx` into `src/components/contest/ContestSession.tsx`. The console confirms that:
- `durationMinutes prop = 7`
- `LIVE_SECONDS = 420`

What is blocking the contest clock from starting is the countdown handoff logic inside `ContestSession.tsx`.

Current blocker

In `ContestSession.tsx`, each phase transition starts the next countdown from inside the previous timer’s `setTimeLeft(prev => ...)` state updater:

- warmup completion starts live
- live completion starts overtime
- overtime completion ends session

Because `startCountdown(...)` calls `setTimeLeft(newSeconds)` while the old updater is still returning `0`, the old updater can overwrite the newly assigned countdown value. That leaves the next phase starting with `timeLeft = 0`, so on the very next tick it immediately completes.

That matches the behavior you described and the logs:
- warmup completes
- live is announced
- live instantly completes
- overtime audio plays
- overtime also instantly completes

Implementation plan

1. Refactor the phase transition logic in `src/components/contest/ContestSession.tsx`
   - Remove nested `startCountdown(...)` calls from inside the `setTimeLeft` updater callback.
   - Make countdown completion trigger phase changes only after the prior state update finishes.
   - Use a safer handoff pattern such as:
     - interval decrements time only
     - when time reaches zero, clear interval
     - then trigger the next phase outside the updater via effect, helper, or queued callback

2. Preserve the admin-configured live duration exactly
   - Keep using `durationMinutes` from `ContestLive.tsx`
   - Convert it once to seconds for the live phase
   - Ensure the live phase visibly starts at the configured total, not zero

3. Apply the same fix to `src/pages/ContestTestPage.tsx`
   - That page duplicates the same countdown pattern
   - Fixing both prevents the bug from reappearing in testing while being “fixed” only in production UI

4. Add guardrails for the lifecycle
   - Prevent a phase from starting if its initial seconds resolve to `0`
   - Add explicit lifecycle logs for:
     - warmup started
     - live started with exact seconds
     - overtime started with exact seconds
     - ended
   - This will make future timing bugs obvious immediately

5. Verify expected sequence
   - Warmup reaches `00:00`
   - Live phase starts and displays the admin-set duration
   - Live countdown runs normally second-by-second
   - Overtime audio only plays after live truly finishes
   - Overtime countdown displays and runs normally
   - Contest ends only after overtime finishes

Technical details

Files to update:
- `src/components/contest/ContestSession.tsx`
- `src/pages/ContestTestPage.tsx`

No database or Supabase schema changes are required for this fix.

Expected outcome after fix:
```text
Warmup -> Live countdown starts at admin-set duration -> Overtime starts at 3:00 -> Ended
```
