-- Update the bulletin_posts post_type check constraint to include all four post types
ALTER TABLE public.bulletin_posts 
DROP CONSTRAINT IF EXISTS bulletin_posts_post_type_check;

ALTER TABLE public.bulletin_posts 
ADD CONSTRAINT bulletin_posts_post_type_check 
CHECK (post_type IN ('tv_guide', 'current_thoughts', 'announcement', 'regular'));