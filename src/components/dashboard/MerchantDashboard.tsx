
import React from "react";
import MediaPlayers from "./MediaPlayers";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ApprovalStatusBanner from "@/components/ApprovalStatusBanner";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import AccountSetup from "./merchant/AccountSetup";
import DashboardWidgets from "./merchant/DashboardWidgets";
import ContentManagement from "./merchant/ContentManagement";
import RestrictedAccess from "./merchant/RestrictedAccess";

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
      <div className="p-6 pt-20">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isAdmin ? 'Admin Dashboard' : 'Merchant Dashboard'}
        </h1>
        <p className="text-gray-300">
          {isAdmin 
            ? 'Manage merchant applications and platform content' 
            : 'Manage your media content and connect with supporters'
          }
        </p>
      </div>

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
          />
          
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
