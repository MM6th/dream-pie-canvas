
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit2, Trash2, MessageSquare, Tv } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BulletinPostModal from "./BulletinPostModal";
import CurrentThoughtsModal from "./CurrentThoughtsModal";
import TVGuideModal from "./TVGuideModal";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  post_type: string;
  created_at: string;
  merchant_id: string;
}

const BulletinPostManager = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

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
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully!"
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (post: BulletinPost) => {
    setSelectedPost(post);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedPost(null);
    fetchPosts();
  };

  const currentThoughtsPosts = posts.filter(post => post.post_type === 'current_thoughts');
  const tvGuidePosts = posts.filter(post => post.post_type === 'tv_guide');

  if (loading) {
    return <div className="text-center text-white">Loading posts...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Create New Post Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <CurrentThoughtsModal onSuccess={fetchPosts}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <Plus className="w-4 h-4" />
            New Current Thought
          </Button>
        </CurrentThoughtsModal>

        <TVGuideModal onSuccess={fetchPosts}>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
            <Tv className="w-4 h-4" />
            <Plus className="w-4 h-4" />
            New TV Guide Entry
          </Button>
        </TVGuideModal>
      </div>

      {/* Current Thoughts Section */}
      {currentThoughtsPosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Current Thoughts Posts
          </h3>
          <Carousel
            opts={{
              align: "start",
              loop: currentThoughtsPosts.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {currentThoughtsPosts.map((post) => (
                <CarouselItem key={post.id} className="pl-4 md:basis-1/3 lg:basis-1/4">
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full flex flex-col">
                    {post.image_url && (
                      <div className="h-56 overflow-hidden rounded-t-lg">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <CardHeader className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-600 text-white">
                          Current Thought
                        </Badge>
                      </div>
                      <CardTitle className="text-white text-lg">{post.title}</CardTitle>
                      <p className="text-gray-400 text-sm line-clamp-3">{post.content}</p>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(post)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          </Carousel>
        </div>
      )}

      {/* TV Guide Section */}
      {tvGuidePosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tv className="w-6 h-6" />
            TV Guide Posts
          </h3>
          <Carousel
            opts={{
              align: "start",
              loop: tvGuidePosts.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {tvGuidePosts.map((post) => (
                <CarouselItem key={post.id} className="pl-4 md:basis-1/3 lg:basis-1/4">
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full flex flex-col">
                    {post.image_url && (
                      <div className="h-56 overflow-hidden rounded-t-lg">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <CardHeader className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-purple-600 text-white">
                          TV Guide
                        </Badge>
                      </div>
                      <CardTitle className="text-white text-lg">{post.title}</CardTitle>
                      <p className="text-gray-400 text-sm line-clamp-3">{post.content}</p>
                      {post.link_url && (
                        <p className="text-blue-400 text-sm truncate">
                          Link: {post.link_url}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(post)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          </Carousel>
        </div>
      )}

      {posts.length === 0 && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No posts created yet. Create your first post!</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      {selectedPost && (
        <BulletinPostModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          post={selectedPost}
        />
      )}
    </div>
  );
};

export default BulletinPostManager;
