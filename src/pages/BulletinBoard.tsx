
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { supabase } from "@/integrations/supabase/client";
import TVGuideSection from "@/components/TVGuideSection";
import PostInteractions from "@/components/PostInteractions";
import CommentsModal from "@/components/CommentsModal";
import { BulletinPost } from "@/types/bulletin";

const BulletinBoard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isApproved, isAdmin } = useApprovalStatus();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [tvGuidePosts, setTvGuidePosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          id,
          title,
          content,
          image_url,
          link_url,
          post_type,
          created_at,
          merchant_id,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        const allPosts = data || [];
        const regularPosts = allPosts.filter(post => post.post_type !== 'tv_guide');
        const tvGuideEntries = allPosts.filter(post => post.post_type === 'tv_guide');
        
        setPosts(regularPosts);
        setTvGuidePosts(tvGuideEntries);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 bg-fixed bg-cover bg-center relative">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed opacity-30"
        style={{
          backgroundImage: `url('/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png')`
        }}
      />
      
      {/* Header with proper alignment */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-4 pb-4">
        <div className="flex justify-between items-center">
          <Button
            onClick={handleBackToDashboard}
            variant="outline"
            className="border-gray-600 text-white bg-black hover:bg-black hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            onClick={handleSignOut}
            className="bg-white text-black hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Cover Photo Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 mb-8">
        <div className="w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
          <img 
            src="/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png" 
            alt="Bulletin Board Cover" 
            className="w-full h-full object-contain object-center"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Bulletin Board</h1>
            <p className="text-gray-300">Share your thoughts and connect with the community</p>
          </div>

          {/* TV Guide Section - only for approved merchants/admins */}
          {(isApproved || isAdmin) && (
            <div className="mb-8">
              <TVGuideSection posts={tvGuidePosts} />
            </div>
          )}

          {/* Posts Section */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center text-white">Loading posts...</div>
            ) : posts.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-400">No posts yet. Be the first to share something!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <img 
                        src={post.profiles?.avatar_url || "/placeholder.svg"} 
                        alt="Author" 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                          <span className="text-sm text-gray-400">
                            by {post.profiles?.display_name || 'Anonymous'}
                          </span>
                        </div>
                        {post.image_url && (
                          <div className="mb-4">
                            <img 
                              src={post.image_url} 
                              alt="Post image" 
                              className="w-full max-w-md rounded-lg object-cover"
                            />
                          </div>
                        )}
                        <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                          <PostInteractions postId={post.id} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedPost && (
        <CommentsModal 
          postId={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onCommentCountChange={() => {}}
        />
      )}
    </div>
  );
};

export default BulletinBoard;
