import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Video, LogOut, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "@/components/AuthPage";
import BackgroundUpload from "@/components/BackgroundUpload";
import AudioUploadModal from "@/components/AudioUploadModal";
import StorePage from "@/components/StorePage";
import AudioProductManager from "@/components/AudioProductManager";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "store">("dashboard");

  useEffect(() => {
    console.log('Index component mounted, user:', user, 'loading:', loading);
    if (user && !loading) {
      fetchUserProfile();
    } else if (!user && !loading) {
      setUserProfile(null);
      setProfileLoading(false);
    }
  }, [user, loading]);

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

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBackgroundUpload = (url: string) => {
    setUserProfile(prev => ({ ...prev, background_image_url: url }));
  };

  // Show loading only when auth is loading, not when profile is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show auth page if no user
  if (!user) {
    return <AuthPage />;
  }

  // Show store page if selected
  if (currentView === "store") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
        {/* Navigation */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
          <Button
            onClick={() => setCurrentView("dashboard")}
            variant="outline"
            className="border-gray-600 text-white hover:bg-white hover:text-black"
          >
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
        <div className="pt-20">
          <StorePage />
        </div>
      </div>
    );
  }

  const LandingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dreamy background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-500/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-gray-600/20 via-transparent to-transparent"></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 px-4">
        <h1 className="text-9xl font-black text-white mb-8 tracking-tight">
          PIE
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl">
          The ultimate platform for media creators and supporters. Discover, create, and share your passion for film, TV, music, and entertainment.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button className="bg-gradient-to-r from-gray-600 to-black hover:from-gray-700 hover:to-gray-900 text-white px-8 py-3 text-lg">
            Get Started
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-400 text-white hover:bg-white/10 px-8 py-3 text-lg"
          >
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );

  const Dashboard = () => {
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
        {/* Navigation */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
          <Button
            onClick={() => setCurrentView("store")}
            variant="outline"
            className="border-gray-600 text-white hover:bg-white hover:text-black"
          >
            <Store className="w-4 h-4 mr-2" />
            Browse Store
          </Button>
          <Button
            onClick={handleSignOut}
            className="bg-white text-black hover:bg-gray-100 hover:text-black"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        
        {profileLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">Loading profile...</div>
          </div>
        ) : (
          <>
            {userProfile?.user_type === "merchant" ? <MerchantDashboard /> : <SupporterDashboard />}
          </>
        )}
      </div>
    );
  };

  const MerchantDashboard = () => (
    <div className="p-6 pt-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h1>
        <p className="text-gray-300">Manage your media content and connect with supporters</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Audio Products</h3>
              <AudioUploadModal onSuccess={fetchUserProfile} />
            </div>
            <p className="text-gray-400 mb-4">Upload and manage your audio content</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Total Audio Products</p>
                  <p className="text-gray-400 text-sm">Manage your audio library</p>
                </div>
                <Button
                  onClick={() => setCurrentView("store")}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-white hover:bg-white hover:text-black"
                >
                  View in Store
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Total Uploads</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div>
                <p className="text-gray-400">Supporters</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Upload Background</h3>
            <BackgroundUpload onUploadSuccess={handleBackgroundUpload} />
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <AudioProductManager />
          </CardContent>
        </Card>
      </div>

      <MediaPlayers />
    </div>
  );

  const SupporterDashboard = () => (
    <div className="p-6 pt-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Supporter Dashboard</h1>
        <p className="text-gray-300">Discover and enjoy amazing content from creators</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Customize Background</h3>
            <BackgroundUpload onUploadSuccess={handleBackgroundUpload} />
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">My Library</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Music Tracks</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div>
                <p className="text-gray-400">Videos</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MediaPlayers />
    </div>
  );

  const MediaPlayers = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Music className="text-gray-400" size={24} />
            <h3 className="text-xl font-bold text-white">Music Player</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-medium">No track selected</p>
                <p className="text-gray-400 text-sm">Upload or purchase music</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" className="bg-gray-600 hover:bg-gray-700" disabled>
                Play
              </Button>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full w-0"></div>
              </div>
              <span className="text-gray-400 text-sm">0:00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Video className="text-gray-400" size={24} />
            <h3 className="text-xl font-bold text-white">Video Player</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="aspect-video bg-gray-800 rounded mb-4 flex items-center justify-center">
              <Video className="text-gray-600" size={48} />
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" className="bg-gray-600 hover:bg-gray-700" disabled>
                Play
              </Button>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full w-0"></div>
              </div>
              <span className="text-gray-400 text-sm">0:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return <Dashboard />;
};

export default Index;
