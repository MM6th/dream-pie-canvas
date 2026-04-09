
-- Fix 1: Allow inviters to update contest_session_id on invitations they created
DROP POLICY IF EXISTS "Invitees can update invitation status" ON public.contest_invitations;
CREATE POLICY "Invitees and inviters can update invitations"
ON public.contest_invitations
FOR UPDATE TO authenticated
USING (invitee_id = auth.uid() OR inviter_id = auth.uid())
WITH CHECK (invitee_id = auth.uid() OR inviter_id = auth.uid());

-- Fix 2: Allow spectators to see contest_sessions by bulletin_post_id 
-- even before contest_session_id is linked on their invitation
DROP POLICY IF EXISTS "Participants can view their contest sessions" ON public.contest_sessions;
CREATE POLICY "Participants and spectators can view contest sessions"
ON public.contest_sessions
FOR SELECT TO authenticated
USING (
  champion_id = auth.uid() 
  OR challenger_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM contest_invitations
    WHERE contest_invitations.bulletin_post_id = contest_sessions.bulletin_post_id
      AND contest_invitations.invitee_id = auth.uid()
      AND contest_invitations.status = 'accepted'
  )
);
