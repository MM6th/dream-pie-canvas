
-- Fix Issue 1: Add 'join-request' to signal_type CHECK constraint
ALTER TABLE public.live_stream_signals DROP CONSTRAINT live_stream_signals_signal_type_check;
ALTER TABLE public.live_stream_signals ADD CONSTRAINT live_stream_signals_signal_type_check 
  CHECK (signal_type = ANY (ARRAY['offer'::text, 'answer'::text, 'ice-candidate'::text, 'join-request'::text]));

-- Clean up stale streams stuck as 'live'
UPDATE public.live_streams SET status = 'ended', ended_at = now() 
WHERE status = 'live' AND updated_at < now() - interval '5 minutes';

-- Add webm to allowed MIME types for user-media bucket (for recording uploads)
UPDATE storage.buckets SET allowed_mime_types = array_append(
  CASE WHEN allowed_mime_types IS NULL THEN ARRAY[]::text[] ELSE allowed_mime_types END, 
  'video/webm'
) WHERE id = 'user-media' AND NOT ('video/webm' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));
