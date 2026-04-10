import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLivestreamEntry = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkEntry = async (postId: string, userId: string) => {
    const { data, error } = await supabase
      .from('livestream_entries')
      .select('id')
      .eq('bulletin_post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking entry:', error);
      return false;
    }

    return !!data;
  };

  const checkBlocked = async (postId: string, userId: string): Promise<boolean> => {
    // Get the merchant who owns the post
    const { data: post } = await supabase
      .from('bulletin_posts')
      .select('merchant_id')
      .eq('id', postId)
      .single();
    if (!post) return false;
    const { data: blocked } = await supabase.rpc('is_blocked', { user_a: userId, user_b: post.merchant_id });
    return !!blocked;
  };

  const enterLivestream = async (postId: string, linkUrl: string) => {
    setLoading(true);
    try {
      // Check if user is blocked by the stream host
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const blocked = await checkBlocked(postId, currentUser.id);
        if (blocked) {
          toast({
            title: 'Cannot Enter',
            description: 'You are unable to enter this livestream.',
            variant: 'destructive',
          });
          return { success: false };
        }
      }

      const { data, error } = await supabase.functions.invoke('enter-livestream', {
        body: { postId },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: 'Cannot Enter',
          description: data.error,
          variant: 'destructive',
        });
        return { success: false, needsCredits: data.needsCredits };
      }

      toast({
        title: 'Welcome!',
        description: data.alreadyEntered 
          ? 'You already have access to this stream!' 
          : `Entry successful! ${data.creditsSpent} credits spent.`,
      });

      return { 
        success: true, 
        creditsSpent: data.creditsSpent,
        roomId: data.roomId,
        linkUrl: data.linkUrl,
        alreadyEntered: data.alreadyEntered,
      };
    } catch (error: any) {
      console.error('Error entering livestream:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to enter livestream',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { enterLivestream, checkEntry, checkBlocked, loading };
};
