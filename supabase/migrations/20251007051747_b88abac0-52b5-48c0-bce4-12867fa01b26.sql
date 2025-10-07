-- Add video support to portfolio_images table
ALTER TABLE portfolio_images 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Update existing rows to have media_type 'image'
UPDATE portfolio_images SET media_type = 'image' WHERE media_type IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolio_images_media_type ON portfolio_images(media_type);

-- Verify portfolio_purchases table exists with correct structure
-- (It should already exist based on previous context)
-- Just add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_user_id ON portfolio_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_portfolio_id ON portfolio_purchases(portfolio_id);