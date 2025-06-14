import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, Video, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface VideoUploadModalProps {
  onSuccess?: () => void;
  isAdmin: boolean;
}

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
}

const VideoUploadModal = ({ onSuccess, isAdmin }: VideoUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ownedTracks, setOwnedTracks] = useState<AudioTrack[]>([]);
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoType: "",
    isFree: true,
    price: "",
    videoFile: null as File | null,
    thumbnailUrl: "",
    backgroundMusicId: "",
  });

  const videoTypes = ["music", "dance", "influence", "model", "podcast"];
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB in bytes

  useEffect(() => {
    if (!isAdmin) return;
    if (open && user) {
      fetchOwnedTracks();
      checkStorageUsage();
    }
  }, [open, user, isAdmin]);

  if (!isAdmin) {
    const showComingSoonToast = () => {
      toast({
        title: "Feature Coming Soon",
        description: "Video uploads will be available for merchants shortly.",
      });
    };

    return (
      <Button className="bg-primary hover:bg-primary/90" onClick={showComingSoonToast}>
        <Upload className="w-4 h-4 mr-2" />
        Upload Video
      </Button>
    );
  }

  const checkStorageUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error checking storage usage:', error);
        return;
      }

      setStorageUsage(data || 0);
    } catch (error) {
      console.error('Error checking storage usage:', error);
    }
  };

  const fetchOwnedTracks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          audio_product_id,
          audio_products (
            id,
            title,
            artist_name,
            audio_file_url
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching owned tracks:', error);
        return;
      }

      const tracks = data
        ?.filter(purchase => purchase.audio_products)
        .map(purchase => purchase.audio_products as AudioTrack) || [];

      setOwnedTracks(tracks);
    } catch (error) {
      console.error('Error fetching owned tracks:', error);
    }
  };

  const validateFileSize = (file: File) => {
    if (file.size > MAX_VIDEO_SIZE) {
      toast({
        title: "File too large",
        description: "Video file must be smaller than 50MB",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFileSize(file)) {
      setFormData({ ...formData, videoFile: file });
    } else {
      e.target.value = '';
      setFormData({ ...formData, videoFile: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.videoFile || !formData.title || !formData.videoType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a video file",
        variant: "destructive"
      });
      return;
    }

    // Check storage limit
    const { data: canUpload, error: checkError } = await supabase.rpc('can_user_upload', {
      user_uuid: user.id,
      new_file_size: formData.videoFile.size
    });

    if (checkError || !canUpload) {
      toast({
        title: "Storage limit exceeded",
        description: "You've reached your 2GB storage limit. Please delete some files first.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload video file to new storage system
      const videoFileExt = formData.videoFile.name.split('.').pop();
      const videoFileName = `${user.id}/${Date.now()}.${videoFileExt}`;
      const { data: videoData, error: videoError } = await supabase.storage
        .from('user-media')
        .upload(videoFileName, formData.videoFile);

      if (videoError) throw videoError;

      const { data: { publicUrl: videoPublicUrl } } = supabase.storage
        .from('user-media')
        .getPublicUrl(videoData.path);

      // Record upload in database
      await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          file_name: formData.videoFile.name,
          file_path: videoData.path,
          file_size: formData.videoFile.size,
          file_type: formData.videoFile.type
        });

      // Get background music URL if selected
      let backgroundMusicUrl = null;
      if (formData.backgroundMusicId) {
        const selectedTrack = ownedTracks.find(track => track.id === formData.backgroundMusicId);
        if (selectedTrack) {
          backgroundMusicUrl = selectedTrack.audio_file_url;
        }
      }

      // Insert video product
      const { error: insertError } = await supabase
        .from('video_products')
        .insert({
          title: formData.title,
          description: formData.description,
          video_type: formData.videoType,
          video_file_url: videoPublicUrl,
          thumbnail_url: formData.thumbnailUrl || null,
          background_music_url: backgroundMusicUrl,
          merchant_id: user.id,
          is_free: formData.isFree,
          price: formData.isFree ? null : parseFloat(formData.price),
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Video uploaded successfully!"
      });

      setFormData({
        title: "",
        description: "",
        videoType: "",
        isFree: true,
        price: "",
        videoFile: null,
        thumbnailUrl: "",
        backgroundMusicId: "",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = (storageUsage / (2 * 1024 * 1024 * 1024)) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Upload className="w-4 h-4 mr-2" />
          Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Upload Video Content
          </DialogTitle>
        </DialogHeader>

        {/* Storage Usage */}
        <div className="bg-gray-700/50 p-3 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Storage Used</span>
            <span className="text-sm text-gray-300">
              {formatBytes(storageUsage)} / 2GB
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                storagePercentage > 90 ? 'bg-red-500' : 
                storagePercentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter video description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="videoType">Video Type *</Label>
            <Select value={formData.videoType} onValueChange={(value) => setFormData({ ...formData, videoType: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select video type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {videoTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-white hover:bg-gray-600">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="videoFile">Video File * (Max 50MB)</Label>
            <Input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Recommended formats: MP4, MOV, AVI. Maximum size: 50MB
            </p>
          </div>

          <div>
            <Label>Thumbnail (Optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="Thumbnail URL or select from gallery"
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
              <ImagePicker
                onImageSelect={(url) => setFormData({ ...formData, thumbnailUrl: url })}
                currentImageUrl={formData.thumbnailUrl}
              />
            </div>
          </div>

          {ownedTracks.length > 0 && (
            <div>
              <Label htmlFor="backgroundMusic" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Background Music (Optional)
              </Label>
              <Select value={formData.backgroundMusicId} onValueChange={(value) => setFormData({ ...formData, backgroundMusicId: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select from your owned music" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {ownedTracks.map((track) => (
                    <SelectItem key={track.id} value={track.id} className="text-white hover:bg-gray-600">
                      {track.title} {track.artist_name && `- ${track.artist_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                Select background music from tracks you own
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="isFree"
              checked={formData.isFree}
              onCheckedChange={(checked) => setFormData({ ...formData, isFree: checked })}
            />
            <Label htmlFor="isFree">Free Content</Label>
          </div>

          {!formData.isFree && (
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="0.00"
                required={!formData.isFree}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Uploading..." : "Upload Video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadModal;
