-- COMPREHENSIVE SECURITY FIX MIGRATION (Version 3 - Drop and Recreate)
-- This migration addresses multiple critical security vulnerabilities

-- ========================================
-- 1. CREATE USER ROLES SYSTEM (fixes admin privilege escalation)
-- ========================================

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'merchant', 'supporter', 'moderator');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage roles (using new system)
CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Migrate existing admin users to new roles table
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'admin'::app_role, now()
FROM public.profiles
WHERE is_admin = true;

-- Migrate merchant users to new roles table
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'merchant'::app_role, now()
FROM public.profiles
WHERE user_type = 'merchant' AND approval_status = 'approved';

-- Migrate supporter users to new roles table
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'supporter'::app_role, now()
FROM public.profiles
WHERE user_type = 'supporter';

-- ========================================
-- 2. CREATE SECURE ROLE-CHECKING FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ========================================
-- 3. FIX ALL SECURITY DEFINER FUNCTIONS (add search_path)
-- ========================================

-- Fix is_admin function (now uses user_roles)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_id, 'admin'::app_role)
$$;

-- Fix is_approved_merchant function (now uses user_roles)
CREATE OR REPLACE FUNCTION public.is_approved_merchant(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_id, 'merchant'::app_role)
$$;

-- Fix update_merchant_approval
CREATE OR REPLACE FUNCTION public.update_merchant_approval(merchant_id uuid, new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve merchants';
  END IF;

  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  UPDATE public.profiles
  SET approval_status = new_status,
      updated_at = NOW()
  WHERE id = merchant_id AND user_type = 'merchant';

  -- Update user_roles if approved
  IF new_status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (merchant_id, 'merchant'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;

-- Fix clean_expired_astrology_cache
CREATE OR REPLACE FUNCTION public.clean_expired_astrology_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.astrology_cache 
  WHERE expires_at < now();
END;
$$;

-- Fix get_user_storage_usage
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(user_uuid uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(file_size) FROM public.user_uploads WHERE user_id = user_uuid),
    0
  );
END;
$$;

-- Fix can_user_upload
CREATE OR REPLACE FUNCTION public.can_user_upload(user_uuid uuid, new_file_size bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage BIGINT;
  max_storage BIGINT := 2147483648;
BEGIN
  current_usage := public.get_user_storage_usage(user_uuid);
  RETURN (current_usage + new_file_size) <= max_storage;
END;
$$;

-- Fix update_quarterly_income
CREATE OR REPLACE FUNCTION public.update_quarterly_income(p_user_id uuid, p_income_type text, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_quarter INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_quarter := EXTRACT(QUARTER FROM CURRENT_DATE);
  
  INSERT INTO public.quarterly_income (
    user_id, year, quarter, income_type, total_income, source_count
  )
  VALUES (
    p_user_id, v_year, v_quarter, p_income_type, p_amount, 1
  )
  ON CONFLICT (user_id, year, quarter, income_type)
  DO UPDATE SET
    total_income = quarterly_income.total_income + p_amount,
    source_count = quarterly_income.source_count + 1,
    updated_at = now();
END;
$$;

-- Fix update_cover_submission_status
CREATE OR REPLACE FUNCTION public.update_cover_submission_status(
  submission_id uuid, 
  new_status text, 
  admin_notes_text text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve cover submissions';
  END IF;

  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid submission status';
  END IF;

  UPDATE public.song_cover_submissions
  SET status = new_status,
      admin_notes = admin_notes_text,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = submission_id;

  IF new_status = 'approved' THEN
    UPDATE public.audio_products
    SET thumbnail_url = (
      SELECT cover_image_url 
      FROM public.song_cover_submissions 
      WHERE id = submission_id
    ),
    updated_at = NOW()
    WHERE id = (
      SELECT audio_product_id 
      FROM public.song_cover_submissions 
      WHERE id = submission_id
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- ========================================
-- 4. FIX PROFILES TABLE RLS POLICIES (prevent PII exposure)
-- ========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view public profile data" ON public.profiles;

-- Drop the existing admin policy and recreate
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create policy for viewing own complete profile
CREATE POLICY "Users can view own complete profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admin policy (admins can view all profiles)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- ========================================
-- 5. ADD UNIQUE CONSTRAINT FOR RACE CONDITION PROTECTION
-- ========================================

-- Add unique constraint to prevent duplicate portfolio purchases
ALTER TABLE public.portfolio_purchases
ADD CONSTRAINT unique_portfolio_transaction
UNIQUE (paypal_transaction_id);

-- ========================================
-- 6. CREATE PLATFORM REVENUE TABLE (fix admin lookup issue)
-- ========================================

CREATE TABLE public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_type text NOT NULL,
  amount numeric NOT NULL,
  source_transaction_id text,
  source_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform revenue
CREATE POLICY "Admins can view platform revenue"
ON public.platform_revenue FOR SELECT
USING (public.is_admin(auth.uid()));

-- System can insert (for edge functions with service role)
CREATE POLICY "System can insert platform revenue"
ON public.platform_revenue FOR INSERT
WITH CHECK (true);