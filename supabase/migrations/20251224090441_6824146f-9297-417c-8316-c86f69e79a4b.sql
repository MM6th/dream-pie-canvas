-- Add trailer_url column to podcast_recordings
ALTER TABLE public.podcast_recordings 
ADD COLUMN trailer_url text;