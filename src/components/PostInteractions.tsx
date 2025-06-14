import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, MessageCircle, Send, User, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name?: string;
    email: string;
    avatar_url?: string;
  } | null;
}

interface PostInteractionsProps {
  postId: string;
}

const PostInteractions = ({ postId }: PostInteractionsProps) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ is_admin: boolean } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [areCommentsExpanded, setAreCommentsExpanded] = useState(false);
  
  const initialCommentCount = 2;

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          setUserProfile(data);
        } catch (error) {
          console.error("Error fetching user profile for interactions:", error);
        }
      };
      fetchUserProfile();
    }
  }, [user]);

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
          id,
          content,
          created_at,
          user_id,
          profiles (
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments with profiles:', error);
        toast({
          title: "Error",
          description: "Could not fetch comments.",
          variant: "destructive",
        });
        setComments([]);
        return;
      }

      if (data) {
        setComments(data as unknown as Comment[]);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error in fetchComments:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching comments.",
        variant: "destructive",
      });
      setComments([]);
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
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          profiles (
            display_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Error",
          description: "Failed to add comment. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setComments(currentComments => [...currentComments, data as unknown as Comment]);
      }
      setNewComment("");
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding your comment.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!user || !editedContent.trim() || !editingCommentId) return;

    const originalComment = comments.find(c => c.id === editingCommentId);
    if (originalComment?.content === editedContent.trim()) {
      setEditingCommentId(null);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: editedContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingCommentId)
        .eq('user_id', user.id);
      
      if (error) throw error;

      setComments(prev => prev.map(c => c.id === editingCommentId ? {...c, content: editedContent.trim()} : c));
      toast({ title: "Success", description: "Comment updated." });
      setEditingCommentId(null);
      setEditedContent("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update comment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: "Success", description: "Comment deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete comment.", variant: "destructive" });
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

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedContent(comment.content);
  };

  const visibleComments = areCommentsExpanded ? comments : comments.slice(0, initialCommentCount);

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
      <ScrollArea className="max-h-80 w-full pr-4 border border-gray-600 rounded-md p-2 bg-black/20">
        <div className="space-y-3">
          {visibleComments.map((comment) => (
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
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {comment.profiles?.display_name || comment.profiles?.email || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {(user?.id === comment.user_id || userProfile?.is_admin) && editingCommentId !== comment.id && (
                        <div className="flex items-center gap-1">
                          {user?.id === comment.user_id && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditing(comment)}>
                              <Edit className="w-3 h-3 text-gray-400 hover:text-white" />
                            </Button>
                          )}
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-800 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Comment</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete this comment? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-600 text-white bg-transparent">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteComment(comment.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="bg-white text-black hover:bg-gray-100" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                          <Button size="sm" onClick={handleUpdateComment} disabled={loading || editedContent.trim() === ''}>
                            {loading ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-300 text-sm">{comment.content}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {comments.length > initialCommentCount && (
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => setAreCommentsExpanded(!areCommentsExpanded)}
          className="text-gray-400 hover:text-white p-0 h-auto"
        >
          {areCommentsExpanded ? (
            <div className="flex items-center">
              <ChevronUp className="w-4 h-4 mr-1" />
              Show Less
            </div>
          ) : (
            <div className="flex items-center">
              <ChevronDown className="w-4 h-4 mr-1" />
              View {comments.length - initialCommentCount} More Comments
            </div>
          )}
        </Button>
      )}

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
