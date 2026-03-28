ALTER TABLE public.bulletin_posts 
ADD COLUMN challenge_type text,
ADD COLUMN title_on_the_line boolean DEFAULT false;