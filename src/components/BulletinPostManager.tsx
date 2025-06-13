import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Calendar, Star, ExternalLink, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import BulletinPostModal from "./BulletinPostModal";
import CurrentThoughtsModal from "./CurrentThoughtsModal";
import TVGuideModal from "./TVGuideModal";
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

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  is_featured: boolean;
  post_type?: string;
  created_at: string;
  updated_at: string;
}

const BulletinPostManager = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchPosts();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        toast({
          title: "Error",
          description: "Failed to delete post. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Post deleted successfully!"
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const currentThoughtsPosts = posts.filter(post => post.post_type === 'current_thoughts');
  const tvGuidePosts = posts.filter(post => post.post_type === 'tv_guide');

  if (loading) {
    return (
      <div className="text-white">Loading your posts...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Manage Bulletin Posts</h3>
        <div className="flex gap-2">
          <CurrentThoughtsModal onSuccess={fetchPosts} />
          {userProfile?.user_type === "merchant" && (
            <TVGuideModal onSuccess={fetchPosts} />
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">No posts created yet. Share your thoughts or create a TV guide entry!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Current Thoughts Section */}
          {currentThoughtsPosts.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Current Thoughts
              </h4>
              <div className="space-y-4">
                {currentThoughtsPosts.map((post) => (
                  <Card key={post.id} className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                          {post.title}
                          {post.is_featured && (
                            <Badge className="bg-yellow-500 text-black">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {post.link_url && (
                            <Badge variant="outline" className="border-blue-400 text-blue-400">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Has Link
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex gap-2">
                          <BulletinPostModal
                            post={post}
                            mode="edit"
                            onSuccess={fetchPosts}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-800 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Post</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete this post? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(post.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 mb-3 line-clamp-2">{post.content}</p>
                      {post.link_url && (
                        <div className="mb-3">
                          <p className="text-sm text-blue-400">Link: {post.link_url}</p>
                        </div>
                      )}
                      {post.image_url && (
                        <div className="mb-3">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-24 h-16 object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created: {new Date(post.created_at).toLocaleDateString()}
                        </div>
                        {post.updated_at !== post.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Updated: {new Date(post.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TV Guide Section */}
          {tvGuidePosts.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                TV Guide Schedule
              </h4>
              <div className="space-y-4">
                {tvGuidePosts.map((post) => (
                  <Card key={post.id} className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                          {post.title}
                          {post.is_featured && (
                            <Badge className="bg-yellow-500 text-black">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {post.link_url && (
                            <Badge variant="outline" className="border-blue-400 text-blue-400">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Has Link
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex gap-2">
                          <BulletinPostModal
                            post={post}
                            mode="edit"
                            onSuccess={fetchPosts}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-800 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Post</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete this post? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(post.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 mb-3 line-clamp-2">{post.content}</p>
                      {post.link_url && (
                        <div className="mb-3">
                          <p className="text-sm text-blue-400">Link: {post.link_url}</p>
                        </div>
                      )}
                      {post.image_url && (
                        <div className="mb-3">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-24 h-16 object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created: {new Date(post.created_at).toLocaleDateString()}
                        </div>
                        {post.updated_at !== post.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Updated: {new Date(post.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulletinPostManager;
