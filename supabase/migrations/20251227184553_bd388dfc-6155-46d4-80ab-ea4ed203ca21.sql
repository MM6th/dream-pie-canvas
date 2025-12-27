-- Drop the old 3-parameter version that's causing ambiguity
DROP FUNCTION IF EXISTS public.update_quarterly_income(uuid, text, numeric);

-- Recreate the function with only the 4-parameter signature (with default)
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