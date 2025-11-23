-- Add parent_message_id column to messages table for conversation threading
ALTER TABLE messages ADD COLUMN parent_message_id uuid REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for better query performance on threaded messages
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);

-- Add comment for documentation
COMMENT ON COLUMN messages.parent_message_id IS 'Reference to parent message for threading conversations';