-- Add video mixing preferences columns to video_ad_submissions table
ALTER TABLE public.video_ad_submissions 
ADD COLUMN background_audio_volume numeric DEFAULT 0.5 CHECK (background_audio_volume >= 0 AND background_audio_volume <= 1),
ADD COLUMN video_audio_volume numeric DEFAULT 0.5 CHECK (video_audio_volume >= 0 AND video_audio_volume <= 1),
ADD COLUMN audio_sync_offset numeric DEFAULT 0,
ADD COLUMN mixing_preferences jsonb DEFAULT '{}'::jsonb;