-- Add advertisement video URL column to astrology_products table
ALTER TABLE public.astrology_products 
ADD COLUMN advertisement_video_url TEXT DEFAULT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.astrology_products.advertisement_video_url IS 'URL of the advertisement video for the astrology product, stored in Supabase storage';