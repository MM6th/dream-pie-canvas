-- Add status and published_at columns to audio_products
ALTER TABLE audio_products 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

ALTER TABLE audio_products 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Update existing records to be published
UPDATE audio_products 
SET status = 'published', published_at = created_at 
WHERE status = 'published' AND published_at IS NULL;

-- Add featuring artist fields to audio_products for singles
ALTER TABLE audio_products 
ADD COLUMN IF NOT EXISTS featuring_artist_name TEXT;

ALTER TABLE audio_products 
ADD COLUMN IF NOT EXISTS featuring_artist_paypal TEXT;

ALTER TABLE audio_products 
ADD COLUMN IF NOT EXISTS featuring_artist_user_id UUID REFERENCES profiles(id);

ALTER TABLE audio_products 
ADD COLUMN IF NOT EXISTS featuring_percentage NUMERIC DEFAULT 30.0;