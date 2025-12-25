-- Fix: Security Definer View warning
-- Recreate the view with SECURITY INVOKER to ensure RLS policies of the querying user are applied
DROP VIEW IF EXISTS public.public_profile_data;

CREATE VIEW public.public_profile_data 
WITH (security_invoker = true) AS
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
COMMENT ON VIEW public.public_profile_data IS 'Safe view for public profile data with SECURITY INVOKER. Excludes sensitive fields like email, paypal_email, google_voice_number, contact_email. Use this view when displaying profile data to other users.';