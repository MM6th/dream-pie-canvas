-- Insert the missing PayPal fee record for the astrology purchase that occurred before fee tracking was added
-- PayPal fee calculation: ($100 * 3.49%) + $0.49 = $3.49 + $0.49 = $3.98
INSERT INTO platform_revenue (
  revenue_type,
  amount,
  source_user_id,
  source_transaction_id,
  metadata
)
VALUES (
  'astrology_processing_fee',
  0,
  '45dc200f-dd9a-4696-947d-c988dd0c0e1d',
  '05K48662E13730346',
  '{"paypal_fee": 3.98, "gross_amount": 100, "net_amount": 96.02, "product_type": "astrology_reading", "backfill_note": "Fee record added retroactively"}'::jsonb
);