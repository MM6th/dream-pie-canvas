-- Add thumbnail_url column to video_ad_opportunities table
ALTER TABLE public.video_ad_opportunities 
ADD COLUMN thumbnail_url text NULL;