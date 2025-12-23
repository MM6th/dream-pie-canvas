-- Add content_category column to user_uploads table
-- This distinguishes between 'general' (portfolio videos) and 'podcast' (podcast videos)
ALTER TABLE user_uploads ADD COLUMN IF NOT EXISTS content_category text DEFAULT 'general';

-- Add a check constraint to ensure valid categories
ALTER TABLE user_uploads ADD CONSTRAINT check_content_category 
  CHECK (content_category IN ('general', 'podcast'));