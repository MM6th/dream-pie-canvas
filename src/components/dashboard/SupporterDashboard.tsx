import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, FolderOpen, MessageSquare, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AudioPlayer from "@/components/AudioPlayer";

import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";
import PurchasedPortfoliosViewer from "@/components/dashboard/PurchasedPortfoliosViewer";
import BackgroundUpload from "@/components/BackgroundUpload";
import ContentGallery from "@/components/ContentGallery";
import BulletinPostManager from "@/components/BulletinPostManager";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

import PieWelcomeModal from "@/components/PieWelcomeModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuarterlyIncome } from "@/hooks/useQuarterlyIncome";
import SECalculatorModal from "@/components/SECalculatorModal";
import { useDashboardTutorial } from "@/hooks/useDashboardTutorial";
import { supporterTutorialSteps } from "@/constants/tutorialContent";
import { TutorialTooltip } from "@/components/TutorialTooltip";
import { TutorialSpotlight } from "@/components/TutorialSpotlight";
import { TutorialHelpButton } from "@/components/TutorialHelpButton";
import SupporterCurrentAffirmationsModal from "@/components/SupporterCurrentAffirmationsModal";
// Messaging components now accessed via MessageCreditsIcon in header
import { BuyerAstrologyLibrary } from "@/components/astrology/BuyerAstrologyLibrary";
import { FreeAstrologyResourceModal } from "@/components/FreeAstrologyResourceModal";
import { useFreeAstrologyResource } from "@/hooks/useFreeAstrologyResource";
import UserTicketsTab from "@/components/support/UserTicketsTab";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  audio_type?: string;
}

interface SupporterDashboardProps {
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: AudioTrack[];
  purchasedPodcasts: AudioTrack[];
}

const SupporterDashboard = ({ onBackgroundUpload, purchasedTracks, purchasedPodcasts }: SupporterDashboardProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const [purchasedPortfolios, setPurchasedPortfolios] = useState<any[]>([]);
  const { currentQuarterIncome } = useQuarterlyIncome(user?.id);
  const [creditBalance, setCreditBalance] = useState(0);
  
  const freeResource = useFreeAstrologyResource(user?.id);
  
  const tutorial = useDashboardTutorial('supporter', supporterTutorialSteps, userProfile?.created_at);

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
              display_order,
              is_video_muted
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

  const fetchCreditBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('messaging_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      setCreditBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error fetching credit balance:', error);
    }
  };


  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchPurchasedPortfolios();
      fetchCreditBalance();
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
      
      
      <PieWelcomeModal>
        <Button 
          onClick={() => setShowWelcomeModal(true)}
          variant="ghost" 
          className={`text-blue-400 hover:text-blue-300 ${isMobile ? 'text-sm' : ''}`}
        >
          What is PIE?
        </Button>
      </PieWelcomeModal>

      {/* Current Affirmations Section */}
      <div className="mb-6">
        <SupporterCurrentAffirmationsModal />
      </div>

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className={`text-white ${isMobile ? 'text-lg' : ''}`}>Welcome to your PIE Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="music" className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-5'}`}>
              <TabsTrigger value="music" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-1 h-8' : ''}`} data-tutorial="music-tab">
                <Music className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {isMobile ? 'Media' : 'Music & Podcasts'}
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
                  <TabsTrigger value="ticket" className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Ticket
                  </TabsTrigger>
                  <TabsTrigger value="background" data-tutorial="background-tab">Background</TabsTrigger>
                </>
              )}
              {isMobile && (
                <TabsTrigger value="more" className="flex items-center gap-2 text-xs px-2 py-1 h-8">
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
            
            
            {!isMobile && (
              <>
                <TabsContent value="posts" className="space-y-6">
                  <BulletinPostManager />
                </TabsContent>
                
                <TabsContent value="content" className="space-y-6">
                  <ContentGallery />
                </TabsContent>
                
                <TabsContent value="ticket" className="space-y-6">
                  <UserTicketsTab />
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
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <SupporterCurrentAffirmationsModal />
                      </div>
                      <BulletinPostManager hideHeader />
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
                      <CardTitle className="text-white text-sm">Background</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Support Tickets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <UserTicketsTab />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Astrology Library Section - At Bottom */}
      <div className="mb-6">
        <BuyerAstrologyLibrary />
      </div>

      {/* Free Astrology Resource Modal */}
      {user && (
        <FreeAstrologyResourceModal
          open={freeResource.showModal}
          onOpenChange={freeResource.setShowModal}
          userId={user.id}
          onAccepted={freeResource.refresh}
        />
      )}
    </div>
  );
};

export default SupporterDashboard;