

## Add Contest Invite Button to Go Live + Acceptance Notifications + Auto-Redirect

### Overview
Add an "Invite Your People" button to the Go Live page that appears when the user has upcoming challenges with a confirmed challenger. Enhance the notification flow so both participants are reminded to invite, invitees get actionable notifications, and accepted invitees auto-redirect to the stream when it goes live.

### Changes

#### 1. Go Live page — Show ContestInviteCard in setup phase
**File: `src/pages/GoLive.tsx`**
- Import `ContestInviteCard`
- Below the "Stream Setup" card (inside `setupPhase`), render `<ContestInviteCard />` so the host sees their upcoming challenges and can send invites before going live
- No changes to any connection, LiveKit, or streaming code

#### 2. Enhanced notification when challenger accepts
**File: `src/components/ChallengeAcceptanceButtons.tsx`**
- After a challenger accepts (line ~128), also send a notification to the **champion** (using `championUserId`) and the **post creator** (`merchantId`) telling them a challenger has confirmed and they should invite their supporters before the challenge begins
- Message: `"A challenger has accepted your '{challengeName}'. Invite your supporters before the challenge begins!"`
- Also send a similar notification to the accepting challenger: the existing notification already tells them to attend, but add a line encouraging them to invite their people too

#### 3. Better invite notification with accept/decline action
**File: `src/components/contest/ContestInviteCard.tsx`**
- Update the notification message sent on invite (line 153) to include the challenge title and inviter name
- Fetch inviter's display_name and the challenge title before sending

#### 4. Accept/Decline UI in NotificationsList for contest_invite type
**File: `src/components/NotificationsList.tsx`**
- When rendering a notification with `type === "contest_invite"`, show Accept/Decline buttons
- Need to extract the `bulletin_post_id` — add it to the notification metadata. Update `ContestInviteCard.sendInvite` to include `metadata` JSON field in the notification (or store `bulletin_post_id` + `inviter_id` in the message for parsing)
- On Accept: update `contest_invitations` row to `status: 'accepted'`, send confirmation notification back to inviter
- On Decline: update to `status: 'declined'`

**Database consideration**: The `notifications` table needs a way to link back to the contest invitation. Two options:
- Add a `metadata` JSONB column to notifications (if not already present)
- Or encode the invitation ID in the notification message

Let me check the notifications table schema.

#### 5. Auto-redirect for accepted invitees (already works)
**File: `src/hooks/useContestInviteRedirect.tsx`**
- This hook already polls for accepted invitations with live sessions and auto-redirects. No changes needed — once the invitee accepts via the notification UI, their status becomes "accepted" and the existing hook handles the redirect.

### Technical Details

**Notifications table check needed**: I need to verify if `notifications` has a `metadata` column or similar. If not, we'll store the `contest_invitation_id` in the notification message as a parseable format, or add a nullable `related_contest_invitation_id` column.

**No connection code touched**: All changes are in UI components (GoLive setup section, NotificationsList rendering, ContestInviteCard notification content) and the ChallengeAcceptanceButtons notification logic.

### File Summary

| File | Change |
|------|--------|
| `src/pages/GoLive.tsx` | Add ContestInviteCard below Stream Setup card |
| `src/components/ChallengeAcceptanceButtons.tsx` | Send "invite your people" notification to champion + challenger on acceptance |
| `src/components/contest/ContestInviteCard.tsx` | Include challenge title + inviter name in invite notification; store invitation reference |
| `src/components/NotificationsList.tsx` | Add Accept/Decline buttons for contest_invite notifications |
| Possible migration | Add `related_contest_invitation_id` to notifications table if no metadata column exists |

