-- Fix the existing user's skills
UPDATE profiles 
SET skills = ARRAY['Live Stream Artist']
WHERE email = 'chaunceymoore9@gmail.com';

-- Update the trigger to properly extract skills from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
    skills,
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
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'skills')),
      ARRAY[]::text[]
    ),
    CASE 
      WHEN new.raw_user_meta_data->>'avatar_url' IS NOT NULL 
        AND new.raw_user_meta_data->>'avatar_url' != '' 
      THEN true 
      ELSE false 
    END,
    true,
    false,
    false,
    false
  );
  RETURN new;
END;
$$;