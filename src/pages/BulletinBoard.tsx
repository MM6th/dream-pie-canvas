
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Calendar, User, Cloud, ExternalLink, ChevronDown, Tv } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PostInteractions from "@/components/PostInteractions";
import CurrentThoughtsModal from "@/components/CurrentThoughtsModal";
import TVGuideSection from "@/components/TVGuideSection";

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  post_type?: string;
  created_at: string;
  merchant_id: string;
  profiles?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

const BulletinBoard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState(6);
  const [loading, setLoading] = useState(true);

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

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          *,
          profiles (
            email,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      if (data) {
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = () => {
    setDisplayedPosts(prev => prev + 6);
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('bulletin-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bulletin_posts'
        },
        () => {
          console.log('Realtime update received, fetching posts...');
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, []);

  const tvGuidePosts = posts.filter(post => post.post_type === 'tv_guide');
  const otherPosts = posts.filter(post => post.post_type !== 'tv_guide');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading bulletin board...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
        <div className="flex gap-2">
          <Button
            onClick={handleBackToDashboard}
            variant="outline"
            className="border-gray-600 text-white hover:bg-white hover:text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          {user && <CurrentThoughtsModal onSuccess={fetchPosts} />}
        </div>
        <Button
          onClick={handleSignOut}
          className="bg-white text-black hover:bg-gray-100 hover:text-black"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Hero Section - Adjusted width to match content */}
      <div className="pt-20 max-w-6xl mx-auto">
        <div 
          className="relative h-96 bg-cover bg-center bg-no-repeat rounded-lg mb-6"
          style={{
            backgroundImage: `url('/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png')`
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* TV Guide Section */}
        <TVGuideSection posts={tvGuidePosts} />

        {/* Unified Posts Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Cloud className="w-8 h-8 text-white" />
            Community Bulletin
          </h2>
          
          {otherPosts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {otherPosts.slice(0, displayedPosts).map((post) => (
                <Card key={post.id} className="bg-gray-800 border-gray-700 max-w-2xl">
                  <CardHeader className="p-0">
                    {post.image_url && (
                      <div className="relative">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full object-contain rounded-t-lg"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    <CardTitle className="text-white text-2xl mb-4">{post.title}</CardTitle>
                    <p className="text-gray-300 text-lg mb-6 leading-relaxed">{post.content}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                      <div className="flex items-center gap-2">
                        {post.profiles?.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                        {post.profiles?.display_name || post.profiles?.email || 'Community'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {post.link_url && (
                        <Button
                          onClick={() => handleLinkClick(post.link_url!)}
                          size="sm"
                          className="mb-4 bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Learn More
                        </Button>
                      )}

                    <PostInteractions postId={post.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-800 border-gray-700 max-w-2xl">
              <CardContent className="p-6">
                 <p className="text-gray-300 text-lg text-center">No community posts on the bulletin board yet. Be the first to share!</p>
              </CardContent>
            </Card>
          )}

          {otherPosts.length > displayedPosts && (
            <div className="text-center mt-6">
              <Button onClick={loadMorePosts} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                <ChevronDown className="w-4 h-4 mr-2" />
                Load More Posts
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
