
import React from "react";
import MediaPlayers from "./MediaPlayers";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ApprovalStatusBanner from "@/components/ApprovalStatusBanner";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { useIsMobile } from "@/hooks/use-mobile";
import AccountSetup from "./merchant/AccountSetup";
import DashboardWidgets from "./merchant/DashboardWidgets";
import ContentManagement from "./merchant/ContentManagement";
import RestrictedAccess from "./merchant/RestrictedAccess";
import ModelingApplicationSection from "./merchant/ModelingApplicationSection";
import PublishingRoyaltiesModal from "@/components/profile/PublishingRoyaltiesModal";
import ContractOpportunitiesModal from "@/components/profile/ContractOpportunitiesModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardTutorial } from "@/hooks/useDashboardTutorial";
import { merchantTutorialSteps } from "@/constants/tutorialContent";
import { TutorialTooltip } from "@/components/TutorialTooltip";
import { TutorialSpotlight } from "@/components/TutorialSpotlight";
import { TutorialHelpButton } from "@/components/TutorialHelpButton";
import { FollowRequestsManager } from "@/components/profile/FollowRequestsManager";
import { Users } from "lucide-react";
import { AstrologyDeliveryManager } from "@/components/astrology/AstrologyDeliveryManager";
import { BuyerAstrologyLibrary } from "@/components/astrology/BuyerAstrologyLibrary";
import AstrologyAudioPlayer from "@/components/AstrologyAudioPlayer";
import { FreeAstrologyResourceModal } from "@/components/FreeAstrologyResourceModal";
import { useFreeAstrologyResource } from "@/hooks/useFreeAstrologyResource";
import SupportCenterCard from "@/components/support/SupportCenterCard";
import ContestInviteCard from "@/components/contest/ContestInviteCard";

interface MerchantDashboardProps {
  onSuccess: () => void;
  onViewStore: () => void;
  onBackgroundUpload: (url:string) => void;
  purchasedTracks: any[];
  purchasedPodcasts: any[];
  userProfile: any;
}

const MerchantDashboard = ({ 
  onSuccess, 
  onViewStore, 
  onBackgroundUpload, 
  purchasedTracks,
  purchasedPodcasts,
  userProfile
}: MerchantDashboardProps) => {
  const { isAdmin, isApproved, approvalStatus, loading } = useApprovalStatus();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [playlistPublic, setPlaylistPublic] = useState<boolean>(false);
  const [purchasedPortfolios, setPurchasedPortfolios] = useState<any[]>([]);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  
  const freeResource = useFreeAstrologyResource(user?.id);
  
  // Only show merchant tutorial if user is NOT an admin (admin tutorial takes priority)
  const tutorial = useDashboardTutorial('merchant', isAdmin ? [] : merchantTutorialSteps, userProfile?.created_at);

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
        .select('playlist_public, is_private')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setPlaylistPublic(data.playlist_public || false);
        setIsPrivate(data.is_private || false);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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

      if (error) throw error;
      
      setPlaylistPublic(checked);
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


  if (loading) {
    return (
      <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20 overflow-x-hidden w-full`}>
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
      
      
      <div data-tutorial="approval-status">
        <ApprovalStatusBanner approvalStatus={approvalStatus} isAdmin={isAdmin} />
      </div>

      {isAdmin && (
        <div className="mb-12">
          <AdminDashboard />
        </div>
      )}

      {(isApproved || isAdmin) && (
        <>
          {/* Astrology Delivery Manager (Admin Only) */}
          {isAdmin && (
            <div className="mb-6">
              <AstrologyDeliveryManager />
            </div>
          )}

          {isApproved && !isAdmin && (
            <div data-tutorial="account-setup">
              <AccountSetup userProfile={userProfile} onProfileUpdate={onSuccess} />
            </div>
          )}

          <DashboardWidgets 
            onSuccess={onSuccess} 
            onViewStore={onViewStore} 
            onBackgroundUpload={onBackgroundUpload} 
            isAdmin={isAdmin}
          />
          
          {/* Contest Invitations Card */}
          {(isApproved || isAdmin) && (
            <div className="mb-6">
              <ContestInviteCard />
            </div>
          )}

          {/* Only show modeling applications for approved merchants (not admins) */}
          {isApproved && !isAdmin && (
            <div className="mb-8" data-tutorial="modeling">
              <ModelingApplicationSection onSuccess={onSuccess} />
            </div>
          )}
          
          <div data-tutorial="audio-products">
            <ContentManagement />
          </div>

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

          <Card className="mb-6" data-tutorial="playlist-settings">
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

          <FollowRequestsManager 
            isOpen={showFollowRequests} 
            onClose={() => {
              setShowFollowRequests(false);
              fetchPendingRequestsCount();
            }} 
          />

          <div data-tutorial="media-players">
            <MediaPlayers purchasedTracks={purchasedTracks} purchasedPodcasts={purchasedPodcasts} purchasedPortfolios={purchasedPortfolios} />
          </div>

          {/* Astrology Library Section */}
          <div className="mt-6">
            <BuyerAstrologyLibrary />
            <div className="mt-4 max-w-xl">
              <AstrologyAudioPlayer />
            </div>
          </div>

          {/* Support Center Card */}
          <div className="mt-6">
            <SupportCenterCard />
          </div>
        </>
      )}

      {!isApproved && !isAdmin && (
        <RestrictedAccess onProfileUpdate={onSuccess} />
      )}

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

export default MerchantDashboard;
