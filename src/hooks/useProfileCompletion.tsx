import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setIsProfileComplete(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('profile_complete, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile completion:', error);
          setIsProfileComplete(null);
        } else if (data) {
          // Profile is complete if flag is true AND avatar_url exists
          setIsProfileComplete(
            data.profile_complete === true && 
            data.avatar_url !== null && 
            data.avatar_url !== ''
          );
        } else {
          // Profile doesn't exist yet
          setIsProfileComplete(false);
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
        setIsProfileComplete(null);
      } finally {
        setLoading(false);
      }
    };

    checkProfileCompletion();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-completion-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        (payload) => {
          const newData = payload.new as { profile_complete: boolean; avatar_url: string | null };
          setIsProfileComplete(
            newData.profile_complete === true && 
            newData.avatar_url !== null && 
            newData.avatar_url !== ''
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markProfileComplete = () => {
    setIsProfileComplete(true);
  };

  return {
    isProfileComplete,
    loading,
    markProfileComplete
  };
};
