import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LogOut, MessageSquare, ShoppingBag, Users, Film, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import FilmCard from "@/components/FilmCard";

interface FilmProduct {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  stars: string[];
  genres: string[];
  price: number | null;
  is_free: boolean;
  thumbnail_url: string | null;
  trailer_url: string | null;
  full_video_url: string | null;
  status: string;
  is_adult_content: boolean;
  sales_count: number;
  created_at: string;
}

const Films = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [films, setFilms] = useState<FilmProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilms();
  }, []);

  const fetchFilms = async () => {
    try {
      const { data, error } = await supabase
        .from('film_products')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching films:', error);
      } else {
        setFilms((data as FilmProduct[]) || []);
      }
    } catch (error) {
      console.error('Error fetching films:', error);
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
              onClick={handleBulletinView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              Community
            </Button>
            <Button
              onClick={handleProfilesView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              Trending
            </Button>
            <Button
              variant="outline"
              className={`bg-primary border-primary text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <Film className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              Films
            </Button>
            <Button
              onClick={() => navigate('/about-author')}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
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
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Films</h1>
            <p className="text-gray-300">Discover our collection of films from independent creators</p>
          </div>

          {/* Films Grid */}
          {loading ? (
            <div className="text-center text-white py-12">
              <Film className="w-12 h-12 mx-auto mb-4 animate-pulse" />
              <p>Loading films...</p>
            </div>
          ) : films.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl text-white mb-2">No Films Available</h3>
              <p className="text-gray-400">Check back soon for new releases!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {films.map((film) => (
                <FilmCard 
                  key={film.id} 
                  film={film} 
                  onPurchase={fetchFilms}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Films;
