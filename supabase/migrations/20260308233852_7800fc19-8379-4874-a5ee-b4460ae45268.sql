-- Drop the recording_url column from live_streams table
ALTER TABLE public.live_streams 
DROP COLUMN IF EXISTS recording_url;