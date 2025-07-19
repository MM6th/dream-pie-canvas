
-- Add video support to bulletin_posts table
ALTER TABLE public.bulletin_posts 
ADD COLUMN video_url TEXT,
ADD COLUMN media_type TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.bulletin_posts.video_url IS 'URL to uploaded video file in user-media bucket';
COMMENT ON COLUMN public.bulletin_posts.media_type IS 'Type of media: image, video, or null for text-only posts';
