
CREATE POLICY "Users can see if they are blocked"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocked_id = auth.uid());
