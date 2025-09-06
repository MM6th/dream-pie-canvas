-- Add playlist_public column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN playlist_public boolean DEFAULT false;