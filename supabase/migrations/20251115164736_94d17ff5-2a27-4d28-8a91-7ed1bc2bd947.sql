-- Add skills column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[];

-- Add comment to describe the column
COMMENT ON COLUMN profiles.skills IS 'Array of skill/industry keywords (e.g., editor, musician, influencer)';