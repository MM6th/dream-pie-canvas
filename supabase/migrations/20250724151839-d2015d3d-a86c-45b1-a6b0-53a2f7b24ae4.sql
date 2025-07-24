-- Update the handle_new_user function to include is_adult_creator field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, approval_status, is_admin, is_adult_creator)
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
    COALESCE((new.raw_user_meta_data->>'is_adult_creator')::boolean, FALSE)
  );
  RETURN new;
END;
$$;