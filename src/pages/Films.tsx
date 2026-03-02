import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Film as FilmIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import AppNavBar from "@/components/AppNavBar";
import { supabase } from "@/integrations/supabase/client";
import FilmCard from "@/components/FilmCard";
import NowPlayingCarousel from "@/components/NowPlayingCarousel";

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
  cover_photo_url: string | null;
  status: string;
  is_adult_content: boolean;
  sales_count: number;
  download_count?: number;
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


  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-6">You must be logged in to access this page.</p>
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      <AppNavBar />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
        {/* Now Playing Carousel - only films with cover photos */}
        {!loading && films.filter(f => f.cover_photo_url).length > 0 && (
          <NowPlayingCarousel 
            films={films.filter(f => f.cover_photo_url).map(f => ({
              id: f.id,
              title: f.title,
              description: f.description,
              cover_photo_url: f.cover_photo_url!,
              price: f.price,
              is_free: f.is_free,
              genres: f.genres || [],
            }))}
            onFilmClick={(filmId) => {
              const filmElement = document.getElementById(`film-${filmId}`);
              if (filmElement) {
                filmElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        )}

        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Films</h1>
            <p className="text-gray-300">Discover our collection of films from independent creators</p>
          </div>

          {/* Films Grid */}
          {loading ? (
            <div className="text-center text-white py-12">
              <FilmIcon className="w-12 h-12 mx-auto mb-4 animate-pulse" />
              <p>Loading films...</p>
            </div>
          ) : films.length === 0 ? (
            <div className="text-center py-12">
              <FilmIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl text-white mb-2">No Films Available</h3>
              <p className="text-gray-400">Check back soon for new releases!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {films.map((film) => (
                <div key={film.id} id={`film-${film.id}`}>
                  <FilmCard 
                    film={film} 
                    onPurchase={fetchFilms}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Films;
