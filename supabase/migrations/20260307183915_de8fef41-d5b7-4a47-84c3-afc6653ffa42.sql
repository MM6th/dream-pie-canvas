
-- Live streams table
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'live', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT,
  thumbnail_url TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  credits_per_minute INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live chat messages table
CREATE TABLE public.live_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live stream tips table
CREATE TABLE public.live_stream_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WebRTC signaling table for P2P
CREATE TABLE public.live_stream_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_signals ENABLE ROW LEVEL SECURITY;

-- RLS: live_streams - anyone can read, merchants can manage their own
CREATE POLICY "Anyone can view live streams" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Merchants can insert own streams" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);
CREATE POLICY "Merchants can update own streams" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = merchant_id);

-- RLS: live_chat_messages - anyone can read stream chat, authenticated can post
CREATE POLICY "Anyone can view chat messages" ON public.live_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can send chat" ON public.live_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS: live_stream_tips - users can see their own tips, recipients can see received
CREATE POLICY "Users can view own tips" ON public.live_stream_tips FOR SELECT TO authenticated USING (auth.uid() = tipper_id OR auth.uid() = recipient_id);
CREATE POLICY "Authenticated users can send tips" ON public.live_stream_tips FOR INSERT TO authenticated WITH CHECK (auth.uid() = tipper_id);

-- RLS: signals - participants can read/write
CREATE POLICY "Participants can view signals" ON public.live_stream_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can send signals" ON public.live_stream_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for chat and signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_live_streams_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW EXECUTE FUNCTION update_live_streams_timestamp();

-- Tip function (atomic transfer)
CREATE OR REPLACE FUNCTION public.tip_live_stream(p_stream_id uuid, p_recipient_id uuid, p_amount bigint DEFAULT 1)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_tipper_id UUID;
  v_balance BIGINT;
BEGIN
  v_tipper_id := auth.uid();
  IF v_tipper_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_tipper_id = p_recipient_id THEN RAISE EXCEPTION 'Cannot tip yourself'; END IF;

  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_tipper_id;
  IF v_balance IS NULL OR v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient token balance'; END IF;

  UPDATE public.token_balances SET balance = balance - p_amount, updated_at = now() WHERE user_id = v_tipper_id;
  INSERT INTO public.token_balances (user_id, balance) VALUES (p_recipient_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = token_balances.balance + p_amount, updated_at = now();
  INSERT INTO public.live_stream_tips (stream_id, tipper_id, recipient_id, amount) VALUES (p_stream_id, v_tipper_id, p_recipient_id, p_amount);

  RETURN true;
END; $$;
