import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Mic, Upload, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

interface PodcastVideoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type VideoCategory = 'general' | 'podcast';

const PodcastVideoUploadModal = ({ open, onOpenChange, onSuccess }: PodcastVideoUploadModalProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.is_admin || false);
      }
    };
    checkAdminStatus();
  }, [user]);

  const handleCategorySelect = (category: VideoCategory) => {
    setSelectedCategory(category);
    // Trigger file input click
    const fileInput = document.getElementById('podcast-video-upload-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !selectedCategory) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please select a valid video file (MP4, WebM, MOV, AVI)",
        variant: "destructive"
      });
      resetModal();
      return;
    }

    // For non-admins, validate file size and check storage quota
    if (!isAdmin) {
      const maxSize = 1024 * 1024 * 1024; // 1GB
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: "Video file must be smaller than 1GB",
          variant: "destructive"
        });
        resetModal();
        return;
      }

      try {
        const { data: canUpload, error: checkError } = await supabase.rpc('can_user_upload', {
          user_uuid: user.id,
          new_file_size: file.size
        });

        if (checkError || !canUpload) {
          const { data: maxStorage } = await supabase.rpc('get_user_max_storage', { user_uuid: user.id });
          const maxStorageGB = Math.round((maxStorage || 2147483648) / (1024 * 1024 * 1024));
          toast({
            title: "Storage Limit Exceeded",
            description: `This video would exceed your ${maxStorageGB}GB storage limit. Please delete some content first.`,
            variant: "destructive"
          });
          resetModal();
          return;
        }
      } catch (error) {
        console.error('Error checking storage:', error);
      }
    }

    setUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Record in user_uploads table with content_category
      const { error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          storage_bucket: 'user-media',
          content_category: selectedCategory
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: selectedCategory === 'podcast' 
          ? "Podcast video uploaded successfully!" 
          : "Video uploaded successfully!"
      });

      onSuccess();
      resetModal();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload video.",
        variant: "destructive"
      });
      resetModal();
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedCategory(null);
    const fileInput = document.getElementById('podcast-video-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetModal();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload Video</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose what type of video you're uploading
          </DialogDescription>
        </DialogHeader>

        <Input
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          onChange={handleFileUpload}
          className="hidden"
          id="podcast-video-upload-input"
          disabled={uploading}
        />

        <div className="space-y-4 py-4">
          <Button
            onClick={() => handleCategorySelect('general')}
            disabled={uploading}
            variant="outline"
            className="w-full h-auto py-4 flex items-start gap-4 bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
          >
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <FolderOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-white">General Video</h3>
              <p className="text-sm text-gray-400 mt-1">
                For portfolios and general content
              </p>
            </div>
          </Button>

          <Button
            onClick={() => handleCategorySelect('podcast')}
            disabled={uploading}
            variant="outline"
            className="w-full h-auto py-4 flex items-start gap-4 bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
          >
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Mic className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-white">Podcast Video</h3>
              <p className="text-sm text-gray-400 mt-1">
                Will appear in your Podcasts section on your profile
              </p>
            </div>
          </Button>

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-2">
              <Upload className="w-4 h-4 animate-spin" />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PodcastVideoUploadModal;
