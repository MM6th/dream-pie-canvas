
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Film } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "@/components/AuthPage";
import StorePage from "@/components/StorePage";
import MerchantDashboard from "@/components/dashboard/MerchantDashboard";
import SupporterDashboard from "@/components/dashboard/SupporterDashboard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useNavigate } from "react-router-dom";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
}

interface VideoTrack {
  id: string;
  title: string;
  description: string | null;
  video_file_url: string;
  thumbnail_url: string | null;
  background_music_url: string | null;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "store">("dashboard");
  const [purchasedTracks, setPurchasedTracks] = useState<AudioTrack[]>([]);
  const [purchasedVideos, setPurchasedVideos] = useState<VideoTrack[]>([]);

  useEffect(() => {
    console.log('Index component mounted, user:', user, 'loading:', loading);
    if (user && !loading) {
      fetchUserProfile();
      fetchPurchasedTracks();
      fetchPurchasedVideos();
    } else if (!user && !loading) {
      setUserProfile(null);
      setProfileLoading(false);
      setPurchasedTracks([]);
      setPurchasedVideos([]);
    }
  }, [user, loading]);

  useEffect(() => {
    if (currentView === "dashboard" && user) {
      fetchPurchasedTracks();
      fetchPurchasedVideos();
    }
  }, [currentView, user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    console.log('Fetching user profile for:', user.id);
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        console.log('Profile fetched:', data);
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchPurchasedTracks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          audio_product_id,
          audio_products (
            id,
            title,
            artist_name,
            audio_file_url,
            thumbnail_url
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchased tracks:', error);
        return;
      }

      const tracks = data
        ?.filter(purchase => purchase.audio_products)
        .map(purchase => purchase.audio_products as AudioTrack) || [];

      setPurchasedTracks(tracks);
    } catch (error) {
      console.error('Error fetching purchased tracks:', error);
    }
  };

  const fetchPurchasedVideos = async () => {
    if (!user) return;

    try {
      // For now, return empty array since user_video_purchases table doesn't exist in types yet
      // This will be updated once the database types are regenerated
      console.log('Video purchases feature coming soon - database types need to be regenerated');
      setPurchasedVideos([]);
    } catch (error) {
      console.error('Error fetching purchased videos:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBackgroundUpload = (url: string) => {
    setUserProfile(prev => ({ ...prev, background_image_url: url }));
  };

  const handleFilmsView = () => {
    navigate('/films');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (currentView === "store") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentView("dashboard")}
              variant="outline"
              className="border-gray-600 text-white hover:bg-white hover:text-black"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={handleFilmsView}
              variant="outline"
              className="border-gray-600 text-white hover:bg-white hover:text-black"
            >
              <Film className="w-4 h-4 mr-2" />
              Browse Films
            </Button>
          </div>
          <Button
            onClick={handleSignOut}
            className="bg-white text-black hover:bg-gray-100 hover:text-black"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        <div className="pt-20">
          <StorePage />
        </div>
      </div>
    );
  }

  const backgroundStyle = userProfile?.background_image_url 
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${userProfile.background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800" style={backgroundStyle}>
      <DashboardHeader 
        onStoreView={() => setCurrentView("store")} 
        onFilmsView={handleFilmsView}
        onSignOut={handleSignOut} 
      />
      
      {profileLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading profile...</div>
        </div>
      ) : (
        <>
          {userProfile?.user_type === "merchant" ? (
            <MerchantDashboard 
              onSuccess={fetchUserProfile}
              onViewStore={() => setCurrentView("store")}
              onBackgroundUpload={handleBackgroundUpload}
              purchasedTracks={purchasedTracks}
              purchasedVideos={purchasedVideos}
            />
          ) : (
            <SupporterDashboard 
              onBackgroundUpload={handleBackgroundUpload}
              purchasedTracks={purchasedTracks}
              purchasedVideos={purchasedVideos}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;
