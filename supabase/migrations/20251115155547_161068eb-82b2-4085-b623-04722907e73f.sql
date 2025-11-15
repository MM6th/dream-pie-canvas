-- Create messaging_credits table
CREATE TABLE public.messaging_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messaging_credits
ALTER TABLE public.messaging_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for messaging_credits
CREATE POLICY "Users can view their own credits"
ON public.messaging_credits
FOR SELECT
USING (auth.uid() = user_id);

-- Create credit_transactions table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spent')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  paypal_order_id TEXT,
  related_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view messages they sent or received"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Create message_settings table
CREATE TABLE public.message_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits_per_message INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on message_settings
ALTER TABLE public.message_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_settings
CREATE POLICY "Anyone can view message settings"
ON public.message_settings
FOR SELECT
USING (true);

CREATE POLICY "Merchants can update their own settings"
ON public.message_settings
FOR UPDATE
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can insert their own settings"
ON public.message_settings
FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

-- Create indexes for better performance
CREATE INDEX idx_messaging_credits_user_id ON public.messaging_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_message_settings_merchant_id ON public.message_settings(merchant_id);

-- Create trigger to update messaging_credits.updated_at
CREATE OR REPLACE FUNCTION public.update_messaging_credits_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_messaging_credits_updated_at
BEFORE UPDATE ON public.messaging_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_messaging_credits_timestamp();

-- Create trigger to update message_settings.updated_at
CREATE OR REPLACE FUNCTION public.update_message_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_message_settings_updated_at
BEFORE UPDATE ON public.message_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_message_settings_timestamp();