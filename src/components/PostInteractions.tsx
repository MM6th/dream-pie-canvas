
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, MessageCircle, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name?: string;
    email: string;
    avatar_url?: string;
  };
}

interface PostInteractionsProps {
  postId: string;
}

const PostInteractions = ({ postId }: PostInteractionsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchLikes();
    
    // Set up realtime subscriptions
    const commentsChannel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

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

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles (
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Error",
          description: "Failed to add comment. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setNewComment("");
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) return;

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error removing like:', error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (error) {
          console.error('Error adding like:', error);
          return;
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Like and Comment Stats */}
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
        <div className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4" />
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id} className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {comment.profiles?.avatar_url ? (
                  <img
                    src={comment.profiles.avatar_url}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {comment.profiles?.display_name || comment.profiles?.email || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleAddComment} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="bg-gray-700 border-gray-600 text-white flex-1"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !newComment.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
};

export default PostInteractions;
