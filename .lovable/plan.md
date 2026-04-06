## Live Challenge Contest Stream

### Overview
When a scheduled live challenge time arrives, the champion and challenger are automatically redirected into a split-screen contest livestream (reusing the 1-on-1 session layout). Spectators can only watch if privately invited by either participant.

### Phase 1: Database Setup
- **`contest_invitations` table** — stores invites from champion/challenger to spectators (inviter_id, invitee_id, bulletin_post_id, status)
- **`contest_sessions` table** — tracks active contest streams (bulletin_post_id, room_name, champion_id, challenger_id, started_at, ended_at, status)

### Phase 2: Invite System
- Add a **"Contest Invites" card** to the merchant dashboard for champions and challengers
- Dropdown selection to pick users (followers/connections) to invite as spectators
- Invitees receive a notification with a link to watch the contest

### Phase 3: Auto-Redirect System
- A polling hook (`useContestRedirect`) checks if the current user is a champion or challenger in a contest whose `scheduled_at` time has arrived
- When triggered, auto-navigates to a new `/contest/:postId` route
- Creates the LiveKit room and contest session record automatically

### Phase 4: Contest Livestream Page
- Reuses the split-screen layout from `LiveOneOnOneSession`
- Timer uses `challenge_time_limit_minutes` with auto-end
- Spectators see both feeds in view-only mode (no camera/mic)
- Champion and challenger each have camera/mic controls
- No end button for the challenger (similar to 1-on-1 viewer restriction)

### Phase 5: Spectator View
- Invited spectators get a notification + can join from `/contest/:postId`
- View-only: two video feeds side-by-side, no controls
- Chat available for spectators to comment

### Files to create/modify
- New migration for `contest_invitations` and `contest_sessions` tables
- `src/pages/ContestLive.tsx` — contest stream page
- `src/components/contest/ContestSession.tsx` — split-screen contest component
- `src/components/contest/ContestInviteCard.tsx` — dashboard invite card
- `src/hooks/useContestRedirect.tsx` — auto-redirect polling hook
- `src/App.tsx` — add `/contest/:postId` route
