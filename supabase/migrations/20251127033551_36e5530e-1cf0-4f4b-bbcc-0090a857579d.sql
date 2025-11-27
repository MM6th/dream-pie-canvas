-- Add attachment fields to astrology_deliveries table
ALTER TABLE astrology_deliveries
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_filename TEXT;