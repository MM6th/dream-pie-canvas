
-- Add admin and approval status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- Add constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_approval_status_check'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_approval_status_check 
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Set cmooregee@gmail.com as admin
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE email = 'cmooregee@gmail.com';

-- Set default approval status based on user type
UPDATE public.profiles 
SET approval_status = CASE 
  WHEN user_type = 'merchant' AND is_admin = FALSE THEN 'pending'
  ELSE 'approved'
END;

-- Modify the handle_new_user function to set approval status for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, approval_status, is_admin)
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
    END
  );
  RETURN new;
END;
$$;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_approved_merchant(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_approval TEXT;
  user_type_val TEXT;
BEGIN
  SELECT approval_status, user_type INTO user_approval, user_type_val
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_type_val = 'merchant' AND user_approval = 'approved';
END;
$$;

-- Update RLS policies for bulletin_posts
DROP POLICY IF EXISTS "Merchants can create their own posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Merchants can update their own posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Merchants can delete their own posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Approved merchants and admins can create posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Approved merchants and admins can update their posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Approved merchants and admins can delete their posts" ON public.bulletin_posts;

CREATE POLICY "Approved merchants and admins can create posts" 
  ON public.bulletin_posts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = merchant_id AND 
    (public.is_admin(auth.uid()) OR public.is_approved_merchant(auth.uid()))
  );

CREATE POLICY "Approved merchants and admins can update their posts" 
  ON public.bulletin_posts 
  FOR UPDATE 
  USING (
    auth.uid() = merchant_id AND 
    (public.is_admin(auth.uid()) OR public.is_approved_merchant(auth.uid()))
  );

CREATE POLICY "Approved merchants and admins can delete their posts" 
  ON public.bulletin_posts 
  FOR DELETE 
  USING (
    auth.uid() = merchant_id AND 
    (public.is_admin(auth.uid()) OR public.is_approved_merchant(auth.uid()))
  );

-- Update RLS policies for audio_products
DROP POLICY IF EXISTS "Merchants can manage their own audio products" ON public.audio_products;
DROP POLICY IF EXISTS "Users can view all audio products" ON public.audio_products;
DROP POLICY IF EXISTS "Approved merchants and admins can manage audio products" ON public.audio_products;

CREATE POLICY "Users can view all audio products" 
  ON public.audio_products 
  FOR SELECT 
  USING (true);

CREATE POLICY "Approved merchants and admins can manage audio products" 
  ON public.audio_products 
  FOR ALL 
  USING (
    auth.uid() = merchant_id AND 
    (public.is_admin(auth.uid()) OR public.is_approved_merchant(auth.uid()))
  );

-- Update RLS policies for video_products
DROP POLICY IF EXISTS "Merchants can manage their own video products" ON public.video_products;
DROP POLICY IF EXISTS "Users can view all video products" ON public.video_products;
DROP POLICY IF EXISTS "Approved merchants and admins can manage video products" ON public.video_products;

CREATE POLICY "Users can view all video products" 
  ON public.video_products 
  FOR SELECT 
  USING (true);

CREATE POLICY "Approved merchants and admins can manage video products" 
  ON public.video_products 
  FOR ALL 
  USING (
    auth.uid() = merchant_id AND 
    (public.is_admin(auth.uid()) OR public.is_approved_merchant(auth.uid()))
  );

-- Update RLS policies for user_uploads
DROP POLICY IF EXISTS "Users can insert their own uploads" ON public.user_uploads;

CREATE POLICY "Users can insert their own uploads" 
  ON public.user_uploads 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    (
      (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'supporter' OR
      public.is_admin(auth.uid()) OR 
      public.is_approved_merchant(auth.uid())
    )
  );

-- Create function to approve/reject merchants
CREATE OR REPLACE FUNCTION public.update_merchant_approval(
  merchant_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve merchants';
  END IF;

  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  -- Update the merchant's approval status
  UPDATE public.profiles
  SET approval_status = new_status,
      updated_at = NOW()
  WHERE id = merchant_id AND user_type = 'merchant';

  RETURN TRUE;
END;
$$;
