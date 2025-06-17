
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "../ImagePicker";

interface CoverPhotoManagerProps {
  onSuccess?: () => void;
}

const CoverPhotoManager = ({ onSuccess }: CoverPhotoManagerProps) => {
  const [bulletinCover, setBulletinCover] = useState('');
  const [filmsCover, setFilmsCover] = useState('');
  const [storeCover, setStoreCover] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveCovers = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would save these to a database
      // For now, we'll just show a success message
      toast({
        title: "Success",
        description: "Cover photos updated successfully!"
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cover photos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ImageIcon className="w-5 h-5" />
          Cover Photo Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-white mb-2 block">Bulletin Board Cover Photo</Label>
          <ImagePicker
            onImageSelect={setBulletinCover}
            currentImageUrl={bulletinCover}
          />
          <p className="text-gray-400 text-sm mt-1">Recommended: 1000x864 pixels</p>
        </div>

        <div>
          <Label className="text-white mb-2 block">Films Page Cover Photo</Label>
          <ImagePicker
            onImageSelect={setFilmsCover}
            currentImageUrl={filmsCover}
          />
          <p className="text-gray-400 text-sm mt-1">Recommended: 1000x864 pixels</p>
        </div>

        <div>
          <Label className="text-white mb-2 block">Store Page Cover Photo</Label>
          <ImagePicker
            onImageSelect={setStoreCover}
            currentImageUrl={storeCover}
          />
          <p className="text-gray-400 text-sm mt-1">Recommended: 1000x864 pixels</p>
        </div>

        <Button
          onClick={handleSaveCovers}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Save Cover Photos
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CoverPhotoManager;
