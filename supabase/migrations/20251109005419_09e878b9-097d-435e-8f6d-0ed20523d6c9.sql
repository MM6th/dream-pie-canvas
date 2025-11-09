-- Update existing users who already have avatars to mark their profiles as complete
UPDATE public.profiles 
SET profile_complete = true 
WHERE avatar_url IS NOT NULL 
  AND avatar_url != '' 
  AND profile_complete = false;