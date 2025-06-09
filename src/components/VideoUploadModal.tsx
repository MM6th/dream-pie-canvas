
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface VideoUploadModalProps {
  onSuccess?: () => void;
}

const VideoUploadModal = ({ onSuccess }: VideoUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoType: "",
    isFree: true,
    price: "",
    videoFile: null as File | null,
    thumbnailFile: null as File | null,
  });

  const videoTypes = ["music", "dance", "influence", "model", "podcast"];

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

    setLoading(true);
    try {
      // Upload video file
      const videoFileExt = formData.videoFile.name.split('.').pop();
      const videoFileName = `${Date.now()}.${videoFileExt}`;
      const { data: videoData, error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, formData.videoFile);

      if (videoError) throw videoError;

      let thumbnailUrl = null;
      if (formData.thumbnailFile) {
        const thumbnailFileExt = formData.thumbnailFile.name.split('.').pop();
        const thumbnailFileName = `${Date.now()}_thumb.${thumbnailFileExt}`;
        const { data: thumbnailData, error: thumbnailError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, formData.thumbnailFile);

        if (thumbnailError) throw thumbnailError;

        const { data: { publicUrl: thumbnailPublicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbnailData.path);
        thumbnailUrl = thumbnailPublicUrl;
      }

      const { data: { publicUrl: videoPublicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(videoData.path);

      // Insert video product
      const { error: insertError } = await supabase
        .from('video_products')
        .insert({
          title: formData.title,
          description: formData.description,
          video_type: formData.videoType,
          video_file_url: videoPublicUrl,
          thumbnail_url: thumbnailUrl,
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
        thumbnailFile: null,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Upload className="w-4 h-4 mr-2" />
          Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Upload Video Content
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
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
            <Label htmlFor="videoFile">Video File *</Label>
            <Input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={(e) => setFormData({ ...formData, videoFile: e.target.files?.[0] || null })}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="thumbnailFile">Thumbnail (Optional)</Label>
            <Input
              id="thumbnailFile"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, thumbnailFile: e.target.files?.[0] || null })}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

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
                required={!formData.isFree}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Uploading..." : "Upload Video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadModal;
