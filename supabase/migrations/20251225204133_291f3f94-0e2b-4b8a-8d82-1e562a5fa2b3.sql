-- Allow authenticated users to view basic profile info for directory listing
-- This enables the Trending page to show all profile cards
-- Private content (portfolios, playlists) is still controlled by separate visibility settings
CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);