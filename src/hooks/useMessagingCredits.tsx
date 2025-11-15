import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMessagingCredits = (userId?: string) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchBalance();
    }
  }, [userId]);

  const fetchBalance = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('messaging_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    balance,
    loading,
    refetch: fetchBalance,
  };
};