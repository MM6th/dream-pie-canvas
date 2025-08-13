-- Create audio product for Dance to Dairy Queen video ad access
WITH video_ad_data AS (
  SELECT 
    'f6e1b8c3-4c8a-4d7e-8f5a-1b2c3d4e5f6g'::uuid as audio_product_id,
    '035da421-a23b-4a76-85db-44be2157c064'::uuid as merchant_id,
    'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/audio-files/cedd3262-be80-4af4-9675-c081107cecb5/1722782264949.m4a' as audio_url
)
-- Insert the audio product
INSERT INTO public.audio_products (
  id,
  merchant_id,
  title,
  audio_type,
  audio_file_url,
  artist_name,
  description,
  is_free,
  access_level,
  created_at,
  updated_at
)
SELECT 
  audio_product_id,
  merchant_id,
  'Dance to Dairy Queen (Video Ad Access)',
  'music',
  audio_url,
  'Benjiman6th',
  'Audio access from video ad opportunity download',
  true,
  'public'::access_level,
  '2025-08-04 15:18:03.272701+00'::timestamptz,
  '2025-08-04 15:18:03.272701+00'::timestamptz
FROM video_ad_data
WHERE NOT EXISTS (
  SELECT 1 FROM public.audio_products 
  WHERE title = 'Dance to Dairy Queen (Video Ad Access)'
);

-- Insert the user purchase record
INSERT INTO public.user_purchases (
  user_id,
  audio_product_id,
  purchase_date,
  amount_paid,
  is_free_download,
  created_at
)
SELECT 
  merchant_id,
  audio_product_id,
  '2025-08-04 15:18:03.272701+00'::timestamptz,
  0,
  true,
  '2025-08-04 15:18:03.272701+00'::timestamptz
FROM video_ad_data
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_purchases 
  WHERE user_id = (SELECT merchant_id FROM video_ad_data) 
  AND audio_product_id = (SELECT audio_product_id FROM video_ad_data)
);