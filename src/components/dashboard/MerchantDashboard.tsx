
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackgroundUpload from "@/components/BackgroundUpload";
import AudioUploadModal from "@/components/AudioUploadModal";
import VideoUploadModal from "@/components/VideoUploadModal";
import AudioProductManager from "@/components/AudioProductManager";
import VideoProductManager from "@/components/VideoProductManager";
import BulletinPostManager from "@/components/BulletinPostManager";
import MediaPlayers from "./MediaPlayers";

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
  return (
    <div className="p-6 pt-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h1>
        <p className="text-gray-300">Manage your media content and connect with supporters</p>
      </div>
      
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
    </div>
  );
};

export default MerchantDashboard;
