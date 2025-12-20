-- Add pricing columns to albums table
ALTER TABLE albums 
ADD COLUMN price numeric,
ADD COLUMN is_free boolean NOT NULL DEFAULT true,
ADD COLUMN access_level access_level DEFAULT 'public'::access_level,
ADD COLUMN status text NOT NULL DEFAULT 'draft',
ADD COLUMN published_at timestamptz,
ADD COLUMN thumbnail_url text,
ADD COLUMN audio_type text,
ADD COLUMN is_adult_content boolean DEFAULT false;

-- Remove price from album tracks (set to null for tracks that belong to albums)
UPDATE audio_products 
SET price = NULL, is_free = true 
WHERE album_id IS NOT NULL;

-- Migrate existing album data from track #1
UPDATE albums a
SET 
  price = ap.price,
  is_free = ap.is_free,
  access_level = ap.access_level,
  status = ap.status,
  published_at = ap.published_at,
  thumbnail_url = ap.thumbnail_url,
  audio_type = ap.audio_type,
  is_adult_content = ap.is_adult_content
FROM audio_products ap
JOIN album_tracks at ON at.audio_product_id = ap.id
WHERE at.album_id = a.id 
AND at.track_number = 1;