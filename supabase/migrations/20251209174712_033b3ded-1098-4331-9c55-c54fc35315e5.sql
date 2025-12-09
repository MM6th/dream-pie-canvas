-- Fix the user's skills that got cleared
UPDATE profiles 
SET skills = ARRAY['Live Stream Artist']
WHERE email = 'chaunceymoore9@gmail.com';

-- Also let's verify the trigger is working correctly by checking its definition
-- The issue is that the admin approval trigger only updates approval_status
-- which is correct - it shouldn't modify other fields
-- The skills should have been preserved from signup