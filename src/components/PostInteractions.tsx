
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import CommentsModal from "./CommentsModal";

interface PostInteractionsProps {
  postId: string;
  disableComments?: boolean;
}

const PostInteractions = ({ postId, disableComments = false }: PostInteractionsProps) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<string[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  
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

  useEffect(() => {
    fetchLikes();
    fetchCommentCount();
    
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

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
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
