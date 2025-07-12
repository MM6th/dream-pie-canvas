-- Add max_downloads field to audio_products table
ALTER TABLE public.audio_products 
ADD COLUMN max_downloads integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.audio_products.max_downloads IS 'Maximum number of downloads allowed for merchant_only podcasts (NULL = unlimited)';

-- Create index for efficient querying
CREATE INDEX idx_audio_products_max_downloads ON public.audio_products(max_downloads) WHERE max_downloads IS NOT NULL;