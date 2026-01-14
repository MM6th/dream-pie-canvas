-- Add thumbnail_url column to podcast_recordings for upload-time thumbnails
ALTER TABLE public.podcast_recordings 
ADD COLUMN thumbnail_url TEXT;