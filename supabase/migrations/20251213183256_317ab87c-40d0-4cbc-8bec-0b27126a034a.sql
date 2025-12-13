-- Create podcast_sessions table for multi-user recording sessions
CREATE TABLE public.podcast_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'recording', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create podcast_session_participants table
CREATE TABLE public.podcast_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('host', 'guest')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create podcast_session_signals table for WebRTC signaling
CREATE TABLE public.podcast_session_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.podcast_sessions(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID,
  signal_type TEXT NOT NULL,
  signal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_session_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for podcast_sessions
CREATE POLICY "Users can view sessions they host or participate in"
ON public.podcast_sessions FOR SELECT
USING (
  host_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.podcast_session_participants
    WHERE session_id = podcast_sessions.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view sessions by invite token"
ON public.podcast_sessions FOR SELECT
USING (true);

CREATE POLICY "Users can create their own sessions"
ON public.podcast_sessions FOR INSERT
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their sessions"
ON public.podcast_sessions FOR UPDATE
USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their sessions"
ON public.podcast_sessions FOR DELETE
USING (host_id = auth.uid());

-- RLS policies for podcast_session_participants
CREATE POLICY "Participants can view session participants"
ON public.podcast_session_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.podcast_sessions
    WHERE id = podcast_session_participants.session_id AND host_id = auth.uid()
  )
);

CREATE POLICY "Users can join sessions"
ON public.podcast_session_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
ON public.podcast_session_participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can leave sessions"
ON public.podcast_session_participants FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for podcast_session_signals
CREATE POLICY "Participants can view signals in their sessions"
ON public.podcast_session_signals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.podcast_session_participants
    WHERE session_id = podcast_session_signals.session_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.podcast_sessions
    WHERE id = podcast_session_signals.session_id AND host_id = auth.uid()
  )
);

CREATE POLICY "Participants can send signals"
ON public.podcast_session_signals FOR INSERT
WITH CHECK (from_user_id = auth.uid());

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_session_signals;
ALTER TABLE public.podcast_session_signals REPLICA IDENTITY FULL;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_podcast_sessions_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for timestamp updates
CREATE TRIGGER update_podcast_sessions_updated_at
BEFORE UPDATE ON public.podcast_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_podcast_sessions_timestamp();