
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { User, Edit, Trash2, Send, X } from "lucide-react";
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

interface CommentsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange: (count: number) => void;
}

const CommentsModal = ({ postId, isOpen, onClose, onCommentCountChange }: CommentsModalProps) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ is_admin: boolean } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const endOfCommentsRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfCommentsRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        try {
          const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
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
    if (isOpen) {
      fetchComments();
    } else {
      setComments([]);
    }
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen) return;

    const commentsChannel = supabase
      .channel(`comments-modal-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        () => {
            fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [postId, isOpen]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id, profiles (display_name, email, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const fetchedComments = (data as unknown as Comment[]) || [];
      setComments(fetchedComments);
      onCommentCountChange(fetchedComments.length);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({ title: "Error", description: "Could not fetch comments.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, content: newComment.trim() });
      if (error) throw error;
      setNewComment("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!user || !editedContent.trim() || !editingCommentId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('post_comments').update({ content: editedContent.trim(), updated_at: new Date().toISOString() }).eq('id', editingCommentId).eq('user_id', user.id);
      if (error) throw error;
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
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw error;
      toast({ title: "Success", description: "Comment deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete comment.", variant: "destructive" });
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedContent(comment.content);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[625px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Comments ({comments.length})</DialogTitle>
          <DialogClose asChild>
              <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
              </button>
          </DialogClose>
        </DialogHeader>
        <div className="flex-grow overflow-hidden px-6">
          <ScrollArea className="h-full w-full" thumbClassName="bg-blue-600">
            <div className="space-y-3 pr-4">
              {comments.length === 0 && !loading && <p className="text-gray-400 text-center py-8">No comments yet. Be the first to comment!</p>}
              {loading && comments.length === 0 && <p className="text-gray-400 text-center py-8">Loading comments...</p>}
              {comments.map((comment) => (
                <Card key={comment.id} className="bg-gray-700/50 border-gray-600">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {comment.profiles?.avatar_url ? (
                        <img src={comment.profiles.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover"/>
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{comment.profiles?.display_name || comment.profiles?.email || 'Anonymous'}</span>
                            <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
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
                                    <AlertDialogDescription className="text-gray-400">Are you sure you want to delete this comment? This action cannot be undone.</AlertDialogDescription>
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
                            <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="bg-gray-800 border-gray-600 text-white text-sm" rows={2} />
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" className="bg-white text-black hover:bg-gray-100" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                              <Button size="sm" onClick={handleUpdateComment} disabled={loading || editedContent.trim() === ''}>{loading ? 'Saving...' : 'Save'}</Button>
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
              <div ref={endOfCommentsRef} />
            </div>
          </ScrollArea>
        </div>
        {user && (
          <form onSubmit={handleAddComment} className="flex gap-2 p-6 pt-4 border-t border-gray-700">
            <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="bg-gray-700 border-gray-600 text-white flex-1" disabled={loading} />
            <Button type="submit" disabled={loading || !newComment.trim()} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
