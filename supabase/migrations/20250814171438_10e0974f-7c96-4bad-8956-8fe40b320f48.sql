-- First, remove any purchases for the duplicate video ad opportunity record
DELETE FROM user_purchases 
WHERE audio_product_id = 'dae234fe-2dfa-4026-80ec-da99bdb3ac1e';

-- Then remove the duplicate audio product record
DELETE FROM audio_products 
WHERE id = 'dae234fe-2dfa-4026-80ec-da99bdb3ac1e' 
AND title = 'Dance to Dairy Queen (Video Ad Access)';