ALTER TABLE public.bulletin_posts
  ADD COLUMN champion_user_id uuid DEFAULT NULL REFERENCES public.profiles(id);