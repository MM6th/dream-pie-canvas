
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Image } from "lucide-react";
import BulletinPostManager from "@/components/BulletinPostManager";
import PhotoGallery from "@/components/PhotoGallery";

const ContentManagement = () => {
  return (
    <div className="space-y-8">
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5" />
            Bulletin Post Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BulletinPostManager />
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Image className="w-5 h-5" />
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
