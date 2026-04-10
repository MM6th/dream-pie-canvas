import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBlockUser = (currentUserId: string | undefined) => {
  const [blockedIds, setBlockedIds] = useState<string[]>([]); // users I blocked
  const [blockedByIds, setBlockedByIds] = useState<string[]>([]); // users who blocked me
  const [loading, setLoading] = useState(false);

  const fetchBlockedUsers = useCallback(async () => {
    if (!currentUserId) return;
    // Fetch users I blocked
    const { data: myBlocks } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId);
    setBlockedIds((myBlocks || []).map(d => d.blocked_id));

    // Fetch users who blocked me
    const { data: blockedByMe } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', currentUserId);
    setBlockedByIds((blockedByMe || []).map(d => d.blocker_id));
  }, [currentUserId]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const isBlocked = (userId: string) => blockedIds.includes(userId);

  const blockUser = async (targetId: string) => {
    if (!currentUserId) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({ blocker_id: currentUserId, blocked_id: targetId });
      if (error) {
        if (error.code === '23505') {
          toast.info('User is already blocked');
        } else {
          toast.error('Failed to block user');
        }
        return false;
      }
      setBlockedIds(prev => [...prev, targetId]);
      toast.success('User blocked successfully');
      return true;
    } catch {
      toast.error('Failed to block user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (targetId: string) => {
    if (!currentUserId) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetId);
      if (error) {
        toast.error('Failed to unblock user');
        return false;
      }
      setBlockedIds(prev => prev.filter(id => id !== targetId));
      toast.success('User unblocked');
      return true;
    } catch {
      toast.error('Failed to unblock user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { blockedIds, isBlocked, blockUser, unblockUser, loading, refetch: fetchBlockedUsers };
};
