-- Create podcast_cast_members table to store cast members for podcast recordings
CREATE TABLE public.podcast_cast_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_recording_id UUID NOT NULL REFERENCES podcast_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(podcast_recording_id, user_id)
);

-- Enable RLS
ALTER TABLE public.podcast_cast_members ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can view cast members (for display purposes)
CREATE POLICY "Anyone can view podcast cast members"
ON public.podcast_cast_members
FOR SELECT
USING (true);

-- Podcast owner can manage cast members
CREATE POLICY "Podcast owners can manage cast members"
ON public.podcast_cast_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM podcast_recordings
    WHERE podcast_recordings.id = podcast_cast_members.podcast_recording_id
    AND podcast_recordings.merchant_id = auth.uid()
  )
);

-- Create index for efficient lookups
CREATE INDEX idx_podcast_cast_members_recording ON public.podcast_cast_members(podcast_recording_id);
CREATE INDEX idx_podcast_cast_members_user ON public.podcast_cast_members(user_id);