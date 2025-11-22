-- Phase 1: Add is_test_data column to quarterly_income table
ALTER TABLE quarterly_income 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quarterly_income_test_data 
ON quarterly_income(user_id, year, quarter, is_test_data);

-- Phase 2: Update the update_quarterly_income function to support test flag
CREATE OR REPLACE FUNCTION public.update_quarterly_income(
  p_user_id uuid, 
  p_income_type text, 
  p_amount numeric,
  p_is_test_data boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year INTEGER;
  v_quarter INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_quarter := EXTRACT(QUARTER FROM CURRENT_DATE);
  
  -- For test data, always create separate records
  -- For real data, use conflict resolution
  IF p_is_test_data THEN
    INSERT INTO public.quarterly_income (
      user_id, year, quarter, income_type, total_income, source_count, is_test_data
    )
    VALUES (
      p_user_id, v_year, v_quarter, p_income_type, p_amount, 1, true
    );
  ELSE
    INSERT INTO public.quarterly_income (
      user_id, year, quarter, income_type, total_income, source_count, is_test_data
    )
    VALUES (
      p_user_id, v_year, v_quarter, p_income_type, p_amount, 1, false
    )
    ON CONFLICT (user_id, year, quarter, income_type)
    DO UPDATE SET
      total_income = quarterly_income.total_income + p_amount,
      source_count = quarterly_income.source_count + 1,
      updated_at = now();
  END IF;
END;
$function$;

-- Phase 3: Mark existing test data
-- Mark records with test transaction IDs
UPDATE quarterly_income 
SET is_test_data = true
WHERE user_id IN (
  SELECT DISTINCT source_user_id 
  FROM platform_revenue 
  WHERE metadata->>'test_simulation' = 'true' 
     OR metadata->>'test_astrology_simulation' = 'true'
)
AND is_test_data = false;

-- Mark records associated with test purchases
UPDATE quarterly_income 
SET is_test_data = true
WHERE user_id IN (
  SELECT DISTINCT merchant_id
  FROM audio_products
  WHERE id IN (
    SELECT audio_product_id 
    FROM user_purchases 
    WHERE paypal_transaction_id LIKE 'TEST_%'
  )
)
AND is_test_data = false;