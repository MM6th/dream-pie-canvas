-- Add profile completion tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing trigger to check for avatar and set profile_complete flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    profile_complete
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
    -- Profile is complete only if avatar_url is present
    CASE 
      WHEN new.raw_user_meta_data->>'avatar_url' IS NOT NULL 
        AND new.raw_user_meta_data->>'avatar_url' != '' 
      THEN true 
      ELSE false 
    END
  );
  RETURN new;
END;
$function$;

-- Create index for faster profile_complete queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_complete ON public.profiles(profile_complete) WHERE profile_complete = false;