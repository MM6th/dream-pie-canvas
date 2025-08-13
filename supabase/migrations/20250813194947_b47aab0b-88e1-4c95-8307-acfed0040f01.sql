-- Step 1: Find the merchant who downloaded the Dance to Dairy Queen opportunity
-- and create an audio product entry for their access

-- First, let's get the video ad opportunity details
WITH video_ad_opportunity AS (
  SELECT id, admin_id, audio_file_url, title, artist_name, thumbnail_url
  FROM public.video_ad_opportunities 
  WHERE title LIKE '%Dance to Dairy Queen%'
  LIMIT 1
),
merchant_download AS (
  SELECT vad.merchant_id, vad.downloaded_at
  FROM public.video_ad_downloads vad
  JOIN video_ad_opportunity vao ON vad.video_ad_opportunity_id = vao.id
  LIMIT 1
)
-- Create an audio product specifically for the merchant's video ad access
INSERT INTO public.audio_products (
  merchant_id,
  title,
  audio_type,
  audio_file_url,
  thumbnail_url,
  artist_name,
  description,
  is_free,
  access_level,
  created_at,
  updated_at
)
SELECT 
  vao.admin_id, -- Use admin as merchant_id for the audio product
  'Dance to Dairy Queen (Video Ad Audio)',
  'video_ad_audio',
  vao.audio_file_url,
  vao.thumbnail_url,
  vao.artist_name,
  'Audio file from video ad opportunity download',
  true,
  'public'::access_level,
  NOW(),
  NOW()
FROM video_ad_opportunity vao
WHERE NOT EXISTS (
  SELECT 1 FROM public.audio_products 
  WHERE audio_file_url = vao.audio_file_url 
  AND title LIKE '%Video Ad Audio%'
);

-- Step 2: Create user purchase record for the merchant who downloaded the opportunity
WITH video_ad_opportunity AS (
  SELECT id, admin_id, audio_file_url, title
  FROM public.video_ad_opportunities 
  WHERE title LIKE '%Dance to Dairy Queen%'
  LIMIT 1
),
merchant_download AS (
  SELECT vad.merchant_id, vad.downloaded_at
  FROM public.video_ad_downloads vad
  JOIN video_ad_opportunity vao ON vad.video_ad_opportunity_id = vao.id
  LIMIT 1
),
audio_product AS (
  SELECT ap.id
  FROM public.audio_products ap
  JOIN video_ad_opportunity vao ON ap.audio_file_url = vao.audio_file_url
  WHERE ap.title LIKE '%Video Ad Audio%'
  LIMIT 1
)
INSERT INTO public.user_purchases (
  user_id,
  audio_product_id,
  purchase_date,
  amount_paid,
  is_free_download,
  created_at
)
SELECT 
  md.merchant_id,
  ap.id,
  md.downloaded_at,
  0,
  true,
  md.downloaded_at
FROM merchant_download md
CROSS JOIN audio_product ap
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_purchases 
  WHERE user_id = md.merchant_id AND audio_product_id = ap.id
);