-- Update the CHECK constraint to allow 'current_affirmations' as a valid post_type
ALTER TABLE bulletin_posts 
DROP CONSTRAINT IF EXISTS bulletin_posts_post_type_check;

ALTER TABLE bulletin_posts 
ADD CONSTRAINT bulletin_posts_post_type_check 
CHECK (post_type = ANY (ARRAY['tv_guide'::text, 'current_thoughts'::text, 'announcement'::text, 'regular'::text, 'current_affirmations'::text]));