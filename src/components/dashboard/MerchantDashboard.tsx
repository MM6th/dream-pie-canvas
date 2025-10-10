
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
import { useDashboardTutorial } from "@/hooks/useDashboardTutorial";
import { merchantTutorialSteps } from "@/constants/tutorialContent";
import { TutorialToast } from "@/components/TutorialToast";

interface MerchantDashboardProps {
  onSuccess: () => void;
  onViewStore: () => void;
  onBackgroundUpload: (url:string) => void;
  purchasedTracks: any[];
  purchasedPodcasts: any[];
  purchasedVideos: any[];
  userProfile: any;
}

const MerchantDashboard = ({ 
  onSuccess, 
  onViewStore, 
  onBackgroundUpload, 
  purchasedTracks,
  purchasedPodcasts,
  purchasedVideos,
  userProfile
}: MerchantDashboardProps) => {
  const { isAdmin, isApproved, approvalStatus, loading } = useApprovalStatus();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [playlistPublic, setPlaylistPublic] = useState<boolean>(false);
  const [purchasedPortfolios, setPurchasedPortfolios] = useState<any[]>([]);
  
  // Only show merchant tutorial if user is NOT an admin (admin tutorial takes priority)
  const tutorial = useDashboardTutorial('merchant', isAdmin ? [] : merchantTutorialSteps);

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
        .select('playlist_public')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setPlaylistPublic(data.playlist_public || false);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
    <div className={`max-w-6xl mx-auto ${isMobile ? 'p-4' : 'p-6'} pt-20`}>
      {tutorial.isActive && tutorial.currentStepData && (
        <TutorialToast
          title={tutorial.currentStepData.title}
          description={tutorial.currentStepData.description}
          currentStep={tutorial.currentStep}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onSkip={tutorial.skipTutorial}
          duration={tutorial.currentStepData.duration}
        />
      )}
      
      <ApprovalStatusBanner approvalStatus={approvalStatus} isAdmin={isAdmin} />

      {isAdmin && (
        <div className="mb-12">
          <AdminDashboard />
        </div>
      )}

      {(isApproved || isAdmin) && (
        <>
          {isApproved && !isAdmin && (
            <AccountSetup userProfile={userProfile} onProfileUpdate={onSuccess} />
          )}

          <DashboardWidgets 
            onSuccess={onSuccess} 
            onViewStore={onViewStore} 
            onBackgroundUpload={onBackgroundUpload} 
            isAdmin={isAdmin}
          />
          
          
          {/* Only show modeling applications for approved merchants (not admins) */}
          {isApproved && !isAdmin && (
            <div className="mb-8">
              <ModelingApplicationSection onSuccess={onSuccess} />
            </div>
          )}
          
          <ContentManagement />

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

          <MediaPlayers purchasedTracks={purchasedTracks} purchasedPodcasts={purchasedPodcasts} purchasedVideos={purchasedVideos} purchasedPortfolios={purchasedPortfolios} />
        </>
      )}

      {!isApproved && !isAdmin && (
        <RestrictedAccess onProfileUpdate={onSuccess} />
      )}
    </div>
  );
};

export default MerchantDashboard;
