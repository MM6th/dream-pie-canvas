
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Music, Video, Palette, Sparkles } from "lucide-react";
import AudioProductManager from "@/components/AudioProductManager";
import VideoProductManager from "@/components/VideoProductManager";
import FashionProductManager from "@/components/FashionProductManager";
import AstrologyProductManager from "@/components/AstrologyProductManager";
import BulletinPostManager from "@/components/BulletinPostManager";
import PhotoGallery from "@/components/PhotoGallery";

interface ContentManagementProps {
  onSuccess?: () => void;
}

const ContentManagement = ({ onSuccess }: ContentManagementProps) => {
  return (
    <div className="space-y-8">
      {/* Audio Products Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-400" />
            Audio Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AudioProductManager />
        </CardContent>
      </Card>

      {/* Video Products Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-green-400" />
            Video Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VideoProductManager />
        </CardContent>
      </Card>

      {/* Fashion Products Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-400" />
            Fashion Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FashionProductManager />
        </CardContent>
      </Card>

      {/* Astrology Products Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Astrology Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AstrologyProductManager />
        </CardContent>
      </Card>

      {/* Bulletin Post Management */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-yellow-400" />
            Bulletin Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BulletinPostManager />
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-400" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGallery />
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentManagement;
