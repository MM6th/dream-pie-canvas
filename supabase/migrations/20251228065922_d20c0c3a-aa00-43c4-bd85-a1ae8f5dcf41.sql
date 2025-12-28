-- Update can_user_upload function to set Film Maker limit to 5GB
CREATE OR REPLACE FUNCTION public.can_user_upload(user_uuid uuid, new_file_size bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_usage BIGINT;
  max_storage BIGINT;
  is_user_admin BOOLEAN;
  user_industry TEXT;
BEGIN
  -- Check if user is admin
  SELECT is_admin, industry INTO is_user_admin, user_industry
  FROM profiles
  WHERE id = user_uuid;
  
  -- Admins have unlimited storage
  IF is_user_admin = true THEN
    RETURN true;
  END IF;
  
  -- Set storage limits based on industry
  IF user_industry = 'Film Maker' THEN
    max_storage := 5368709120; -- 5GB in bytes (subject to increase)
  ELSIF user_industry = 'Pole Dancer' THEN
    max_storage := 5368709120; -- 5GB in bytes
  ELSE
    max_storage := 2147483648; -- 2GB in bytes
  END IF;
  
  -- Check storage quota
  SELECT COALESCE(SUM(file_size), 0) INTO current_usage
  FROM user_uploads
  WHERE user_id = user_uuid;
  
  RETURN (current_usage + new_file_size) <= max_storage;
END;
$function$;

-- Update get_user_max_storage function to return 5GB for Film Makers
CREATE OR REPLACE FUNCTION public.get_user_max_storage(user_uuid uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_user_admin BOOLEAN;
  user_industry TEXT;
BEGIN
  SELECT is_admin, industry INTO is_user_admin, user_industry
  FROM profiles
  WHERE id = user_uuid;
  
  IF is_user_admin = true THEN
    RETURN 107374182400; -- 100GB for admins (effectively unlimited for display)
  END IF;
  
  IF user_industry = 'Film Maker' THEN
    RETURN 5368709120; -- 5GB (subject to increase)
  ELSIF user_industry = 'Pole Dancer' THEN
    RETURN 5368709120; -- 5GB
  ELSE
    RETURN 2147483648; -- 2GB
  END IF;
END;
$function$;