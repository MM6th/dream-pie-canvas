import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Video, User, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AudioPlayer from "@/components/AudioPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";
import BackgroundUpload from "@/components/BackgroundUpload";
import ContentGallery from "@/components/ContentGallery";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import SupporterProfileModal from "@/components/profile/SupporterProfileModal";
import PieWelcomeModal from "@/components/PieWelcomeModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
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

interface SupporterDashboardProps {
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: AudioTrack[];
  purchasedPodcasts: AudioTrack[];
  purchasedVideos: VideoTrack[];
}

const SupporterDashboard = ({ onBackgroundUpload, purchasedTracks, purchasedPodcasts, purchasedVideos }: SupporterDashboardProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [playlistPublic, setPlaylistPublic] = useState(false);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching supporter profile:', error);
      } else {
        setUserProfile(data);
        setPlaylistPublic(data?.playlist_public || false);
      }
    } catch (error) {
      console.error('Error fetching supporter profile:', error);
    }
  };

  const togglePlaylistVisibility = async (checked: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ playlist_public: checked })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating playlist visibility:', error);
      } else {
        setPlaylistPublic(checked);
        setUserProfile(prev => prev ? { ...prev, playlist_public: checked } : null);
      }
    } catch (error) {
      console.error('Error updating playlist visibility:', error);
    }
  };

  const handleProfileUpdate = () => {
    fetchUserProfile();
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  return (
    <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
      <PieWelcomeModal>
        <Button 
          onClick={() => setShowWelcomeModal(true)}
          variant="ghost" 
          className={`text-blue-400 hover:text-blue-300 ${isMobile ? 'text-sm' : ''}`}
        >
          What is PIE?
        </Button>
      </PieWelcomeModal>

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className={`text-white ${isMobile ? 'text-lg' : ''}`}>Welcome to your PIE Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="music" className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-5'}`}>
              <TabsTrigger value="music" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-1 h-8' : ''}`}>
                <Music className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {isMobile ? 'Media' : 'Music & Podcasts'}
              </TabsTrigger>
              <TabsTrigger value="videos" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-1 h-8' : ''}`}>
                <Video className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                Videos
              </TabsTrigger>
              {!isMobile && (
                <>
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Content Gallery
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="background">Background</TabsTrigger>
                </>
              )}
              {isMobile && (
                <TabsTrigger value="more" className="flex items-center gap-2 text-xs px-2 py-1 h-8">
                  <User className="w-3 h-3" />
                  More
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="music" className="space-y-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-white">Playlist Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="playlist-public"
                      checked={playlistPublic}
                      onCheckedChange={togglePlaylistVisibility}
                    />
                    <Label htmlFor="playlist-public" className="text-white">
                      Make my playlist public on profile page
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
                <AudioPlayer tracks={purchasedTracks} />
                <PodcastAudioPlayer tracks={purchasedPodcasts} />
              </div>
            </TabsContent>
            
            <TabsContent value="videos" className="space-y-6">
              <VideoPlayer videos={purchasedVideos} />
            </TabsContent>
            
            {!isMobile && (
              <>
                <TabsContent value="content" className="space-y-6">
                  <ContentGallery />
                </TabsContent>
                
                <TabsContent value="profile" className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <SupporterProfileModal
                      profile={userProfile}
                      onProfileUpdate={handleProfileUpdate}
                    >
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <User className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </SupporterProfileModal>
                  </div>
                  
                </TabsContent>
                
                <TabsContent value="background" className="space-y-6">
                  <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
                </TabsContent>
              </>
            )}
            
            {isMobile && (
              <TabsContent value="more" className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <Card className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Content Gallery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ContentGallery />
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Profile Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      <SupporterProfileModal
                        profile={userProfile}
                        onProfileUpdate={handleProfileUpdate}
                      >
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                          <User className="w-3 h-3 mr-2" />
                          Edit Profile
                        </Button>
                      </SupporterProfileModal>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Background</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupporterDashboard;