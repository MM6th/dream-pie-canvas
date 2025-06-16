
-- Add access_level enum and column to audio_products table
CREATE TYPE public.access_level AS ENUM ('public', 'merchant_only', 'paid');

-- Add the access_level column to audio_products table
ALTER TABLE public.audio_products 
ADD COLUMN access_level public.access_level DEFAULT 'public';

-- Update existing records based on current is_free field
UPDATE public.audio_products 
SET access_level = CASE 
  WHEN is_free = true THEN 'public'::access_level
  ELSE 'paid'::access_level
END;

-- We'll keep the is_free column for now to maintain backward compatibility
-- but the access_level will be the primary field going forward
