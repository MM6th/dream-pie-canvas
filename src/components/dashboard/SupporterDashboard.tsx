
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import BackgroundUpload from "@/components/BackgroundUpload";
import PhotoGallery from "@/components/PhotoGallery";
import MediaPlayers from "./MediaPlayers";

interface SupporterDashboardProps {
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: any[];
  purchasedVideos: any[];
}

const SupporterDashboard = ({ onBackgroundUpload, purchasedTracks, purchasedVideos }: SupporterDashboardProps) => {
  return (
    <div className="p-6 pt-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Supporter Dashboard</h1>
        <p className="text-gray-300">Discover and enjoy amazing content from creators</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Customize Background</h3>
            <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">My Library</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Audio Tracks</p>
                <p className="text-2xl font-bold text-white">{purchasedTracks.length}</p>
              </div>
              <div>
                <p className="text-gray-400">Videos</p>
                <p className="text-2xl font-bold text-white">{purchasedVideos.length}</p>
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

      <MediaPlayers purchasedTracks={purchasedTracks} purchasedVideos={purchasedVideos} />
    </div>
  );
};

export default SupporterDashboard;
