
CREATE TABLE public.one_on_one_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_name TEXT NOT NULL,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_one_on_one_tips_room ON public.one_on_one_tips(room_name, created_at DESC);

ALTER TABLE public.one_on_one_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tips"
ON public.one_on_one_tips FOR SELECT TO authenticated
USING (true);

CREATE POLICY "System inserts tips via function"
ON public.one_on_one_tips FOR INSERT TO authenticated
WITH CHECK (tipper_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.one_on_one_tips;

CREATE OR REPLACE FUNCTION public.tip_one_on_one(p_room_name TEXT, p_recipient_id UUID, p_amount BIGINT DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tipper_id UUID;
  v_balance BIGINT;
BEGIN
  v_tipper_id := auth.uid();
  IF v_tipper_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_tipper_id = p_recipient_id THEN RAISE EXCEPTION 'Cannot tip yourself'; END IF;

  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_tipper_id;
  IF v_balance IS NULL OR v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient SIXTH token balance'; END IF;

  UPDATE public.token_balances SET balance = balance - p_amount, updated_at = now() WHERE user_id = v_tipper_id;
  INSERT INTO public.token_balances (user_id, balance) VALUES (p_recipient_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = token_balances.balance + p_amount, updated_at = now();
  INSERT INTO public.one_on_one_tips (room_name, tipper_id, recipient_id, amount) VALUES (p_room_name, v_tipper_id, p_recipient_id, p_amount);

  RETURN true;
END;
$$;
