
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Video, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AudioPlayer from "@/components/AudioPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import BackgroundUpload from "@/components/BackgroundUpload";
import { useAuth } from "@/hooks/useAuth";
import SupporterProfileModal from "@/components/profile/SupporterProfileModal";
import { Button } from "@/components/ui/button";

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

interface SupporterDashboardProps {
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: AudioTrack[];
  purchasedVideos: VideoTrack[];
}

const SupporterDashboard = ({ onBackgroundUpload, purchasedTracks, purchasedVideos }: SupporterDashboardProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("music");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Welcome Back!</h1>
        <p className="text-gray-300">Enjoy your purchased content</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger 
            value="music" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Music className="w-4 h-4 mr-2" />
            Music
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Video className="w-4 h-4 mr-2" />
            Videos
          </TabsTrigger>
          <TabsTrigger 
            value="profile" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="background" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Background
          </TabsTrigger>
        </TabsList>

        <TabsContent value="music">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Your Music Collection</CardTitle>
            </CardHeader>
            <CardContent>
              {purchasedTracks.length > 0 ? (
                <AudioPlayer tracks={purchasedTracks} />
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No music purchased yet. Visit the store to discover amazing tracks!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Your Video Collection</CardTitle>
            </CardHeader>
            <CardContent>
              {purchasedVideos.length > 0 ? (
                <VideoPlayer videos={purchasedVideos} />
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No videos purchased yet. Check out our films section!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-gray-400 mb-4">Update your profile information</p>
                <SupporterProfileModal onProfileUpdate={() => window.location.reload()}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <User className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </SupporterProfileModal>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Dashboard Background</CardTitle>
            </CardHeader>
            <CardContent>
              <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupporterDashboard;
