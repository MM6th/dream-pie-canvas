-- Clean up all test data records
DELETE FROM quarterly_income WHERE is_test_data = true;

-- Zero out near-zero balances (cleanup artifacts from old test data)
UPDATE quarterly_income 
SET total_income = 0, source_count = 0 
WHERE ABS(total_income) < 0.10 AND ABS(total_income) > 0;

-- Remove zero-balance records to keep the table clean
DELETE FROM quarterly_income 
WHERE total_income = 0 AND source_count = 0;