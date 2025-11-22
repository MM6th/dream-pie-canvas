-- Phase 3: Correct the backfilled November 21st astrology purchase revenue
-- Change from $86.87 (incorrect 90% split) to $96.52 (correct 100% after PayPal fees)
UPDATE quarterly_income
SET 
  total_income = 96.52,  -- 100% of $100 - $3.48 PayPal fee = $96.52
  updated_at = now()
WHERE 
  user_id = 'cedd3262-be80-4af4-9675-c081107cecb5'
  AND year = 2025
  AND quarter = 4
  AND income_type = 'company_revenue'
  AND is_test_data = false;

-- Phase 4: Remove the incorrect $9.65 platform fee record from the November 21st sale
-- PIE's own astrology products should not have platform fees
DELETE FROM platform_revenue
WHERE 
  revenue_type = 'platform_operational_cost'
  AND metadata->>'product_type' = 'astrology'
  AND source_user_id IS NOT NULL
  AND created_at >= '2025-11-21'::date
  AND created_at < '2025-11-22'::date;