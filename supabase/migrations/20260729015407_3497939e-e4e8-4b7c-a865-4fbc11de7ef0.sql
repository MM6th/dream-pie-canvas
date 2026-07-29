CREATE TABLE public.sandbox_state (
  sandbox_id UUID PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sandbox_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sandbox_state TO authenticated;
GRANT ALL ON public.sandbox_state TO service_role;

ALTER TABLE public.sandbox_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public sandbox read" ON public.sandbox_state FOR SELECT USING (true);
CREATE POLICY "Public sandbox insert" ON public.sandbox_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Public sandbox update" ON public.sandbox_state FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public sandbox delete" ON public.sandbox_state FOR DELETE USING (true);

CREATE TRIGGER update_sandbox_state_updated_at
BEFORE UPDATE ON public.sandbox_state
FOR EACH ROW EXECUTE FUNCTION public.update_notifications_timestamp();