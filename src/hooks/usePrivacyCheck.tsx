import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePrivacyCheck = (profileId: string) => {
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPrivacyAndAccess();
  }, [profileId, user]);

  const checkPrivacyAndAccess = async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile privacy setting
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_private')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('Error fetching profile privacy:', profileError);
        setLoading(false);
        return;
      }

      const isProfilePrivate = profileData?.is_private || false;
      setIsPrivate(isProfilePrivate);

      // If not private or viewing own profile, allow access
      if (!isProfilePrivate || user?.id === profileId) {
        setCanView(true);
        setLoading(false);
        return;
      }

      // Check if user is following this private profile
      if (user) {
        const { data: followerData } = await supabase
          .from('profile_followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('merchant_id', profileId)
          .single();

        setCanView(!!followerData);
      } else {
        setCanView(false);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking privacy:', error);
      setLoading(false);
    }
  };

  return {
    isPrivate,
    canView,
    loading,
    refetch: checkPrivacyAndAccess,
  };
};
