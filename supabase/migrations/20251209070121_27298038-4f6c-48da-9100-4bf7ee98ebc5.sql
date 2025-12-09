-- Create merchant_payouts table to track payout thresholds and history
CREATE TABLE public.merchant_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  threshold_reached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '3 days'),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'paid', 'cancelled'))
);

-- Create index for efficient queries
CREATE INDEX idx_merchant_payouts_merchant_id ON public.merchant_payouts(merchant_id);
CREATE INDEX idx_merchant_payouts_status ON public.merchant_payouts(status);

-- Enable RLS
ALTER TABLE public.merchant_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Merchants can view their own payouts"
ON public.merchant_payouts FOR SELECT
USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all payouts"
ON public.merchant_payouts FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create payouts"
ON public.merchant_payouts FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "System can create payouts"
ON public.merchant_payouts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update payouts"
ON public.merchant_payouts FOR UPDATE
USING (is_admin(auth.uid()));

-- Trigger to update timestamp
CREATE TRIGGER update_merchant_payouts_timestamp
BEFORE UPDATE ON public.merchant_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_timestamp();

-- Function to check payout threshold and create notification
CREATE OR REPLACE FUNCTION public.check_merchant_payout_threshold(p_merchant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_unpaid NUMERIC;
  v_pending_payouts NUMERIC;
  v_available_for_payout NUMERIC;
  v_admin_id UUID;
  v_merchant_name TEXT;
  v_payout_threshold NUMERIC := 100.00;
BEGIN
  -- Get total revenue for current quarter
  SELECT COALESCE(SUM(total_income), 0) INTO v_total_unpaid
  FROM quarterly_income
  WHERE user_id = p_merchant_id
    AND income_type = 'merchant_revenue'
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND quarter = EXTRACT(QUARTER FROM CURRENT_DATE);

  -- Get sum of already pending/processing payouts
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_payouts
  FROM merchant_payouts
  WHERE merchant_id = p_merchant_id
    AND status IN ('pending', 'processing');

  -- Calculate available for new payout
  v_available_for_payout := v_total_unpaid - v_pending_payouts;

  -- Check if threshold is reached
  IF v_available_for_payout >= v_payout_threshold THEN
    -- Get merchant name
    SELECT COALESCE(display_name, business_name, email) INTO v_merchant_name
    FROM profiles
    WHERE id = p_merchant_id;

    -- Get admin ID
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE is_admin = true
    LIMIT 1;

    -- Create payout record
    INSERT INTO merchant_payouts (merchant_id, amount, status)
    VALUES (p_merchant_id, v_payout_threshold, 'pending');

    -- Create admin notification
    IF v_admin_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (
        v_admin_id,
        'payout_threshold',
        'Merchant Payout Required',
        v_merchant_name || ' has reached the $100 payout threshold. Payment is due within 3 days.'
      );
    END IF;

    -- Create merchant notification
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      p_merchant_id,
      'payout_pending',
      'Payment Pending',
      'Congratulations! You have reached the $100 payout threshold. Your payment of $100 is now pending and will be processed within 3 days.'
    );

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;