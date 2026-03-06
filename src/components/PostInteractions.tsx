
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import CommentsModal from "./CommentsModal";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface PostInteractionsProps {
  postId: string;
  recipientId?: string;
  disableComments?: boolean;
}

const PostInteractions = ({ postId, recipientId, disableComments = false }: PostInteractionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState<string[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [tipCount, setTipCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [showTipSelector, setShowTipSelector] = useState(false);
  const tipSelectorRef = useRef<HTMLDivElement>(null);
  
  const fetchCommentCount = async () => {
    try {
      const { count, error } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) {
        console.error('Error fetching comment count:', error);
        return;
      }
      setCommentCount(count || 0);
    } catch (error) {
      console.error('Error in fetchCommentCount:', error);
    }
  };

  const fetchTipCount = async () => {
    try {
      const { data, error } = await supabase
        .from('post_tips')
        .select('amount')
        .eq('post_id', postId);

      if (error) {
        console.error('Error fetching tip count:', error);
        return;
      }
      const total = data?.reduce((sum, tip) => sum + (tip.amount || 0), 0) || 0;
      setTipCount(total);
    } catch (error) {
      console.error('Error in fetchTipCount:', error);
    }
  };

  useEffect(() => {
    fetchLikes();
    fetchCommentCount();
    fetchTipCount();
    
    const likesChannel = supabase
      .channel(`likes-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();
      
    const commentsChannel = supabase
      .channel(`comments-count-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchCommentCount();
        }
      )
      .subscribe();

    const tipsChannel = supabase
      .channel(`tips-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_tips',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchTipCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(tipsChannel);
    };
  }, [postId]);

  const fetchLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', postId);

      if (error) {
        console.error('Error fetching likes:', error);
        return;
      }

      const likeUserIds = data?.map(like => like.user_id) || [];
      setLikes(likeUserIds);
      setHasLiked(user ? likeUserIds.includes(user.id) : false);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleToggleLike = async () => {
    if (!user) return;
    
    const originalHasLiked = hasLiked;
    const originalLikes = likes;

    // Optimistic update
    setHasLiked(!originalHasLiked);
    if (!originalHasLiked) {
      setLikes([...originalLikes, user.id]);
    } else {
      setLikes(originalLikes.filter(id => id !== user.id));
    }

    try {
      if (originalHasLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setHasLiked(originalHasLiked);
      setLikes(originalLikes);
      toast({ title: "Error", description: "Could not update like status.", variant: "destructive" });
    }
  };

  const handleTip = async (amount: number) => {
    if (!user) return;

    if (!recipientId) {
      toast({ title: "Error", description: "Unable to identify the post author.", variant: "destructive" });
      return;
    }

    if (user.id === recipientId) {
      toast({ title: "Oops!", description: "You can't tip yourself.", variant: "destructive" });
      return;
    }

    setShowTipSelector(false);
    setIsTipping(true);
    try {
      const { data, error } = await supabase.rpc('tip_post', {
        p_post_id: postId,
        p_recipient_id: recipientId,
        p_amount: amount
      });

      if (error) {
        if (error.message.includes('Insufficient token balance')) {
          toast({
            title: "No SIXTH Tokens",
            description: "You don't have enough SIXTH tokens to tip. Visit the Crypto Token Simulation page to purchase some!",
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
                onClick={() => navigate('/mint')}
              >
                Buy Tokens
              </Button>
            ),
          });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Tip Sent! 🎉", description: `You tipped ${amount} SIXTH token${amount > 1 ? 's' : ''} to this creator.` });
    } catch (error: any) {
      console.error('Error tipping:', error);
      toast({ title: "Error", description: "Could not send tip. Please try again.", variant: "destructive" });
    } finally {
      setIsTipping(false);
    }
  };

  // Close tip selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tipSelectorRef.current && !tipSelectorRef.current.contains(event.target as Node)) {
        setShowTipSelector(false);
      }
    };
    if (showTipSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTipSelector]);

  const tipAmounts = [1, 5, 10, 25];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <Button
          onClick={handleToggleLike}
          variant="ghost"
          size="sm"
          className={`flex items-center gap-1 ${hasLiked ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-300`}
          disabled={!user}
        >
          <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
          {likes.length} {likes.length === 1 ? 'like' : 'likes'}
        </Button>
        {!disableComments && (
          <Button
            onClick={() => setIsCommentsModalOpen(true)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-gray-400 hover:text-white"
          >
            <MessageCircle className="w-4 h-4" />
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Button>
        )}
        {recipientId && (
          <div className="relative" ref={tipSelectorRef}>
            <Button
              onClick={() => setShowTipSelector(!showTipSelector)}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300"
              disabled={!user || isTipping}
            >
              <img src={sixthCoinLogo} alt="SIXTH" className="w-4 h-4 rounded-full" />
              {tipCount > 0 ? tipCount : 'Tip'}
            </Button>
            {showTipSelector && (
              <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-600 rounded-lg p-2 flex gap-1 z-50 shadow-lg">
                {tipAmounts.map((amount) => (
                  <Button
                    key={amount}
                    onClick={() => handleTip(amount)}
                    variant="ghost"
                    size="sm"
                    className="text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 text-xs px-2 py-1"
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!disableComments && (
        <CommentsModal
          postId={postId}
          isOpen={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          onCommentCountChange={setCommentCount}
        />
      )}
    </div>
  );
};

export default PostInteractions;
