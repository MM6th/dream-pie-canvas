
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Video, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface VideoProduct {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  thumbnail_url: string | null;
  video_file_url: string;
  background_music_url: string | null;
  is_free: boolean;
  price: number | null;
}

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
}

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: VideoProduct;
}

const EditVideoModal = ({ isOpen, onClose, onSuccess, product }: EditVideoModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ownedTracks, setOwnedTracks] = useState<AudioTrack[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoType: "",
    isFree: true,
    price: "",
    thumbnailUrl: "",
    backgroundMusicId: "",
  });

  const videoTypes = ["music", "dance", "influence", "model", "podcast"];

  useEffect(() => {
    if (isOpen && product) {
      // Initialize form with product data
      setFormData({
        title: product.title,
        description: product.description || "",
        videoType: product.video_type,
        isFree: product.is_free,
        price: product.price?.toString() || "",
        thumbnailUrl: product.thumbnail_url || "",
        backgroundMusicId: "",
      });
      
      fetchOwnedTracks();
    }
  }, [isOpen, product]);

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
      
      // Set background music if it exists
      if (product.background_music_url) {
        const matchingTrack = tracks.find(track => track.audio_file_url === product.background_music_url);
        if (matchingTrack) {
          setFormData(prev => ({ ...prev, backgroundMusicId: matchingTrack.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching owned tracks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title || !formData.videoType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get background music URL if selected
      let backgroundMusicUrl = null;
      if (formData.backgroundMusicId) {
        const selectedTrack = ownedTracks.find(track => track.id === formData.backgroundMusicId);
        if (selectedTrack) {
          backgroundMusicUrl = selectedTrack.audio_file_url;
        }
      }

      // Update video product
      const { error: updateError } = await supabase
        .from('video_products')
        .update({
          title: formData.title,
          description: formData.description,
          video_type: formData.videoType,
          thumbnail_url: formData.thumbnailUrl || null,
          background_music_url: backgroundMusicUrl,
          is_free: formData.isFree,
          price: formData.isFree ? null : parseFloat(formData.price),
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Video product updated successfully!"
      });

      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update video",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Edit Video Product
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
              <Select value={formData.backgroundMusicId || "none"} onValueChange={(value) => setFormData({ ...formData, backgroundMusicId: value === "none" ? "" : value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select from your owned music" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="none" className="text-white hover:bg-gray-600">
                    No background music
                  </SelectItem>
                  {ownedTracks.map((track) => (
                    <SelectItem key={track.id} value={track.id} className="text-white hover:bg-gray-600">
                      {track.title} {track.artist_name && `- ${track.artist_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={onClose} 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Updating..." : "Update Video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVideoModal;
