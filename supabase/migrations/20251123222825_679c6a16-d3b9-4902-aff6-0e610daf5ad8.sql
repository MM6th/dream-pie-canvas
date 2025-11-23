-- Update can_user_upload function to bypass storage limits for admins
CREATE OR REPLACE FUNCTION can_user_upload(
  user_uuid UUID,
  new_file_size BIGINT
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_usage BIGINT;
  max_storage BIGINT := 2147483648; -- 2GB in bytes
  is_user_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO is_user_admin
  FROM profiles
  WHERE id = user_uuid;
  
  -- Admins have unlimited storage
  IF is_user_admin = true THEN
    RETURN true;
  END IF;
  
  -- For non-admins, check storage quota
  SELECT COALESCE(SUM(file_size), 0) INTO current_usage
  FROM user_uploads
  WHERE user_id = user_uuid;
  
  RETURN (current_usage + new_file_size) <= max_storage;
END;
$$;