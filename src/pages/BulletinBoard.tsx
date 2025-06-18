
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, ShoppingBag, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { supabase } from "@/integrations/supabase/client";
import CurrentThoughtsSection from "@/components/CurrentThoughtsSection";
import TVGuideSection from "@/components/TVGuideSection";
import { BulletinPost } from "@/types/bulletin";

const BulletinBoard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isApproved, isAdmin } = useApprovalStatus();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
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

  const currentThoughtsPosts = posts.filter(post => post.post_type === 'current_thoughts');
  const tvGuidePosts = posts.filter(post => post.post_type === 'tv_guide');

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

  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700 backdrop-blur-sm p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">You must be an approved merchant to access this page.</p>
          <Button onClick={handleBackToDashboard} className="bg-blue-600 hover:bg-blue-700 text-white">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 bg-fixed bg-cover bg-center relative">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed opacity-30"
        style={{
          backgroundImage: `url('/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png')`
        }}
      />
      
      {/* Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-4 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              onClick={handleBackToDashboard}
              className="bg-black text-white border-0 hover:bg-black"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              onClick={handleStoreView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Store
            </Button>
            <Button
              onClick={handleFilmsView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <Film className="w-4 h-4 mr-2" />
              Browse Films
            </Button>
          </div>
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
        <div className="w-full h-80 bg-gray-800 rounded-lg overflow-hidden">
          <img 
            src="/lovable-uploads/8a8289fd-017b-4c07-9e5a-03d19c081cb0.png" 
            alt="Bulletin Board Cover" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Community Bulletin</h1>
            <p className="text-gray-300">Stay connected with community thoughts and entertainment</p>
          </div>

          {loading ? (
            <div className="text-center text-white">Loading posts...</div>
          ) : (
            <div className="space-y-12">
              <TVGuideSection posts={tvGuidePosts} />
              <CurrentThoughtsSection posts={currentThoughtsPosts} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
