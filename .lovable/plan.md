

## Fix Contest Invite Card: 3 Issues

### Issue 1: Invite list limited to followers only
**Root cause:** `ContestInviteCard` fetches users from `profile_followers` table (line 89-104), which only returns the current user's followers. If you have 2 followers, you see 2 users. Challengers with few followers see almost nobody.

**Fix:** Replace the followers-only fetch with a fetch of ALL site supporter profiles. Filter out the current user and the other participant (champion or challenger) from the list.

**File: `src/components/contest/ContestInviteCard.tsx`**
- Change `fetchUsers` to query all profiles (supporters) instead of only `profile_followers`
- Exclude the current user's own ID
- When a challenge is selected, also exclude the other participant (champion_user_id for challengers, or the accepted challenger's user_id for champions)

### Issue 2: Accept/Decline buttons not visible to invitees
**Root cause:** The buttons are gated by `!notification.read` (line 309). If the notification gets auto-marked as read (e.g., user opens notifications panel and it marks them read), the buttons disappear before the user can act.

**Fix:** Change the condition from `!notification.read` to checking the actual invitation status instead. Only hide buttons if the invitation has already been accepted or declined.

**File: `src/components/NotificationsList.tsx`**
- Remove `!notification.read` from the contest_invite button condition
- Instead, fetch the invitation status when a contest_invite notification is present, and only show buttons if status is still `pending`
- Alternatively, track accepted/declined state locally after user clicks

### Issue 3: Challenger sees champion in invite list (and vice versa)
**Root cause:** No filtering of the other participant from the available users list.

**Fix:** When a challenge is selected, determine who the other participant is and exclude them from the dropdown. The champion_user_id is on the challenge object. For the challenger, fetch their ID from `challenge_acceptances`.

**File: `src/components/contest/ContestInviteCard.tsx`**
- After selecting a challenge, compute `excludeIds` containing: current user + other participant
- Filter `availableUsers` to exclude those IDs

### Summary

| File | Change |
|------|--------|
| `src/components/contest/ContestInviteCard.tsx` | Fetch all site users (not just followers), exclude self + other participant |
| `src/components/NotificationsList.tsx` | Show Accept/Decline based on invitation status, not notification read state |

No connection code touched. No database changes needed.

