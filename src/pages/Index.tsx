
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
  audio_type?: string;
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
  const [purchasedPodcasts, setPurchasedPodcasts] = useState<AudioTrack[]>([]);
  const [purchasedVideos, setPurchasedVideos] = useState<VideoTrack[]>([]);

  // Auto-redirect to contest if scheduled time arrives
  useContestRedirect();
  useContestInviteRedirect();

  useEffect(() => {
    console.log('Index component mounted, user:', user, 'loading:', loading);
    if (user && !loading) {
      fetchUserProfile();
      fetchPurchasedTracks();
      fetchPurchasedPodcasts();
      fetchPurchasedVideos();
    } else if (!user && !loading) {
      setUserProfile(null);
      setProfileLoading(false);
      setPurchasedTracks([]);
      setPurchasedPodcasts([]);
      setPurchasedVideos([]);
    }
  }, [user, loading]);

  useEffect(() => {
    if (currentView === "dashboard" && user) {
      fetchPurchasedTracks();
      fetchPurchasedPodcasts();
      fetchPurchasedVideos();
    }
  }, [currentView, user]);

  // Listen for custom store navigation event - allow all authenticated users
  useEffect(() => {
    const handleNavigateToStore = () => {
      if (user) {
        setCurrentView("store");
      } else {
        toast({
          title: "Access Denied",
          description: "You must be logged in to access the store.",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('navigateToStore', handleNavigateToStore);
    return () => {
      window.removeEventListener('navigateToStore', handleNavigateToStore);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    console.log('Fetching user profile for:', user.id);
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfileLoading(false);
        return;
      }
      
      if (!data) {
        console.log('No profile found for user');
        setProfileLoading(false);
        return;
      }
      
      console.log('Profile fetched:', data);
      setUserProfile(data);

      // Check if supporter is missing required profile info
      if (data?.user_type === 'supporter') {
        const missingAvatar = !data.avatar_url || data.avatar_url.trim() === '';
        const missingDisplayName = !data.display_name || data.display_name.trim() === '';
        
        if (missingAvatar || missingDisplayName) {
          toast({
            title: "Complete Your Profile",
            description: "Please add a display name and avatar to your profile to get the full experience.",
            variant: "destructive"
          });
        }
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
            access_level,
            audio_type
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchased tracks:', error);
        return;
      }

      console.log('Raw purchased tracks data:', data);

      const allTracks = data
        ?.filter(purchase => purchase.audio_products)
        .map(purchase => purchase.audio_products as AudioTrack) || [];

      // Include music and video_ad tracks in audio player
      const musicTracks = allTracks.filter(track => 
        track.audio_type === 'music' || track.audio_type === 'video_ad'
      );

      console.log('Processed purchased music tracks:', musicTracks);
      console.log('Number of music tracks to set in audio player:', musicTracks.length);

      setPurchasedTracks(musicTracks);
    } catch (error) {
      console.error('Error fetching purchased tracks:', error);
    }
  };

  const fetchPurchasedPodcasts = async () => {
    if (!user) return;

    console.log('Fetching purchased podcasts for user:', user.id);

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
            access_level,
            audio_type
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchased podcasts:', error);
        return;
      }

      console.log('Raw purchased podcasts data:', data);

      const podcastTracks = data
        ?.filter(purchase => 
          purchase.audio_products && 
          (purchase.audio_products.audio_type === 'podcast' || purchase.audio_products.audio_type === 'asmr')
        )
        .map(purchase => purchase.audio_products as AudioTrack) || [];

      console.log('Processed purchased podcasts:', podcastTracks);
      console.log('Number of podcast tracks to set:', podcastTracks.length);

      setPurchasedPodcasts(podcastTracks);
    } catch (error) {
      console.error('Error fetching purchased podcasts:', error);
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


  const handleBulletinView = () => {
    if (!user) {
        toast({
            title: "Access Denied",
            description: "You must be logged in to access this page.",
            variant: "destructive"
        });
        return;
    }
    navigate('/bulletin');
  };

  const handleProfilesView = () => {
    if (!user) {
        toast({
            title: "Access Denied",
            description: "You must be logged in to access this page.",
            variant: "destructive"
        });
        return;
    }
    navigate('/profiles');
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
    if (!user) {
        setCurrentView("dashboard");
        toast({
            title: "Access Denied",
            description: "You must be logged in to access the store.",
            variant: "destructive"
        });
        return null; 
    }
    return (
      <StoreView 
        onBackToDashboard={() => setCurrentView("dashboard")}
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
      onBulletinView={handleBulletinView}
      onProfilesView={handleProfilesView}
      onSignOut={handleSignOut}
      onProfileUpdate={handleProfileUpdate}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onSuccess={fetchUserProfile}
      onBackgroundUpload={handleBackgroundUpload}
      purchasedTracks={purchasedTracks}
      purchasedPodcasts={purchasedPodcasts}
    />
  );
};

export default Index;
