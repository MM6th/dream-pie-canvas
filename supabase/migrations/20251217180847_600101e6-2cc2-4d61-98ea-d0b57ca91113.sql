-- Add is_video_muted column to portfolio_images for persisting mute preference
ALTER TABLE public.portfolio_images 
ADD COLUMN is_video_muted boolean DEFAULT false;