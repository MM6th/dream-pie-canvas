
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, Upload, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PhotoUpload from "./PhotoUpload";

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

interface ImagePickerProps {
  onImageSelect: (url: string) => void;
  currentImageUrl?: string;
  trigger?: React.ReactNode;
}

const ImagePicker = ({ onImageSelect, currentImageUrl, trigger }: ImagePickerProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(currentImageUrl || "");
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUploads();
    }
  }, [open, user]);

  useEffect(() => {
    setSelectedImageUrl(currentImageUrl || "");
  }, [currentImageUrl]);

  const fetchUploads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('id, file_name, file_path, file_type')
        .eq('user_id', user.id)
        .like('file_type', 'image%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching uploads:', error);
        return;
      }

      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleImageSelect = (url: string) => {
    setSelectedImageUrl(url);
    onImageSelect(url);
    setOpen(false);
  };

  const handleCustomUrlSubmit = () => {
    if (selectedImageUrl.trim()) {
      onImageSelect(selectedImageUrl.trim());
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-gray-600 text-white bg-gray-700 hover:bg-gray-600 hover:text-white">
            <Image className="w-4 h-4 mr-2" />
            Select Image
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Toggle between gallery and custom URL */}
          <div className="flex gap-2">
            <Button
              variant={!useCustomUrl ? "default" : "outline"}
              onClick={() => setUseCustomUrl(false)}
              className="flex-1"
            >
              <Image className="w-4 h-4 mr-2" />
              My Gallery
            </Button>
            <Button
              variant={useCustomUrl ? "default" : "outline"}
              onClick={() => setUseCustomUrl(true)}
              className="flex-1 text-white hover:text-white"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Custom URL
            </Button>
          </div>

          {useCustomUrl ? (
            /* Custom URL Input */
            <div className="space-y-3">
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={selectedImageUrl}
                  onChange={(e) => setSelectedImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button 
                onClick={handleCustomUrlSubmit}
                disabled={!selectedImageUrl.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Use This URL
              </Button>
            </div>
          ) : (
            /* Gallery View */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium">Your Photos</h4>
                <PhotoUpload 
                  onSuccess={fetchUploads}
                  trigger={
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Upload className="w-4 h-4 mr-1" />
                      Upload New
                    </Button>
                  }
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading your photos...</p>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No photos in your gallery yet.</p>
                  <PhotoUpload onSuccess={fetchUploads} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {uploads.map((upload) => {
                    const imageUrl = getImageUrl(upload.file_path);
                    return (
                      <div
                        key={upload.id}
                        className="relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 transition-colors"
                        onClick={() => handleImageSelect(imageUrl)}
                      >
                        <img
                          src={imageUrl}
                          alt={upload.file_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 right-1">
                          <p className="text-xs text-white bg-black/50 px-2 py-1 rounded truncate">
                            {upload.file_name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePicker;
