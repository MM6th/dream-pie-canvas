ALTER TABLE public.bulletin_posts
  ADD COLUMN challenger1_purse numeric DEFAULT NULL,
  ADD COLUMN challenger2_purse numeric DEFAULT NULL,
  ADD COLUMN champion_purse numeric DEFAULT NULL;