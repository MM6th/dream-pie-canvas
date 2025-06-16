import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "@/components/AuthPage";
import { useNavigate } from "react-router-dom";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { toast } from "@/hooks/use-toast";
import StoreView from "@/pages/views/StoreView";
import DashboardView from "@/pages/views/DashboardView";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  access_level?: "public" | "merchant_only" | "paid" | null;
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
  const { isAdmin, isApproved } = useApprovalStatus();
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

  // Listen for custom store navigation event
  useEffect(() => {
    const handleNavigateToStore = () => {
      if (isApproved || isAdmin) {
        setCurrentView("store");
      } else {
        toast({
          title: "Access Denied",
          description: "You must be an approved merchant to access the store.",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('navigateToStore', handleNavigateToStore);
    return () => {
      window.removeEventListener('navigateToStore', handleNavigateToStore);
    };
  }, [isApproved, isAdmin]);

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

    console.log('Fetching purchased tracks for user:', user.id);

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
            thumbnail_url,
            access_level
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchased tracks:', error);
        return;
      }

      console.log('Raw purchased tracks data:', data);

      const tracks = data
        ?.filter(purchase => purchase.audio_products)
        .map(purchase => purchase.audio_products as AudioTrack) || [];

      console.log('Processed purchased tracks:', tracks);
      console.log('Number of tracks to set in audio player:', tracks.length);

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
    if (!isApproved && !isAdmin) {
        toast({
            title: "Access Denied",
            description: "You must be an approved merchant to access this page.",
            variant: "destructive"
        });
        return;
    }
    navigate('/films');
  };

  const handleBulletinView = () => {
    if (!isApproved && !isAdmin) {
        toast({
            title: "Access Denied",
            description: "You must be an approved merchant to access this page.",
            variant: "destructive"
        });
        return;
    }
    navigate('/bulletin');
  };

  const handleProfileUpdate = () => {
    fetchUserProfile();
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
    if (!isApproved && !isAdmin) {
        setCurrentView("dashboard");
        toast({
            title: "Access Denied",
            description: "You must be an approved merchant to access the store.",
            variant: "destructive"
        });
        return null; 
    }
    return (
      <StoreView 
        onBackToDashboard={() => setCurrentView("dashboard")}
        onFilmsView={handleFilmsView}
        onBulletinView={handleBulletinView}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <DashboardView 
      userProfile={userProfile}
      profileLoading={profileLoading}
      onStoreView={() => setCurrentView("store")}
      onFilmsView={handleFilmsView}
      onBulletinView={handleBulletinView}
      onSignOut={handleSignOut}
      onProfileUpdate={handleProfileUpdate}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onSuccess={fetchUserProfile}
      onBackgroundUpload={handleBackgroundUpload}
      purchasedTracks={purchasedTracks}
      purchasedVideos={purchasedVideos}
    />
  );
};

export default Index;
