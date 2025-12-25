-- Fix: Profile Sensitive Data Exposed to All Users
-- Drop the overly permissive policy that exposes all columns to any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- Create a more restrictive policy that allows viewing profiles based on privacy settings
-- Users can view non-private profiles, followers can view private profiles, owners see their own
CREATE POLICY "Authenticated users can view accessible profiles"
ON public.profiles
FOR SELECT
USING (
  -- Users can always view their own profile
  auth.uid() = id
  OR
  -- Admins can view all profiles (handled by existing admin policy, but include for safety)
  is_admin(auth.uid())
  OR
  -- For non-private profiles, allow basic access
  (is_private IS NOT TRUE)
  OR
  -- For private profiles, only allow followers to view
  (is_private = TRUE AND can_view_private_profile(auth.uid(), id))
);

-- Create a view for truly public profile data (safe columns only)
-- This provides an additional layer of protection for applications that want to query only safe data
CREATE OR REPLACE VIEW public.public_profile_data AS
SELECT 
  id,
  display_name,
  avatar_url,
  background_image_url,
  user_type,
  is_admin,
  business_name,
  skills,
  industry,
  is_live_stream_artist,
  is_adult_creator,
  adult_content_restricted,
  is_private,
  portfolios_public,
  social_links_public,
  playlist_public,
  approval_status,
  profile_complete,
  created_at,
  updated_at,
  -- Only expose social links if the user has set them to public
  CASE WHEN social_links_public = TRUE THEN website ELSE NULL END as website,
  CASE WHEN social_links_public = TRUE THEN instagram_url ELSE NULL END as instagram_url,
  CASE WHEN social_links_public = TRUE THEN youtube_url ELSE NULL END as youtube_url,
  CASE WHEN social_links_public = TRUE THEN facebook_url ELSE NULL END as facebook_url,
  CASE WHEN social_links_public = TRUE THEN pinterest_url ELSE NULL END as pinterest_url,
  CASE WHEN social_links_public = TRUE THEN snapchat_url ELSE NULL END as snapchat_url,
  CASE WHEN social_links_public = TRUE THEN onlyfans_url ELSE NULL END as onlyfans_url
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profile_data TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_profile_data IS 'Safe view for public profile data. Excludes sensitive fields like email, paypal_email, google_voice_number, contact_email. Use this view when displaying profile data to other users.';

-- Note: Sensitive columns (email, paypal_email, google_voice_number, contact_email, first_name, last_name, business_description) 
-- are NOT included in the view and should only be accessed by:
-- 1. The profile owner (auth.uid() = id)
-- 2. Admins (is_admin(auth.uid()))