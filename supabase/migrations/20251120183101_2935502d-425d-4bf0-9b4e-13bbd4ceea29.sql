-- Add draft video support and multi-segment recording to astrology_deliveries
ALTER TABLE astrology_deliveries 
ADD COLUMN IF NOT EXISTS draft_video_url TEXT,
ADD COLUMN IF NOT EXISTS draft_saved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_segments JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN astrology_deliveries.draft_video_url IS 'URL of the saved draft video before final submission';
COMMENT ON COLUMN astrology_deliveries.draft_saved_at IS 'Timestamp when the draft was last saved';
COMMENT ON COLUMN astrology_deliveries.video_segments IS 'Array of video segment URLs for multi-segment recordings';