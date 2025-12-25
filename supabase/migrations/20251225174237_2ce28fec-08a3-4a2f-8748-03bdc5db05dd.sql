
-- Fix infinite recursion in user_roles RLS policy
-- The current policy queries user_roles from within user_roles, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Create proper policies using the security definer function (which bypasses RLS)
-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own roles (needed for the app to check permissions)
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);
