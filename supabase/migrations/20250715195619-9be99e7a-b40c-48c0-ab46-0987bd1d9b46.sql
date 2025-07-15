-- Add access_level column to video_products table
ALTER TABLE public.video_products 
ADD COLUMN access_level access_level DEFAULT 'public'::access_level;

-- Add access_level column to astrology_products table
ALTER TABLE public.astrology_products 
ADD COLUMN access_level access_level DEFAULT 'public'::access_level;

-- Add access_level column to fashion_products table
ALTER TABLE public.fashion_products 
ADD COLUMN access_level access_level DEFAULT 'public'::access_level;