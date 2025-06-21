
-- Add adult_content_restricted column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN adult_content_restricted BOOLEAN DEFAULT false;

-- Add is_adult_content columns to product tables
ALTER TABLE public.audio_products 
ADD COLUMN is_adult_content BOOLEAN DEFAULT false;

ALTER TABLE public.video_products 
ADD COLUMN is_adult_content BOOLEAN DEFAULT false;

ALTER TABLE public.astrology_products 
ADD COLUMN is_adult_content BOOLEAN DEFAULT false;

ALTER TABLE public.fashion_products 
ADD COLUMN is_adult_content BOOLEAN DEFAULT false;

ALTER TABLE public.bulletin_posts 
ADD COLUMN is_adult_content BOOLEAN DEFAULT false;
