
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Video } from "lucide-react";

const Index = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<"merchant" | "supporter" | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleAuth = () => {
    // Mock authentication - in real app this would connect to Supabase
    setIsLoggedIn(true);
  };

  const LandingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dreamy background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 px-4">
        <h1 className="text-9xl font-black text-white mb-8 tracking-tight">
          PIE
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl">
          The ultimate platform for media creators and supporters. Discover, create, and share your passion for film, TV, music, and entertainment.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={() => setIsSignUp(true)} 
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
          >
            Get Started
          </Button>
          <Button 
            onClick={() => setIsSignUp(true)} 
            variant="outline" 
            className="border-gray-400 text-white hover:bg-white/10 px-8 py-3 text-lg"
          >
            Learn More
          </Button>
        </div>
      </div>

      {/* Auth Modal */}
      {isSignUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white text-center">Join PIE</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input id="email" type="email" className="bg-gray-800 border-gray-600 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-gray-300">Password</Label>
                    <Input id="password" type="password" className="bg-gray-800 border-gray-600 text-white" />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 mb-2 block">I am a:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={userType === "merchant" ? "default" : "outline"}
                        onClick={() => setUserType("merchant")}
                        className="w-full"
                      >
                        Merchant
                      </Button>
                      <Button
                        variant={userType === "supporter" ? "default" : "outline"}
                        onClick={() => setUserType("supporter")}
                        className="w-full"
                      >
                        Supporter
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleAuth} 
                    disabled={!userType}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Sign Up
                  </Button>
                  <Button 
                    onClick={() => setIsSignUp(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const Dashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      {userType === "merchant" ? <MerchantDashboard /> : <SupporterDashboard />}
    </div>
  );

  return isLoggedIn ? <Dashboard /> : <LandingPage />;
};

const MerchantDashboard = () => (
  <div className="p-6">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h1>
      <p className="text-gray-300">Manage your media content and connect with supporters</p>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Upload Background</h3>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-2">Drop your background image here</p>
            <p className="text-sm text-gray-500">Recommended: 1920x1080 or 2560x1440 pixels</p>
            <Button className="mt-4">Choose File</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400">Total Uploads</p>
              <p className="text-2xl font-bold text-white">24</p>
            </div>
            <div>
              <p className="text-gray-400">Supporters</p>
              <p className="text-2xl font-bold text-white">128</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <MediaPlayers />
  </div>
);

const SupporterDashboard = () => (
  <div className="p-6">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white mb-2">Supporter Dashboard</h1>
      <p className="text-gray-300">Discover and enjoy amazing content from creators</p>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Customize Background</h3>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-2">Upload your dashboard background</p>
            <p className="text-sm text-gray-500">Recommended: 1920x1080 or 2560x1440 pixels</p>
            <Button className="mt-4">Choose File</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">My Library</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400">Music Tracks</p>
              <p className="text-2xl font-bold text-white">47</p>
            </div>
            <div>
              <p className="text-gray-400">Videos</p>
              <p className="text-2xl font-bold text-white">12</p>
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
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Music className="text-purple-400" size={24} />
          <h3 className="text-xl font-bold text-white">Music Player</h3>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-medium">Sample Track</p>
              <p className="text-gray-400 text-sm">Artist Name</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">Play</Button>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className="bg-purple-400 h-2 rounded-full w-1/3"></div>
            </div>
            <span className="text-gray-400 text-sm">2:34</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Video className="text-blue-400" size={24} />
          <h3 className="text-xl font-bold text-white">Video Player</h3>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="aspect-video bg-gray-800 rounded mb-4 flex items-center justify-center">
            <Video className="text-gray-600" size={48} />
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Play</Button>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full w-1/4"></div>
            </div>
            <span className="text-gray-400 text-sm">5:42</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Index;
