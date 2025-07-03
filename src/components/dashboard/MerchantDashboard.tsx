
import React from "react";
import MediaPlayers from "./MediaPlayers";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ApprovalStatusBanner from "@/components/ApprovalStatusBanner";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import AccountSetup from "./merchant/AccountSetup";
import DashboardWidgets from "./merchant/DashboardWidgets";
import ContentManagement from "./merchant/ContentManagement";
import RestrictedAccess from "./merchant/RestrictedAccess";
import ModelingApplicationSection from "./merchant/ModelingApplicationSection";
import PublishingRoyaltiesModal from "@/components/profile/PublishingRoyaltiesModal";

interface MerchantDashboardProps {
  onSuccess: () => void;
  onViewStore: () => void;
  onBackgroundUpload: (url:string) => void;
  purchasedTracks: any[];
  purchasedVideos: any[];
  userProfile: any;
}

const MerchantDashboard = ({ 
  onSuccess, 
  onViewStore, 
  onBackgroundUpload, 
  purchasedTracks,
  purchasedVideos,
  userProfile
}: MerchantDashboardProps) => {
  const { isAdmin, isApproved, approvalStatus, loading } = useApprovalStatus();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 pt-20">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 pt-20">
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
          
          {/* Publishing Royalties for Merchants */}
          {isApproved && !isAdmin && (
            <div className="mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Revenue Information</h3>
                <p className="text-gray-300 mb-4">
                  View detailed information about PIE platform exclusive distribution and TuneCore partnership revenue sharing.
                </p>
                <PublishingRoyaltiesModal />
              </div>
            </div>
          )}
          
          {/* Only show modeling applications for approved merchants (not admins) */}
          {isApproved && !isAdmin && (
            <div className="mb-8">
              <ModelingApplicationSection onSuccess={onSuccess} />
            </div>
          )}
          
          <ContentManagement />

          <MediaPlayers purchasedTracks={purchasedTracks} purchasedVideos={purchasedVideos} />
        </>
      )}

      {!isApproved && !isAdmin && (
        <RestrictedAccess onProfileUpdate={onSuccess} />
      )}
    </div>
  );
};

export default MerchantDashboard;
