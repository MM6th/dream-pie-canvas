
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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

interface MerchantDashboardProps {
  onSuccess: () => void;
  onViewStore: () => void;
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: any[];
  purchasedVideos: any[];
}

const MerchantDashboard = ({ 
  onSuccess, 
  onViewStore, 
  onBackgroundUpload, 
  purchasedTracks,
  purchasedVideos
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
            <p className="text-gray-400">
              Please wait for admin approval to access all merchant features.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantDashboard;
