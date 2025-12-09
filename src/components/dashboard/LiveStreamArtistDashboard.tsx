import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Video, User, FolderOpen, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AudioPlayer from "@/components/AudioPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";
import PurchasedPortfoliosViewer from "@/components/dashboard/PurchasedPortfoliosViewer";
import BackgroundUpload from "@/components/BackgroundUpload";
import ContentGallery from "@/components/ContentGallery";
import BulletinPostManager from "@/components/BulletinPostManager";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import SupporterProfileModal from "@/components/profile/SupporterProfileModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardTutorial } from "@/hooks/useDashboardTutorial";
import { supporterTutorialSteps } from "@/constants/tutorialContent";
import { TutorialTooltip } from "@/components/TutorialTooltip";
import { TutorialSpotlight } from "@/components/TutorialSpotlight";
import SupporterCurrentAffirmationsModal from "@/components/SupporterCurrentAffirmationsModal";
import { BuyerAstrologyLibrary } from "@/components/astrology/BuyerAstrologyLibrary";

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

interface LiveStreamArtistDashboardProps {
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: AudioTrack[];
  purchasedPodcasts: AudioTrack[];
  purchasedVideos: VideoTrack[];
}

const LiveStreamArtistDashboard = ({ 
  onBackgroundUpload, 
  purchasedTracks, 
  purchasedPodcasts, 
  purchasedVideos 
}: LiveStreamArtistDashboardProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const [purchasedPortfolios, setPurchasedPortfolios] = useState<any[]>([]);
  
  const tutorial = useDashboardTutorial('supporter', supporterTutorialSteps);

  const fetchPurchasedPortfolios = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('portfolio_purchases')
        .select(`
          id,
          purchase_date,
          amount_paid,
          portfolios:portfolio_id (
            id,
            title,
            description,
            portfolio_images (
              id,
              image_path,
              video_url,
              media_type,
              display_order
            )
          )
        `)
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false });

      if (!error && data) {
        setPurchasedPortfolios(data);
      }
    } catch (error) {
      console.error('Error fetching purchased portfolios:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setUserProfile(data);
        setPlaylistPublic(data?.playlist_public || false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
        setUserProfile((prev: any) => prev ? { ...prev, playlist_public: checked } : null);
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
      fetchPurchasedPortfolios();
    }
  }, [user]);

  return (
    <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
      {/* Floating tutorial for first-time users only */}
      {tutorial.isActive && tutorial.currentStepData && tutorial.isFirstTimeUser && (
        <>
          <TutorialSpotlight 
            targetElement={tutorial.targetElement}
            isActive={tutorial.isActive}
          />
          <TutorialTooltip
            title={tutorial.currentStepData.title}
            description={tutorial.currentStepData.description}
            currentStep={tutorial.currentStep}
            totalSteps={tutorial.totalSteps}
            onNext={tutorial.nextStep}
            onSkip={tutorial.skipTutorial}
            targetElement={tutorial.targetElement}
            preferredPlacement={tutorial.currentStepData.placement}
          />
        </>
      )}

      {/* Live Stream Video Frame */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            Live Stream Studio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-900 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-medium">Live Stream Preview</p>
              <p className="text-gray-500 text-sm mt-2">Your live stream will appear here</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-500 text-red-400 hover:bg-red-500/10"
                disabled
              >
                Start Live Stream (Coming Soon)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Astrology Library Section */}
      <div className="mb-6">
        <BuyerAstrologyLibrary />
      </div>

      {/* Current Affirmations Section */}
      <div className="mb-6">
        <SupporterCurrentAffirmationsModal />
      </div>


      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className={`text-white ${isMobile ? 'text-lg' : ''}`}>Live Stream Artist Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="music" className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-7'}`}>
              <TabsTrigger value="music" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-1 h-8' : ''}`} data-tutorial="music-tab">
                <Music className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {isMobile ? 'Media' : 'Music & Podcasts'}
              </TabsTrigger>
              <TabsTrigger value="videos" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-1 h-8' : ''}`} data-tutorial="videos-tab">
                <Video className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                Videos
              </TabsTrigger>
              {!isMobile && (
                <>
                  <TabsTrigger value="posts" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Community Posts
                  </TabsTrigger>
                  <TabsTrigger value="content" className="flex items-center gap-2" data-tutorial="gallery-tab">
                    <FolderOpen className="w-4 h-4" />
                    Content Gallery
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex items-center gap-2" data-tutorial="profile-tab">
                    <User className="w-4 h-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="background" data-tutorial="background-tab">Background</TabsTrigger>
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
              <Card className="mb-6" data-tutorial="playlist-public">
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
              <PurchasedPortfoliosViewer portfolios={purchasedPortfolios} />
            </TabsContent>
            
            <TabsContent value="videos" className="space-y-6">
              <VideoPlayer videos={purchasedVideos} />
            </TabsContent>
            
            {!isMobile && (
              <>
                <TabsContent value="posts" className="space-y-6">
                  <BulletinPostManager />
                </TabsContent>
                
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
                      <CardTitle className="text-white text-sm">Community Posts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BulletinPostManager />
                    </CardContent>
                  </Card>
                  
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

export default LiveStreamArtistDashboard;
