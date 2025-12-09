import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type ContentType = 'social_links' | 'portfolios' | 'playlist' | 'posts';

interface VisibilityState {
  socialLinksVisible: boolean;
  portfoliosVisible: boolean;
  playlistVisible: boolean;
  postsVisible: boolean;
  isFollower: boolean;
  loading: boolean;
}

export const useVisibilityCheck = (profileId: string) => {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<VisibilityState>({
    socialLinksVisible: false,
    portfoliosVisible: false,
    playlistVisible: false,
    postsVisible: false,
    isFollower: false,
    loading: true
  });

  useEffect(() => {
    checkVisibility();
  }, [profileId, user]);

  const checkVisibility = async () => {
    if (!profileId) {
      setVisibility(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Owner can see everything
      if (user?.id === profileId) {
        setVisibility({
          socialLinksVisible: true,
          portfoliosVisible: true,
          playlistVisible: true,
          postsVisible: true,
          isFollower: false, // Not technically a follower of yourself
          loading: false
        });
        return;
      }

      // Fetch profile visibility settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('social_links_public, portfolios_public, playlist_public')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('Error fetching profile visibility:', profileError);
        setVisibility(prev => ({ ...prev, loading: false }));
        return;
      }

      const socialLinksPublic = profileData?.social_links_public || false;
      const portfoliosPublic = profileData?.portfolios_public || false;
      const playlistPublic = profileData?.playlist_public || false;

      // Check if user is following this profile
      let isFollower = false;
      if (user) {
        const { data: followerData } = await supabase
          .from('profile_followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('merchant_id', profileId)
          .single();

        isFollower = !!followerData;
      }

      // Determine visibility for each content type
      // Content is visible if: public OR user is a follower
      setVisibility({
        socialLinksVisible: socialLinksPublic || isFollower,
        portfoliosVisible: portfoliosPublic || isFollower,
        playlistVisible: playlistPublic || isFollower,
        postsVisible: isFollower, // Posts are always follower-only
        isFollower,
        loading: false
      });

    } catch (error) {
      console.error('Error checking visibility:', error);
      setVisibility(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    ...visibility,
    refetch: checkVisibility
  };
};
