-- Remove the duplicate "Dance to Dairy Queen (Video Ad Access)" record from audio_products
-- This should only exist in video_ad_opportunities table, not in audio_products
DELETE FROM audio_products 
WHERE title = 'Dance to Dairy Queen (Video Ad Access)' 
AND audio_type = 'music';