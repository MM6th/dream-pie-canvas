
CREATE TABLE public.challenge_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bulletin_post_id UUID NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('challenger_1', 'challenger_2')),
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (bulletin_post_id, slot),
  UNIQUE (bulletin_post_id, user_id)
);

ALTER TABLE public.challenge_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view acceptances"
ON public.challenge_acceptances FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can accept challenges"
ON public.challenge_acceptances FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can withdraw their own acceptance"
ON public.challenge_acceptances FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_challenge_acceptances_post ON public.challenge_acceptances(bulletin_post_id);
