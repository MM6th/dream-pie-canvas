import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Eye, Calendar, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface ContentPickerProps {
  onContentSelect: (url: string, type: 'image' | 'video') => void;
  currentContentUrl?: string;
}

const ContentPicker = ({ onContentSelect, currentContentUrl }: ContentPickerProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUploads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', user.id)
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

  useEffect(() => {
    if (open && user) {
      fetchUploads();
    }
  }, [open, user]);

  const getContentUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isVideo = (fileType: string) => fileType.startsWith('video/');

  const handleContentSelect = (upload: UserUpload) => {
    const url = getContentUrl(upload.file_path);
    const type = isImage(upload.file_type) ? 'image' : 'video';
    onContentSelect(url, type);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-gray-600 text-white bg-gray-700 hover:bg-gray-600"
        >
          <Folder className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select from Content Gallery</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-gray-400">Loading your content...</p>
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-400">No content uploaded yet. Upload some content to your gallery first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {uploads.map((upload) => (
              <div 
                key={upload.id} 
                className="bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => handleContentSelect(upload)}
              >
                <div className="aspect-video relative">
                  {isImage(upload.file_type) ? (
                    <img
                      src={getContentUrl(upload.file_path)}
                      alt={upload.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : isVideo(upload.file_type) ? (
                    <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                      <Video className="w-8 h-8 text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                      <Eye className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/50 text-white text-xs">
                      {isImage(upload.file_type) ? 'IMG' : isVideo(upload.file_type) ? 'VID' : 'FILE'}
                    </Badge>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-white text-sm font-medium truncate">{upload.file_name}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatBytes(upload.file_size)}</span>
                    <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContentPicker;