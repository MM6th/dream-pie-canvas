
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Users, Store } from 'lucide-react';

const UserStatsDisplay = () => {
  const [supporterCount, setSupporterCount] = useState(0);
  const [merchantCount, setMerchantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
    
    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('user-stats-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        () => {
          console.log('Profile change detected, refetching stats...');
          // Refetch stats when profiles table changes
          fetchUserStats();
        }
      )
      .subscribe();

    console.log('Subscribed to profile changes');

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserStats = async () => {
    console.log('Fetching user stats...');
    try {
      // Get supporter count
      const { data: supporters, error: supporterError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'supporter');

      if (supporterError) {
        console.error('Error fetching supporter count:', supporterError);
      } else {
        console.log('Supporters found:', supporters?.length || 0);
        setSupporterCount(supporters?.length || 0);
      }

      // Get merchant count
      const { data: merchants, error: merchantError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'merchant');

      if (merchantError) {
        console.error('Error fetching merchant count:', merchantError);
      } else {
        console.log('Merchants found:', merchants?.length || 0);
        setMerchantCount(merchants?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-8 text-white">
        <div className="animate-pulse">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-8 text-white mb-8">
      <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg">
        <Users className="w-5 h-5 text-blue-400" />
        <span className="text-sm">
          <span className="font-bold text-blue-400">{supporterCount}</span> Supporters
        </span>
      </div>
      <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg">
        <Store className="w-5 h-5 text-purple-400" />
        <span className="text-sm">
          <span className="font-bold text-purple-400">{merchantCount}</span> Merchants
        </span>
      </div>
    </div>
  );
};

export default UserStatsDisplay;
