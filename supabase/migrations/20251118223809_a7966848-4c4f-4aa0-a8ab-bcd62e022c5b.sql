-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create notifications table for in-app alerts
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'purchase', 'pending', 'ready', 'overdue'
  related_delivery_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create astrology_deliveries table to track purchases and recordings
CREATE TABLE public.astrology_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrology_product_id UUID NOT NULL REFERENCES astrology_products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES astrology_purchases(id),
  
  -- Delivery tracking
  delivery_deadline TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  is_overdue BOOLEAN DEFAULT false,
  overdue_message_sent BOOLEAN DEFAULT false,
  
  -- Video URLs
  admin_video_url TEXT, -- Copy stored in admin's storage
  buyer_video_url TEXT, -- Copy stored in buyer's storage
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'delivered'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_astrology_deliveries_buyer_id ON public.astrology_deliveries(buyer_id);
CREATE INDEX idx_astrology_deliveries_admin_id ON public.astrology_deliveries(admin_id);
CREATE INDEX idx_astrology_deliveries_status ON public.astrology_deliveries(status);
CREATE INDEX idx_astrology_deliveries_deadline ON public.astrology_deliveries(delivery_deadline);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable RLS on astrology_deliveries
ALTER TABLE public.astrology_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for astrology_deliveries
CREATE POLICY "Admins can view all deliveries"
  ON public.astrology_deliveries FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Buyers can view their own deliveries"
  ON public.astrology_deliveries FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can update deliveries"
  ON public.astrology_deliveries FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "System can create deliveries"
  ON public.astrology_deliveries FOR INSERT
  WITH CHECK (true);

-- Function to update notifications timestamp
CREATE OR REPLACE FUNCTION public.update_notifications_timestamp()
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

-- Trigger for notifications
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_timestamp();

-- Function to update deliveries timestamp
CREATE OR REPLACE FUNCTION public.update_deliveries_timestamp()
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

-- Trigger for deliveries
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.astrology_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deliveries_timestamp();

-- Function to check and mark overdue deliveries
CREATE OR REPLACE FUNCTION public.check_overdue_deliveries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.astrology_deliveries
  SET is_overdue = true
  WHERE status = 'pending'
    AND delivery_deadline < now()
    AND is_overdue = false;
END;
$$;

-- Add comment
COMMENT ON TABLE public.notifications IS 'Stores in-app notifications for users';
COMMENT ON TABLE public.astrology_deliveries IS 'Tracks astrology product purchases and video delivery status';
COMMENT ON FUNCTION public.check_overdue_deliveries IS 'Marks deliveries as overdue when past deadline';