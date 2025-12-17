-- Update can_user_upload function to allow 5GB for Pole Dancers
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
  
  -- Pole Dancers get 5GB, others get 2GB
  IF user_industry = 'Pole Dancer' THEN
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