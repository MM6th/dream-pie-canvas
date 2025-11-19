import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

interface VideoUploadProps {
  onVideoSelect: (url: string) => void;
  currentVideoUrl?: string;
}

const VideoUpload = ({ onVideoSelect, currentVideoUrl }: VideoUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please select a valid video file (MP4, WebM, MOV, AVI)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (1GB limit)
    const maxSize = 1024 * 1024 * 1024; // 1GB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Error", 
        description: "Video file must be smaller than 1GB",
        variant: "destructive"
      });
      return;
    }

    // Check user's remaining storage quota
    try {
      const { data: storageUsage } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: user.id
      });

      const currentUsage = storageUsage || 0;
      const maxStorage = 2 * 1024 * 1024 * 1024; // 2GB
      
      if (currentUsage + file.size > maxStorage) {
        toast({
          title: "Storage Limit Exceeded",
          description: "This video would exceed your 2GB storage limit. Please delete some content first.",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('Error checking storage:', error);
    }

    setUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      // Use resumable upload for files larger than 50MB
      if (file.size > 50 * 1024 * 1024) {
        console.log('Using resumable upload for large file');
        
        // Upload using resumable upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
      } else {
        // Standard upload for smaller files
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
      }

      // Record in user_uploads table
      const { error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          storage_bucket: 'user-media'
        });

      if (dbError) throw dbError;

      // Get public URL
      const { data } = supabase.storage
        .from('user-media')
        .getPublicUrl(fileName);

      onVideoSelect(data.publicUrl);

      toast({
        title: "Success",
        description: "Video uploaded successfully!"
      });

    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload video. Files larger than 50MB may not be supported by storage.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
        onChange={handleFileUpload}
        className="hidden"
        id="video-upload"
        disabled={uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        asChild
        disabled={uploading}
        className="border-gray-600 text-white bg-gray-700 hover:bg-gray-600"
      >
        <label htmlFor="video-upload" className="cursor-pointer">
          {uploading ? (
            <Upload className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4" />
          )}
        </label>
      </Button>
    </div>
  );
};

export default VideoUpload;