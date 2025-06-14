
CREATE POLICY "Users can view public profile data"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');
