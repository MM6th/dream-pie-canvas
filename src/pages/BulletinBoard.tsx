
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, ShoppingBag, Users, MessageSquare, BookOpen } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import CurrentThoughtsSection from "@/components/CurrentThoughtsSection";
import TVGuideSection from "@/components/TVGuideSection";
import { toast } from "sonner";

const BulletinBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isActivePage = (path: string) => location.pathname === path;

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
            avatar_url,
            user_type,
            is_admin
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

  // Merge announcements with current affirmations
  const currentThoughtsPosts = posts.filter((post) => 
    post.post_type === 'current_affirmations' || 
    post.post_type === 'announcement' ||
    post.post_type === 'current_thoughts'
  );
  const tvGuidePosts = posts.filter((post) => post.post_type === 'tv_guide');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleStoreView = () => {
    navigate('/');
    setTimeout(() => {
      window.dispatchEvent(new Event('navigateToStore'));
    }, 100);
  };


  const handleProfilesView = () => {
    navigate('/profiles');
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
              className={`border ${isActivePage('/') && !isActivePage('/bulletin') ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'} text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <ShoppingBag className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              Store
            </Button>
            <Button
              onClick={() => navigate('/bulletin')}
              variant="outline"
              className={`border ${isActivePage('/bulletin') ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'} text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              Community
            </Button>
            <Button
              onClick={handleProfilesView}
              variant="outline"
              className={`border ${isActivePage('/profiles') ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'} text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              Trending
            </Button>
            <Button
              onClick={() => navigate('/about-author')}
              variant="outline"
              className={`border ${isActivePage('/about-author') ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'} text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <BookOpen className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Founder' : 'About Founder'}
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
      <div className="relative z-10 w-full mx-auto p-6">

        {/* Desktop: Ad + Content + Ad Layout */}
        {isMobile ? (
          // Mobile: Vertical stack, no ads
          <div className="space-y-8 max-w-2xl mx-auto">
            <CurrentThoughtsSection posts={currentThoughtsPosts} useCarousel={false} />
            <TVGuideSection posts={tvGuidePosts} useCarousel={false} />
          </div>
        ) : (
          // Desktop: Left Ad + 2 Carousels + Right Ad
          <div className="flex gap-6 justify-center items-start">
            {/* Left Ad Space */}
            <div className="w-48 flex-shrink-0">
              <div className="sticky top-4">
                <div 
                  className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-purple-600 transition-colors"
                  onClick={() => toast.info("Ad placements will be available soon!")}
                >
                  <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                </div>
              </div>
            </div>

            {/* Main Content - 2 Carousels */}
            <div className="flex gap-2 max-w-3xl">
              <div className="flex-1">
                <CurrentThoughtsSection posts={currentThoughtsPosts} useCarousel={false} />
              </div>
              <div className="flex-1">
                <TVGuideSection posts={tvGuidePosts} useCarousel={false} />
              </div>
            </div>

            {/* Right Ad Space */}
            <div className="w-48 flex-shrink-0">
              <div className="sticky top-4">
                <div 
                  className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-blue-600 transition-colors"
                  onClick={() => toast.info("Ad placements will be available soon!")}
                >
                  <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulletinBoard;
