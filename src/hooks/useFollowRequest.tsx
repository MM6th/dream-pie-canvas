import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FollowStatus = 'none' | 'pending' | 'following';

export const useFollowRequest = () => {
  const sendFollowRequest = async (targetId: string, intentMessage: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to send a follow request');
      return { error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('profile_follow_requests')
        .insert({
          requester_id: user.id,
          target_merchant_id: targetId,
          intent_message: intentMessage,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already sent a follow request to this profile');
        } else {
          toast.error('Failed to send follow request');
        }
        return { error };
      }

      toast.success('Follow request sent successfully');
      return { error: null };
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast.error('Failed to send follow request');
      return { error };
    }
  };

  const checkFollowStatus = async (targetId: string): Promise<FollowStatus> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return 'none';

    try {
      // Check if already following
      const { data: followerData } = await supabase
        .from('profile_followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('merchant_id', targetId)
        .maybeSingle();

      if (followerData) return 'following';

      // Check if request is pending
      const { data: requestData } = await supabase
        .from('profile_follow_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('target_merchant_id', targetId)
        .eq('status', 'pending')
        .maybeSingle();

      if (requestData) return 'pending';

      return 'none';
    } catch (error) {
      console.error('Error checking follow status:', error);
      return 'none';
    }
  };

  const getReceivedRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('profile_follow_requests')
        .select(`
          *,
          requester:profiles!profile_follow_requests_requester_id_fkey(
            id,
            display_name,
            avatar_url,
            user_type
          )
        `)
        .eq('target_merchant_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching received requests:', error);
      return [];
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('profile_follow_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) {
        toast.error('Failed to approve request');
        return { error };
      }

      toast.success('Follow request approved');
      return { error: null };
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
      return { error };
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('profile_follow_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) {
        toast.error('Failed to reject request');
        return { error };
      }

      toast.success('Follow request rejected');
      return { error: null };
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
      return { error };
    }
  };

  return {
    sendFollowRequest,
    checkFollowStatus,
    getReceivedRequests,
    approveRequest,
    rejectRequest,
  };
};
