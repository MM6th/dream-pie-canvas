-- Add new visibility columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS social_links_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS portfolios_public boolean DEFAULT false;

-- Update the default for is_private to true for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN is_private SET DEFAULT true;

-- Update all existing profiles to be private by default (preserving playlist_public)
UPDATE public.profiles 
SET is_private = true 
WHERE is_private IS NULL OR is_private = false;

-- Update the handle_new_user function to set is_private = true by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    user_type, 
    approval_status, 
    is_admin, 
    is_adult_creator, 
    display_name,
    avatar_url,
    profile_complete,
    is_private,
    playlist_public,
    social_links_public,
    portfolios_public
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', 'supporter'),
    CASE 
      WHEN COALESCE(new.raw_user_meta_data->>'user_type', 'supporter') = 'merchant' 
      THEN 'pending'
      ELSE 'approved'
    END,
    CASE 
      WHEN new.email = 'cmooregee@gmail.com' THEN TRUE
      ELSE FALSE
    END,
    COALESCE((new.raw_user_meta_data->>'is_adult_creator')::boolean, FALSE),
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN new.raw_user_meta_data->>'avatar_url' IS NOT NULL 
        AND new.raw_user_meta_data->>'avatar_url' != '' 
      THEN true 
      ELSE false 
    END,
    true,  -- is_private defaults to true (all profiles are private)
    false, -- playlist_public defaults to false
    false, -- social_links_public defaults to false
    false  -- portfolios_public defaults to false
  );
  RETURN new;
END;
$function$;

-- Update can_view_private_profile to also check if viewer has visibility access
CREATE OR REPLACE FUNCTION public.can_view_profile_content(viewer_id uuid, profile_id uuid, content_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_follower boolean;
  content_is_public boolean;
BEGIN
  -- Owner can always view their own content
  IF viewer_id = profile_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if viewer is a follower
  SELECT EXISTS (
    SELECT 1 FROM profile_followers
    WHERE follower_id = viewer_id AND merchant_id = profile_id
  ) INTO is_follower;
  
  -- If follower, can view all content
  IF is_follower THEN
    RETURN TRUE;
  END IF;
  
  -- Check if specific content type is public
  CASE content_type
    WHEN 'social_links' THEN
      SELECT COALESCE(social_links_public, false) INTO content_is_public FROM profiles WHERE id = profile_id;
    WHEN 'portfolios' THEN
      SELECT COALESCE(portfolios_public, false) INTO content_is_public FROM profiles WHERE id = profile_id;
    WHEN 'playlist' THEN
      SELECT COALESCE(playlist_public, false) INTO content_is_public FROM profiles WHERE id = profile_id;
    ELSE
      content_is_public := false;
  END CASE;
  
  RETURN content_is_public;
END;
$function$;