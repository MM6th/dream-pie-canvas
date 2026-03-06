
CREATE TABLE public.post_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  tipper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tips on any post"
  ON public.post_tips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tips"
  ON public.post_tips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tipper_id);

-- Function to transfer tokens from tipper to recipient
CREATE OR REPLACE FUNCTION public.tip_post(p_post_id UUID, p_recipient_id UUID, p_amount BIGINT DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tipper_id UUID;
  v_balance BIGINT;
BEGIN
  v_tipper_id := auth.uid();
  
  IF v_tipper_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_tipper_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot tip yourself';
  END IF;

  -- Check tipper balance
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_tipper_id;
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  -- Deduct from tipper
  UPDATE public.token_balances
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = v_tipper_id;

  -- Add to recipient (upsert)
  INSERT INTO public.token_balances (user_id, balance)
  VALUES (p_recipient_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = token_balances.balance + p_amount,
    updated_at = now();

  -- Record the tip
  INSERT INTO public.post_tips (post_id, tipper_id, recipient_id, amount)
  VALUES (p_post_id, v_tipper_id, p_recipient_id, p_amount);

  RETURN true;
END;
$$;
