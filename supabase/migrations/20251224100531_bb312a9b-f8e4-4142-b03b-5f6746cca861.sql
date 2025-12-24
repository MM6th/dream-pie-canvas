-- Add tier_description column to podcast_recordings for storing custom tier perks
ALTER TABLE public.podcast_recordings 
ADD COLUMN tier_description text;