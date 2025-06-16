
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import PhotoGallery from "@/components/PhotoGallery";
import AudioProductManager from "@/components/AudioProductManager";
import VideoProductManager from "@/components/VideoProductManager";
import BulletinPostManager from "@/components/BulletinPostManager";
import SongCoverManager from "@/components/SongCoverManager";

const ContentManagement = () => {
  return (
    <>
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
            <SongCoverManager />
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
    </>
  );
};

export default ContentManagement;
