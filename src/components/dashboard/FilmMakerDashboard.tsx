import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, FolderOpen, MessageSquare, Ticket, Film, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "@/components/AudioPlayer";
import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";
import PurchasedPortfoliosViewer from "@/components/dashboard/PurchasedPortfoliosViewer";
import PurchasedFilmsViewer from "@/components/dashboard/PurchasedFilmsViewer";
import BackgroundUpload from "@/components/BackgroundUpload";
import ContentGallery from "@/components/ContentGallery";
import BulletinPostManager from "@/components/BulletinPostManager";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import SupporterCurrentAffirmationsModal from "@/components/SupporterCurrentAffirmationsModal";
import { BuyerAstrologyLibrary } from "@/components/astrology/BuyerAstrologyLibrary";
import AstrologyAudioPlayer from "@/components/AstrologyAudioPlayer";
import TVGuideModal from "@/components/TVGuideModal";
import UserTicketsTab from "@/components/support/UserTicketsTab";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import ApprovalStatusBanner from "@/components/ApprovalStatusBanner";
import RestrictedAccess from "@/components/dashboard/merchant/RestrictedAccess";
import FilmProductManager from "@/components/FilmProductManager";
import ScriptWriterCard from "@/components/ScriptWriterCard";
import { FollowRequestsManager } from "@/components/profile/FollowRequestsManager";
import AdminDashboard from "@/components/admin/AdminDashboard";
import FashionProductManager from "@/components/FashionProductManager";
import AudioProductManager from "@/components/AudioProductManager";
import FashionProductUploadModal from "@/components/FashionProductUploadModal";
import AudioUploadModal from "@/components/AudioUploadModal";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  audio_type?: string;
}

interface FilmMakerDashboardProps {
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: AudioTrack[];
  purchasedPodcasts: AudioTrack[];
  onSuccess?: () => void;
}

const FilmMakerDashboard = ({ 
  onBackgroundUpload, 
  purchasedTracks, 
  purchasedPodcasts,
  onSuccess
}: FilmMakerDashboardProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const [purchasedPortfolios, setPurchasedPortfolios] = useState<any[]>([]);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [isFashionModalOpen, setIsFashionModalOpen] = useState(false);
  const { isApproved, isAdmin, approvalStatus, loading: approvalLoading } = useApprovalStatus();

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
        console.error('Error fetching profile:', error);
      } else {
        setUserProfile(data);
        setPlaylistPublic(data?.playlist_public || false);
        setIsPrivate(data?.is_private || false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPendingRequestsCount = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('profile_follow_requests')
        .select('*', { count: 'exact', head: true })
        .eq('target_merchant_id', user.id)
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingRequestsCount(count);
      }
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
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

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchPurchasedPortfolios();
      fetchPendingRequestsCount();
    }
  }, [user]);

  // Show restricted access if not approved and not admin
  if (!approvalLoading && !isApproved && !isAdmin) {
    return (
      <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
        <RestrictedAccess onProfileUpdate={onSuccess} />
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
      {/* Approval Status Banner */}
      <ApprovalStatusBanner approvalStatus={approvalStatus} isAdmin={isAdmin} />
      
      {/* Share Affirmations & TV Guide Buttons */}
      <div className="flex flex-col gap-3 mb-6">
        <SupporterCurrentAffirmationsModal />
        <TVGuideModal />
      </div>

      {/* Follow Requests Card - shows when profile is private and has pending requests */}
      {isPrivate && pendingRequestsCount > 0 && (
        <Card className="mb-6 bg-blue-600/10 border-blue-500">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Follow Requests
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {pendingRequestsCount} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm mb-4">
              You have {pendingRequestsCount} pending follow request{pendingRequestsCount !== 1 ? 's' : ''} for your private profile.
            </p>
            <Button onClick={() => setShowFollowRequests(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Users className="w-4 h-4 mr-2" />
              Manage Requests
            </Button>
          </CardContent>
        </Card>
      )}

      <FollowRequestsManager 
        isOpen={showFollowRequests} 
        onClose={() => {
          setShowFollowRequests(false);
          fetchPendingRequestsCount();
        }} 
      />

      {/* Admin Dashboard - Admin Only */}
      {isAdmin && (
        <div className="mb-6">
          <AdminDashboard />
        </div>
      )}

      {/* Fashion Products Creation Card - Admin Only */}
      {isAdmin && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Fashion Products</h3>
              <Button
                onClick={() => setIsFashionModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upload Fashion Product
              </Button>
            </div>
            <p className="text-gray-400">Upload and manage fashion products for the store</p>
          </CardContent>
        </Card>
      )}

      {/* Fashion Product Manager - Admin Only */}
      {isAdmin && (
        <div className="mb-6">
          <FashionProductManager />
        </div>
      )}

      {/* Audio Products Creation Card - Admin Only */}
      {isAdmin && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Audio Products</h3>
              <AudioUploadModal onSuccess={onSuccess || (() => {})} />
            </div>
            <p className="text-gray-400">Upload and manage your audio content</p>
          </CardContent>
        </Card>
      )}

      {/* Audio Product Manager - Admin Only */}
      {isAdmin && (
        <div className="mb-6">
          <AudioProductManager />
        </div>
      )}

      {/* Fashion Product Upload Modal */}
      <FashionProductUploadModal 
        isOpen={isFashionModalOpen}
        onClose={() => setIsFashionModalOpen(false)}
        onSuccess={onSuccess || (() => {})} 
      />

      {/* Film Product Manager */}
      <div className="mb-6">
        <FilmProductManager />
      </div>

      {/* Script Writer Card */}
      <div className="mb-6">
        <ScriptWriterCard />
      </div>

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className={`text-white flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
            <Film className="w-5 h-5 text-purple-500" />
            Film Maker Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="music" className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-5'}`}>
              <TabsTrigger value="music" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-1 h-8' : ''}`}>
                <Music className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {isMobile ? 'Media' : 'Music & Podcasts'}
              </TabsTrigger>
              {!isMobile && (
                <>
                  <TabsTrigger value="posts" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Community Posts
                  </TabsTrigger>
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Content Gallery
                  </TabsTrigger>
                  <TabsTrigger value="ticket" className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Ticket
                  </TabsTrigger>
                  <TabsTrigger value="background">Background</TabsTrigger>
                </>
              )}
              {isMobile && (
                <TabsTrigger value="more" className="flex items-center gap-2 text-xs px-2 py-1 h-8">
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
                <PurchasedFilmsViewer />
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
                        <TVGuideModal />
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
        <div className="mt-4">
          <AstrologyAudioPlayer />
        </div>
      </div>
    </div>
  );
};

export default FilmMakerDashboard;
