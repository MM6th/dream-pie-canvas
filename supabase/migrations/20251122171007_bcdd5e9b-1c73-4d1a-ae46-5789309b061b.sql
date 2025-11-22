-- Backfill real revenue from astrology purchase on 2025-11-21
INSERT INTO quarterly_income (
  user_id, 
  year, 
  quarter, 
  income_type, 
  total_income, 
  source_count, 
  is_test_data
) VALUES (
  'cedd3262-be80-4af4-9675-c081107cecb5',
  2025,
  4,
  'company_revenue',
  86.87,
  1,
  false
)
ON CONFLICT DO NOTHING;