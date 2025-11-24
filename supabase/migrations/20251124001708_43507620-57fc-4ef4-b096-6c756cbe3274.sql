-- Add attachment_url column to messages table for photo attachments
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;