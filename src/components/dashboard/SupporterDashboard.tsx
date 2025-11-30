import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Video, User, FolderOpen, DollarSign, MessageSquare, Mail } from "lucide-react";
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
import SupporterCurrentAffirmationsModal from "@/components/SupporterCurrentAffirmationsModal";
import { MessageCreditsDisplay } from "@/components/messaging/MessageCreditsDisplay";
import { CreditPurchaseModal } from "@/components/messaging/CreditPurchaseModal";
import { MessagingInbox } from "@/components/messaging/MessagingInbox";
import { CreditTransactionHistory } from "@/components/messaging/CreditTransactionHistory";
import { NotificationsList } from "@/components/NotificationsList";
import { MessagingInfoCard } from "@/components/messaging/MessagingInfoCard";
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
  const [purchasedPortfolios, setPurchasedPortfolios] = useState<any[]>([]);
  const { currentQuarterIncome } = useQuarterlyIncome(user?.id);
  const [showCreditPurchaseModal, setShowCreditPurchaseModal] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
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

  const fetchUnreadMessagesCount = async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);
      setUnreadMessagesCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchPurchasedPortfolios();
      fetchCreditBalance();
      fetchUnreadMessagesCount();
    }
  }, [user]);


  return (
    <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
      {tutorial.isActive && tutorial.currentStepData && (
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

      {/* Notifications Section */}
      <div className="mb-6">
        <NotificationsList />
      </div>

      {/* Astrology Library Section */}
      <div className="mb-6">
        <BuyerAstrologyLibrary />
      </div>

      {/* Current Affirmations Section */}
      <div className="mb-6">
        <SupporterCurrentAffirmationsModal />
      </div>

      {/* Tax Calculator Section - Only show if user has referral income >= $600 */}
      {currentQuarterIncome >= 600 && (
        <Card className="p-6 mb-6 border-primary/20 bg-primary/5 bg-gray-800/50 border-gray-700 backdrop-blur-sm" data-tutorial="tax-calculator">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-white">Self-Employment Tax Calculator</h3>
              <p className="text-sm text-gray-400 mb-4">
                You've earned ${currentQuarterIncome.toFixed(2)} in referral commissions this quarter. 
                Use our calculator to estimate your self-employment taxes.
              </p>
              <SECalculatorModal 
                userId={user?.id}
                autoPopulateIncome={currentQuarterIncome}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Show income tracker even if below $600 */}
      {currentQuarterIncome > 0 && currentQuarterIncome < 600 && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6" data-tutorial="tax-calculator">
          <CardHeader>
            <CardTitle className="text-white">Self-Employment Tax Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Quarterly Referral Income Tracker</h4>
                <p className="text-gray-400 text-sm">
                  You've earned ${currentQuarterIncome.toFixed(2)} in referral commissions this quarter
                </p>
              </div>
              <SECalculatorModal userId={user?.id} autoPopulateIncome={currentQuarterIncome} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Always show SE calculator for supporters, even with $0 income */}
      {currentQuarterIncome === 0 && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6" data-tutorial="tax-calculator">
          <CardHeader>
            <CardTitle className="text-white">Self-Employment Tax Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Track Your Referral Income</h4>
                <p className="text-gray-400 text-sm">
                  Earn referral commissions by sharing your public playlist. Income will be tracked here for tax reporting.
                </p>
              </div>
              <SECalculatorModal userId={user?.id} autoPopulateIncome={0} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className={`text-white ${isMobile ? 'text-lg' : ''}`}>Welcome to your PIE Dashboard</CardTitle>
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
                  <TabsTrigger value="messaging" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Messages
                    {unreadMessagesCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                        {unreadMessagesCount}
                      </span>
                    )}
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
                
                <TabsContent value="messaging" className="space-y-6">
                  <MessagingInfoCard userType="supporter" />
                  <MessagingInbox />
                  <CreditTransactionHistory />
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
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Messages
                        {unreadMessagesCount > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                            {unreadMessagesCount}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MessagingInfoCard userType="supporter" />
                      <MessagingInbox />
                      <CreditTransactionHistory />
                    </CardContent>
                  </Card>
                  
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

      <CreditPurchaseModal 
        open={showCreditPurchaseModal}
        onOpenChange={setShowCreditPurchaseModal}
        onPurchaseComplete={fetchCreditBalance}
      />
    </div>
  );
};

export default SupporterDashboard;