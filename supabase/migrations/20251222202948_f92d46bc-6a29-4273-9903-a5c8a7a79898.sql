-- Update the astrology processing fee record to use the admin's user ID 
-- (since this is business revenue/expense tracking for the admin who owns PIE)
UPDATE platform_revenue 
SET source_user_id = 'cedd3262-be80-4af4-9675-c081107cecb5'
WHERE source_transaction_id = '05K48662E13730346' 
AND revenue_type = 'astrology_processing_fee';