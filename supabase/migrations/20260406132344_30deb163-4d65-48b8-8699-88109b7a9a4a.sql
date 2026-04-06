
-- Create contest_sessions table to track active contest streams
CREATE TABLE public.contest_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bulletin_post_id UUID NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  champion_id UUID NOT NULL REFERENCES public.profiles(id),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contest_invitations table for spectator invites
CREATE TABLE public.contest_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bulletin_post_id UUID NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  contest_session_id UUID REFERENCES public.contest_sessions(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id),
  invitee_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bulletin_post_id, invitee_id)
);

-- Enable RLS
ALTER TABLE public.contest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_invitations ENABLE ROW LEVEL SECURITY;

-- Contest sessions policies
CREATE POLICY "Participants can view their contest sessions"
  ON public.contest_sessions FOR SELECT TO authenticated
  USING (
    champion_id = auth.uid() OR challenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contest_invitations
      WHERE contest_session_id = contest_sessions.id
      AND invitee_id = auth.uid()
      AND status = 'accepted'
    )
  );

CREATE POLICY "Participants can create contest sessions"
  ON public.contest_sessions FOR INSERT TO authenticated
  WITH CHECK (champion_id = auth.uid() OR challenger_id = auth.uid());

CREATE POLICY "Participants can update their contest sessions"
  ON public.contest_sessions FOR UPDATE TO authenticated
  USING (champion_id = auth.uid() OR challenger_id = auth.uid());

-- Contest invitations policies
CREATE POLICY "Users can view invitations they sent or received"
  ON public.contest_invitations FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "Participants can create invitations"
  ON public.contest_invitations FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Invitees can update invitation status"
  ON public.contest_invitations FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid());

CREATE POLICY "Inviters can delete their invitations"
  ON public.contest_invitations FOR DELETE TO authenticated
  USING (inviter_id = auth.uid());

-- Timestamp trigger
CREATE TRIGGER update_contest_sessions_timestamp
  BEFORE UPDATE ON public.contest_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_live_streams_timestamp();

-- Index for quick lookups
CREATE INDEX idx_contest_sessions_post ON public.contest_sessions(bulletin_post_id);
CREATE INDEX idx_contest_sessions_participants ON public.contest_sessions(champion_id, challenger_id);
CREATE INDEX idx_contest_invitations_invitee ON public.contest_invitations(invitee_id, status);
