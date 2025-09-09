-- Add RLS policy to allow viewing public playlists
CREATE POLICY "Public playlists are viewable by everyone" 
ON public.user_purchases 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_purchases.user_id 
    AND profiles.playlist_public = true
  )
);