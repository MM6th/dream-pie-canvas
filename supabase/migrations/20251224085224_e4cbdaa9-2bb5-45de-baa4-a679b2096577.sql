-- Add subscription tier and related columns to podcast_recordings
ALTER TABLE public.podcast_recordings 
ADD COLUMN subscription_tier TEXT CHECK (subscription_tier IN ('moon', 'venus', 'jupiter')),
ADD COLUMN subscription_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN paypal_plan_id TEXT;

-- Create podcast_subscriptions table to track active subscriptions
CREATE TABLE public.podcast_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  podcast_recording_id UUID NOT NULL REFERENCES public.podcast_recordings(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paypal_subscription_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('moon', 'venus', 'jupiter')),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_billing_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on podcast_subscriptions
ALTER TABLE public.podcast_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscribers can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON public.podcast_subscriptions 
FOR SELECT 
USING (auth.uid() = subscriber_id);

-- Merchants can view subscriptions to their content
CREATE POLICY "Merchants can view subscriptions to their content" 
ON public.podcast_subscriptions 
FOR SELECT 
USING (auth.uid() = merchant_id);

-- System can insert subscriptions (via edge function with service role)
CREATE POLICY "Service role can manage subscriptions" 
ON public.podcast_subscriptions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions" 
ON public.podcast_subscriptions 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_podcast_subscriptions_timestamp
BEFORE UPDATE ON public.podcast_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_deliveries_timestamp();

-- Add index for faster lookups
CREATE INDEX idx_podcast_subscriptions_subscriber ON public.podcast_subscriptions(subscriber_id);
CREATE INDEX idx_podcast_subscriptions_merchant ON public.podcast_subscriptions(merchant_id);
CREATE INDEX idx_podcast_subscriptions_recording ON public.podcast_subscriptions(podcast_recording_id);
CREATE INDEX idx_podcast_subscriptions_paypal ON public.podcast_subscriptions(paypal_subscription_id);