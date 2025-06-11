
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut, Calendar, User, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_featured: boolean;
  created_at: string;
  merchant_id: string;
  profiles?: {
    email: string;
  };
}

const BulletinBoard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BulletinPost | null>(null);
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
      // Even if there's an error, try to navigate back
      navigate('/');
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          *,
          profiles (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      if (data) {
        const featured = data.find(post => post.is_featured);
        const regular = data.filter(post => !post.is_featured);
        
        setFeaturedPost(featured || null);
        setPosts(regular);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
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

    // Cleanup function
    return () => {
      console.log('Cleaning up realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array to run only once

  // Dummy data for initial display
  const dummyPosts: BulletinPost[] = [
    {
      id: 'dummy-1',
      title: 'Welcome to Our Community!',
      content: 'We are excited to share this new bulletin board where merchants can connect with supporters. Stay tuned for amazing content and announcements!',
      is_featured: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      merchant_id: 'dummy',
      profiles: { email: 'community@example.com' }
    },
    {
      id: 'dummy-2',
      title: 'New Features Coming Soon',
      content: 'We are working on exciting new features to enhance your experience. Thank you for being part of our community!',
      is_featured: false,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      merchant_id: 'dummy',
      profiles: { email: 'updates@example.com' }
    },
    {
      id: 'dummy-3',
      title: 'Community Guidelines',
      content: 'Please be respectful and supportive of all community members. This is a space for creativity and collaboration.',
      is_featured: false,
      created_at: new Date(Date.now() - 259200000).toISOString(),
      merchant_id: 'dummy',
      profiles: { email: 'admin@example.com' }
    }
  ];

  const displayPosts = posts.length > 0 ? posts : dummyPosts;

  const defaultFeaturedPost: BulletinPost = {
    id: 'featured-dummy',
    title: "Today's Featured: Community Launch!",
    content: 'Welcome to our brand new community bulletin board! This is where merchants will share their latest updates, announcements, and connect with supporters. We are thrilled to have you here and look forward to building an amazing creative community together.',
    image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
    is_featured: true,
    created_at: new Date().toISOString(),
    merchant_id: 'featured-dummy',
    profiles: { email: 'community@example.com' }
  };

  const displayFeaturedPost = featuredPost || defaultFeaturedPost;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading bulletin board...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-800">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
          className="border-blue-400 text-white hover:bg-white hover:text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
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
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop')`
        }}
      >
        <div className="text-center text-white z-10">
          <h1 className="text-6xl font-bold mb-4">Community Bulletin</h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto px-4">
            Stay connected with updates, announcements, and stories from our creative community
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Today's Featured Post */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Star className="w-8 h-8 text-yellow-400" />
            Today's Featured Post
          </h2>
          
          <Card className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 border-blue-400 backdrop-blur-sm">
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
            <CardContent className="p-6">
              <CardTitle className="text-white text-2xl mb-4">{displayFeaturedPost.title}</CardTitle>
              <p className="text-gray-200 text-lg mb-4 leading-relaxed">{displayFeaturedPost.content}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {displayFeaturedPost.profiles?.email || 'Community'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(displayFeaturedPost.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Posts Section */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">
            Recent Posts
          </h2>
          
          {displayPosts.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-600 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400 text-lg">No posts yet. Check back soon for updates from our community!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPosts.map((post) => (
                <Card key={post.id} className="bg-gray-800/50 border-gray-600 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
                  <CardHeader className="p-0">
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">{post.content}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.profiles?.email || 'Community'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
