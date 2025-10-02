-- Create quarterly_income table to track revenue allocations
CREATE TABLE public.quarterly_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  income_type TEXT NOT NULL, -- 'merchant_revenue', 'platform_fee', 'referral_commission'
  total_income NUMERIC NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0, -- number of transactions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, quarter, income_type)
);

-- Enable RLS
ALTER TABLE public.quarterly_income ENABLE ROW LEVEL SECURITY;

-- Users can view their own income
CREATE POLICY "Users can view their own quarterly income"
ON public.quarterly_income
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all income
CREATE POLICY "Admins can view all quarterly income"
ON public.quarterly_income
FOR SELECT
USING (is_admin(auth.uid()));

-- System can insert/update income records
CREATE POLICY "Authenticated users can manage their own income"
ON public.quarterly_income
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update quarterly income
CREATE OR REPLACE FUNCTION public.update_quarterly_income(
  p_user_id UUID,
  p_income_type TEXT,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_quarter INTEGER;
BEGIN
  -- Get current year and quarter
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_quarter := EXTRACT(QUARTER FROM CURRENT_DATE);
  
  -- Insert or update quarterly income
  INSERT INTO public.quarterly_income (
    user_id,
    year,
    quarter,
    income_type,
    total_income,
    source_count
  )
  VALUES (
    p_user_id,
    v_year,
    v_quarter,
    p_income_type,
    p_amount,
    1
  )
  ON CONFLICT (user_id, year, quarter, income_type)
  DO UPDATE SET
    total_income = quarterly_income.total_income + p_amount,
    source_count = quarterly_income.source_count + 1,
    updated_at = now();
END;
$$;

-- Create index for faster queries
CREATE INDEX idx_quarterly_income_user_year_quarter 
ON public.quarterly_income(user_id, year, quarter);

COMMENT ON TABLE public.quarterly_income IS 'Tracks quarterly income for tax calculation purposes';
COMMENT ON FUNCTION public.update_quarterly_income IS 'Updates quarterly income totals for a user';