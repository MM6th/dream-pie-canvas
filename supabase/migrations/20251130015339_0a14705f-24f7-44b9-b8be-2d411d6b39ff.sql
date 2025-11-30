-- Update the default value for credits_per_message to 10
ALTER TABLE message_settings 
ALTER COLUMN credits_per_message SET DEFAULT 10;

-- Update any existing rows that have 1 credit to 10 credits
UPDATE message_settings 
SET credits_per_message = 10 
WHERE credits_per_message = 1;