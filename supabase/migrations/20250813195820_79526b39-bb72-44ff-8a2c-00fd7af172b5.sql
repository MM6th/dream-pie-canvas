-- Update the audio product with the correct URL
UPDATE public.audio_products 
SET audio_file_url = 'https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/audio-files/video-ad-opportunities/cedd3262-be80-4af4-9675-c081107cecb5/1753123161696.m4a',
    updated_at = NOW()
WHERE title = 'Dance to Dairy Queen (Video Ad Access)';