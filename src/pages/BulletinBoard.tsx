
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, ShoppingBag, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import CurrentThoughtsSection from "@/components/CurrentThoughtsSection";
import TVGuideSection from "@/components/TVGuideSection";
import RegularPostsSection from "@/components/RegularPostsSection";
import AnnouncementPostsSection from "@/components/AnnouncementPostsSection";

const BulletinBoard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
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

  const currentThoughtsPosts = posts.filter((post) => post.post_type === 'current_thoughts');
  const tvGuidePosts = posts.filter((post) => post.post_type === 'tv_guide');
  const regularPosts = posts.filter((post) => post.post_type === 'regular');
  const announcementPosts = posts.filter((post) => post.post_type === 'announcement');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleStoreView = () => {
    navigate('/');
    setTimeout(() => {
      window.dispatchEvent(new Event('navigateToStore'));
    }, 100);
  };

  const handleFilmsView = () => {
    navigate('/films');
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700 backdrop-blur-sm p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">You must be logged in to access this page.</p>
          <Button
            onClick={handleBackToDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      {/* Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-4 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Main Navigation */}
          <div className={`flex gap-2 ${isMobile ? 'flex-wrap w-full' : ''}`}>
            <Button
              onClick={handleBackToDashboard}
              className={`bg-black text-white border-0 hover:bg-black ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <ArrowLeft className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Dashboard' : 'Back to Dashboard'}
            </Button>
            <Button
              onClick={handleStoreView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <ShoppingBag className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Store' : 'Browse Store'}
            </Button>
            <Button
              onClick={handleFilmsView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <Film className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Films' : 'Browse Films'}
            </Button>
          </div>
          
          {/* Sign Out Button */}
          <Button
            onClick={handleSignOut}
            className={`bg-white text-black hover:bg-gray-100 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full sm:w-auto' : ''}`}
          >
            <LogOut className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Bulletin Board</h1>
          <p className="text-gray-300">Stay updated with the latest from our community</p>
        </div>

        {/* Announcements Section - Always full width */}
        <div className="mb-12">
          <AnnouncementPostsSection posts={announcementPosts} />
        </div>

        {/* Responsive Layout for Other Sections */}
        {isMobile ? (
          // Mobile: Vertical stack
          <div className="space-y-8">
            <CurrentThoughtsSection posts={currentThoughtsPosts} useCarousel={false} />
            <TVGuideSection posts={tvGuidePosts} useCarousel={false} />
            <RegularPostsSection posts={regularPosts} useCarousel={false} />
          </div>
        ) : (
          // Desktop: Three columns
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <CurrentThoughtsSection posts={currentThoughtsPosts} useCarousel={false} />
            </div>
            <div className="lg:col-span-1">
              <TVGuideSection posts={tvGuidePosts} useCarousel={false} />
            </div>
            <div className="lg:col-span-1">
              <RegularPostsSection posts={regularPosts} useCarousel={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulletinBoard;
