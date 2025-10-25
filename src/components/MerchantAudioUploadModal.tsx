import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface MerchantAudioUploadModalProps {
  onSuccess: () => void;
}

const MerchantAudioUploadModal = ({ onSuccess }: MerchantAudioUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    thumbnail: null as File | null,
    audioFile: null as File | null,
    albumName: "",
    hasAlbum: false,
    previewStartTime: 0
  });
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [albums, setAlbums] = useState<any[]>([]);

  const MAX_AUDIO_SIZE = 200 * 1024 * 1024; // 200MB
  const MAX_THUMBNAIL_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFileSize = (file: File, type: 'audio' | 'thumbnail') => {
    const maxSize = type === 'audio' ? MAX_AUDIO_SIZE : MAX_THUMBNAIL_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      toast({
        title: "File too large",
        description: `${type === 'audio' ? 'Audio' : 'Thumbnail'} file must be smaller than ${maxSizeMB}MB`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, 'audio')) {
      setFormData(prev => ({ ...prev, audioFile: file }));
      
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
    } else {
      e.target.value = '';
      setFormData(prev => ({ ...prev, audioFile: null }));
      setAudioDuration(0);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, 'thumbnail')) {
      setFormData(prev => ({ ...prev, thumbnail: file }));
    } else {
      e.target.value = '';
      setFormData(prev => ({ ...prev, thumbnail: null }));
    }
  };

  const fetchAlbums = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('merchant_id', user.id);
      
      if (error) throw error;
      setAlbums(data || []);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchAlbums();
    }
  }, [open]);

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title || !formData.artistName || !formData.audioFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const audioUrl = await uploadFile(formData.audioFile, 'audio-files', `${user.id}/`);
      
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(formData.thumbnail, 'thumbnails', `${user.id}/`);
      }
      
      let albumId = null;
      if (formData.hasAlbum && formData.albumName) {
        const existingAlbum = albums.find(album => 
          album.name.toLowerCase() === formData.albumName.toLowerCase()
        );
        
        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
          const { data: newAlbum, error: albumError } = await supabase
            .from('albums')
            .insert({
              merchant_id: user.id,
              name: formData.albumName
            })
            .select()
            .single();
          
          if (albumError) throw albumError;
          albumId = newAlbum.id;
        }
      }

      const { error: productError } = await supabase
        .from('audio_products')
        .insert({
          merchant_id: user.id,
          title: formData.title,
          artist_name: formData.artistName,
          audio_type: 'music',
          thumbnail_url: thumbnailUrl,
          audio_file_url: audioUrl,
          album_id: albumId,
          access_level: 'public',
          is_free: true,
          is_adult_content: false,
          preview_start_time: formData.previewStartTime,
          preview_duration: 30
        });
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: "Music track uploaded successfully!"
      });
      
      setOpen(false);
      setFormData({
        title: "",
        artistName: "",
        thumbnail: null,
        audioFile: null,
        albumName: "",
        hasAlbum: false,
        previewStartTime: 0
      });
      onSuccess();
      
    } catch (error: any) {
      console.error('Error uploading music:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload music",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Upload Music
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Upload Music Track</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Track Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Enter track title"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artistName" className="text-white">Artist Name *</Label>
            <Input
              id="artistName"
              value={formData.artistName}
              onChange={(e) => setFormData({...formData, artistName: e.target.value})}
              placeholder="Enter artist name"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail" className="text-white">Thumbnail Image (Optional)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audioFile" className="text-white">Audio File *</Label>
            <div className="flex items-center gap-4">
              <Input
                id="audioFile"
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          {formData.audioFile && audioDuration > 0 && (
            <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
              <div>
                <Label className="text-white">
                  Preview Start Time: {formData.previewStartTime.toFixed(1)}s 
                  <span className="text-gray-400 text-sm ml-2">
                    (30 second preview will start from this point)
                  </span>
                </Label>
              </div>
              <Slider
                value={[formData.previewStartTime]}
                onValueChange={(value) => setFormData({...formData, previewStartTime: value[0]})}
                max={Math.max(0, audioDuration - 30)}
                step={0.1}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasAlbum"
                checked={formData.hasAlbum}
                onChange={(e) => setFormData({...formData, hasAlbum: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="hasAlbum" className="text-white cursor-pointer">Add to Album</Label>
            </div>
            {formData.hasAlbum && (
              <Input
                value={formData.albumName}
                onChange={(e) => setFormData({...formData, albumName: e.target.value})}
                placeholder="Enter album name"
                className="bg-gray-800 border-gray-700 text-white"
              />
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black text-white hover:bg-gray-800"
            >
              {loading ? "Uploading..." : "Upload Track"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantAudioUploadModal;
