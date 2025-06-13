import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut, Calendar, User, Cloud, ExternalLink, MessageCircle, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PostInteractions from "@/components/PostInteractions";
import CurrentThoughtsModal from "@/components/CurrentThoughtsModal";

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  is_featured: boolean;
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
  const [featuredPost, setFeaturedPost] = useState<BulletinPost | null>(null);
  const [currentThoughts, setCurrentThoughts] = useState<BulletinPost[]>([]);
  const [tvGuidePosts, setTvGuidePosts] = useState<BulletinPost[]>([]);
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
        // Separate current thoughts and TV guide posts
        const thoughts = data.filter(post => post.post_type === 'current_thoughts');
        const tvGuide = data.filter(post => post.post_type === 'tv_guide' || !post.post_type);
        
        // Find featured current thought
        const featured = thoughts.find(post => post.is_featured);
        const regularThoughts = thoughts.filter(post => !post.is_featured);
        
        setFeaturedPost(featured || null);
        setCurrentThoughts(regularThoughts);
        setTvGuidePosts(tvGuide);
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

    // Set up realtime subscription
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

  const defaultFeaturedPost: BulletinPost = {
    id: 'featured-dummy',
    title: "Welcome to Our Community Thoughts!",
    content: 'Share your current thoughts and connect with others in our community. This space is for meaningful conversations and staying connected with what matters to you.',
    image_url: '/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png',
    is_featured: true,
    post_type: 'current_thoughts',
    created_at: new Date().toISOString(),
    merchant_id: 'featured-dummy',
    profiles: { email: 'community@example.com' }
  };

  const displayFeaturedPost = featuredPost || defaultFeaturedPost;

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

      {/* Hero Section */}
      <div 
        className="relative h-96 bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png')`
        }}
      >
        <div className="text-center text-white z-10">
          <h1 className="text-6xl font-bold mb-4">Community Bulletin</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Today's Featured Thought */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Cloud className="w-8 h-8 text-white" />
            Today's Featured Thought
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700" style={{ width: '722px', height: '821px' }}>
              <CardHeader className="p-0">
                {displayFeaturedPost.image_url && (
                  <div className="relative">
                    <img
                      src={displayFeaturedPost.image_url}
                      alt={displayFeaturedPost.title}
                      className="w-full h-64 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-yellow-500 text-black font-bold">
                        Featured
                      </Badge>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6 flex flex-col h-full">
                <CardTitle className="text-white text-2xl mb-4">{displayFeaturedPost.title}</CardTitle>
                <p className="text-gray-300 text-lg mb-6 leading-relaxed flex-grow">{displayFeaturedPost.content}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-2">
                    {displayFeaturedPost.profiles?.avatar_url ? (
                      <img
                        src={displayFeaturedPost.profiles.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                    {displayFeaturedPost.profiles?.display_name || displayFeaturedPost.profiles?.email || 'Community'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(displayFeaturedPost.created_at).toLocaleDateString()}
                  </div>
                </div>

                <PostInteractions postId={displayFeaturedPost.id} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Thoughts Section */}
        {currentThoughts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <MessageCircle className="w-8 h-8 text-blue-400" />
              Community Thoughts
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentThoughts.slice(0, displayedPosts).map((post) => (
                <Card key={post.id} className="bg-gray-800 border-gray-700 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="p-0">
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-56 object-cover rounded-t-lg"
                      />
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    <CardTitle className="text-white text-xl mb-3">{post.title}</CardTitle>
                    <p className="text-gray-300 text-base mb-6 leading-relaxed line-clamp-3">{post.content}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-3">
                        {post.profiles?.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8" />
                        )}
                        <span className="font-medium">
                          {post.profiles?.display_name || post.profiles?.email || 'Community'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <PostInteractions postId={post.id} />
                  </CardContent>
                </Card>
              ))}
            </div>

            {currentThoughts.length > displayedPosts && (
              <div className="text-center mt-6">
                <Button onClick={loadMorePosts} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Load More Thoughts
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TV Guide Section */}
        {tvGuidePosts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-400" />
              TV Guide Schedule
            </h2>
            
            <div className="space-y-4">
              {tvGuidePosts.map((post) => (
                <Card key={post.id} className="bg-gray-800 border-gray-700 hover:shadow-lg transition-all duration-300">
                  <div className="flex">
                    {post.image_url && (
                      <div className="w-48 h-32">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover rounded-l-lg"
                        />
                      </div>
                    )}
                    <CardContent className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-3">
                        <CardTitle className="text-white text-xl">{post.title}</CardTitle>
                        <div className="text-sm text-gray-400">
                          {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-gray-300 text-base mb-4 leading-relaxed">{post.content}</p>
                      
                      {post.link_url && (
                        <Button
                          onClick={() => handleLinkClick(post.link_url!)}
                          size="sm"
                          className="mb-4 bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Watch Now
                        </Button>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
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
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulletinBoard;
