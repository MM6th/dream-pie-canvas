
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LogOut, MessageSquare, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import VideoPlayer from "@/components/VideoPlayer";

interface VideoProduct {
  id: string;
  title: string;
  description: string | null;
  video_file_url: string;
  thumbnail_url: string | null;
  background_music_url: string | null;
  created_at: string;
}

const Films = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [videos, setVideos] = useState<VideoProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
      } else {
        setVideos(data || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleStoreView = () => {
    navigate('/');
    setTimeout(() => {
      window.dispatchEvent(new Event('navigateToStore'));
    }, 100);
  };

  const handleBulletinView = () => {
    navigate('/bulletin');
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
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-6">You must be logged in to access this page.</p>
            <Button onClick={handleBackToDashboard} className="bg-blue-600 hover:bg-blue-700 text-white">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      {/* Header with proper alignment */}
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
              onClick={handleBulletinView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Browse Bulletin
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

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Films</h1>
            <p className="text-gray-300">Discover our collection of videos and films</p>
          </div>

          {/* Videos Section */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center text-white">Loading videos...</div>
            ) : (
              <VideoPlayer videos={videos} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Films;
