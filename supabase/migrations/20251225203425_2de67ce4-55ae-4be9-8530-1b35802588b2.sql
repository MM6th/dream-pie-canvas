-- Reset is_private to false for all profiles
-- This allows profiles to be visible in the trending directory by default
-- Users can still manually set their profile to private if they want
UPDATE public.profiles
SET is_private = false
WHERE is_private = true;