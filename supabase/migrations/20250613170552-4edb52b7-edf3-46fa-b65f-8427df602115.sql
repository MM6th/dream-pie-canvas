
-- Add the missing link_url column to the bulletin_posts table
ALTER TABLE public.bulletin_posts 
ADD COLUMN link_url TEXT;
