-- Create audio product for Dance to Dairy Queen video ad access
INSERT INTO public.audio_products (
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
VALUES (
  '035da421-a23b-4a76-85db-44be2157c064',
  'Dance to Dairy Queen (Video Ad Access)',
  'music',
  'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/audio-files/cedd3262-be80-4af4-9675-c081107cecb5/1722782264949.m4a',
  'Benjiman6th',
  'Audio access from video ad opportunity download',
  true,
  'public'::access_level,
  '2025-08-04 15:18:03.272701+00'::timestamptz,
  '2025-08-04 15:18:03.272701+00'::timestamptz
);

-- Create user purchase record linking merchant to this audio
INSERT INTO public.user_purchases (
  user_id,
  audio_product_id,
  purchase_date,
  amount_paid,
  is_free_download,
  created_at
)
SELECT 
  '035da421-a23b-4a76-85db-44be2157c064'::uuid,
  ap.id,
  '2025-08-04 15:18:03.272701+00'::timestamptz,
  0,
  true,
  '2025-08-04 15:18:03.272701+00'::timestamptz
FROM public.audio_products ap
WHERE ap.title = 'Dance to Dairy Queen (Video Ad Access)'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_purchases 
    WHERE user_id = '035da421-a23b-4a76-85db-44be2157c064'::uuid 
    AND audio_product_id = ap.id
  );