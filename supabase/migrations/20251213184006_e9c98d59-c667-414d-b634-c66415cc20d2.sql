-- Drop ALL existing policies on podcast tables to start fresh
DROP POLICY IF EXISTS "Users can create sessions" ON public.podcast_sessions;
DROP POLICY IF EXISTS "Host can update own sessions" ON public.podcast_sessions;
DROP POLICY IF EXISTS "Host can delete own sessions" ON public.podcast_sessions;
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.podcast_sessions;
DROP POLICY IF EXISTS "Hosts can manage their own sessions" ON public.podcast_sessions;
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.podcast_sessions;

DROP POLICY IF EXISTS "Users can join sessions" ON public.podcast_session_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.podcast_session_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON public.podcast_session_participants;
DROP POLICY IF EXISTS "Users can leave sessions" ON public.podcast_session_participants;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.podcast_session_participants;
DROP POLICY IF EXISTS "Participants can view session participants" ON public.podcast_session_participants;

DROP POLICY IF EXISTS "Users can send signals" ON public.podcast_session_signals;
DROP POLICY IF EXISTS "Anyone can view signals" ON public.podcast_session_signals;
DROP POLICY IF EXISTS "Session participants can manage signals" ON public.podcast_session_signals;

-- Simple non-recursive policies for podcast_sessions
CREATE POLICY "podcast_sessions_insert" ON public.podcast_sessions
FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "podcast_sessions_update" ON public.podcast_sessions
FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "podcast_sessions_delete" ON public.podcast_sessions
FOR DELETE USING (auth.uid() = host_id);

CREATE POLICY "podcast_sessions_select" ON public.podcast_sessions
FOR SELECT USING (true);

-- Simple non-recursive policies for podcast_session_participants
CREATE POLICY "podcast_participants_insert" ON public.podcast_session_participants
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "podcast_participants_update" ON public.podcast_session_participants
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "podcast_participants_delete" ON public.podcast_session_participants
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "podcast_participants_select" ON public.podcast_session_participants
FOR SELECT USING (true);

-- Simple non-recursive policies for podcast_session_signals
CREATE POLICY "podcast_signals_insert" ON public.podcast_session_signals
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "podcast_signals_select" ON public.podcast_session_signals
FOR SELECT USING (true);