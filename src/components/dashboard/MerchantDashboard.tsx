import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackgroundUpload from "@/components/BackgroundUpload";
import AudioUploadModal from "@/components/AudioUploadModal";
import VideoUploadModal from "@/components/VideoUploadModal";
import AudioProductManager from "@/components/AudioProductManager";
import VideoProductManager from "@/components/VideoProductManager";
import BulletinPostManager from "@/components/BulletinPostManager";
import PhotoGallery from "@/components/PhotoGallery";
import MediaPlayers from "./MediaPlayers";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ApprovalStatusBanner from "@/components/ApprovalStatusBanner";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import MerchantProfileModal from "@/components/profile/MerchantProfileModal";
import MerchantBenefitsModal from "@/components/profile/MerchantBenefitsModal";
import TunecoreRoyaltyModal from "@/components/profile/TunecoreRoyaltyModal";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle } from "lucide-react";

interface MerchantDashboardProps {
  onSuccess: () => void;
  onViewStore: () => void;
  onBackgroundUpload: (url: string) => void;
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

  const handleComingSoon = () => {
    toast({
      title: "Coming Soon!",
      description: "This feature is currently under development. Stay tuned!",
    });
  };

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

      {/* Approval Status Banner */}
      <ApprovalStatusBanner approvalStatus={approvalStatus} isAdmin={isAdmin} />

      {/* Admin Section */}
      {isAdmin && (
        <div className="mb-12">
          <AdminDashboard />
        </div>
      )}

      {/* Standard Merchant Content - Only show if approved or admin */}
      {(isApproved || isAdmin) && (
        <>
          {isApproved && !isAdmin && (
            <Card className="mb-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-xl">Account Setup & Agreements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
                  {userProfile?.paypal_email ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Payment Information Complete</p>
                        <p className="text-gray-400 text-sm">Your PayPal email is on file for payouts.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Action Required: Add Payment Information</p>
                        <p className="text-gray-400 text-sm">Please add your PayPal email to receive payments.</p>
                      </div>
                      <MerchantProfileModal onProfileUpdate={onSuccess}>
                        <Button size="sm" className="ml-auto">Update Profile</Button>
                      </MerchantProfileModal>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex flex-col items-start space-y-2">
                    <Button 
                      variant="link" 
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto justify-start"
                      onClick={handleComingSoon}
                    >
                      Independent Contractor Agreement (Coming Soon)
                    </Button>
                    <TunecoreRoyaltyModal />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Audio Products</h3>
                  <AudioUploadModal onSuccess={onSuccess} />
                </div>
                <p className="text-gray-400 mb-4">Upload and manage your audio content</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Total Audio Products</p>
                      <p className="text-gray-400 text-sm">Manage your audio library</p>
                    </div>
                    <Button
                      onClick={onViewStore}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-white hover:bg-white hover:text-black"
                    >
                      View in Store
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Total Uploads</p>
                    <p className="text-2xl font-bold text-white">0</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Supporters</p>
                    <p className="text-2xl font-bold text-white">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Upload Background</h3>
                <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Video Products</h3>
                  <VideoUploadModal onSuccess={onSuccess} />
                </div>
                <p className="text-gray-400 mb-4">Upload and manage your video content</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Total Video Products</p>
                      <p className="text-gray-400 text-sm">Manage your video library</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <PhotoGallery />
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <AudioProductManager />
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <VideoProductManager />
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <BulletinPostManager />
              </CardContent>
            </Card>
          </div>

          <MediaPlayers purchasedTracks={purchasedTracks} purchasedVideos={purchasedVideos} />
        </>
      )}

      {/* Restricted Access Message for Pending/Rejected Merchants */}
      {!isApproved && !isAdmin && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-4">Access Restricted</h3>
            <p className="text-gray-300 mb-4">
              Upload and posting features are restricted until your merchant application is approved.
            </p>
            <p className="text-gray-400 mb-6">
              Please complete your merchant profile for admin review.
            </p>
            <div className="flex flex-col items-center gap-2">
              <MerchantProfileModal onProfileUpdate={onSuccess}>
                  <Button>Complete Profile</Button>
              </MerchantProfileModal>
              <MerchantBenefitsModal />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantDashboard;
