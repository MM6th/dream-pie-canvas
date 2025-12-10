-- Update existing livestream_settings to use 3 minute sessions for 3 credit entry
UPDATE public.livestream_settings 
SET session_duration_minutes = 3, 
    updated_at = now() 
WHERE session_duration_minutes = 20;