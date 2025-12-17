-- Add background_music_url column to portfolio_images for video items
ALTER TABLE public.portfolio_images 
ADD COLUMN background_music_url TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.portfolio_images.background_music_url IS 'URL of background music audio file from user-owned audio products';