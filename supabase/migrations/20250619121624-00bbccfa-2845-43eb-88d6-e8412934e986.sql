
-- Add missing profile columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS website text;

-- Ensure Row Level Security is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create policy that allows admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create policy that allows users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Create policy that allows users to update their own profile information
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
