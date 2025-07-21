
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2, Shield, Video, Music, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface VideoAdOpportunityUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const audioTypes = [
  { value: 'music', label: 'Music' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'asmr', label: 'ASMR' },
  { value: 'spoken', label: 'Spoken Word' }
];

const socialPlatforms = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'onlyfans', label: 'OnlyFans' }
];

const accessLevels = [
  { value: 'public', label: 'Free' },
  { value: 'merchant_only', label: 'Merchant Only' },
  { value: 'paid', label: 'For Sale' }
];

const VideoAdOpportunityUploadModal = ({ isOpen, onClose, onSuccess }: VideoAdOpportunityUploadModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_type: '',
    target_platform: '',
    payment_amount: '',
    available_spots: '1',
    access_level: 'public',
    is_adult_content: false
  });

  const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFileSize = (file: File, maxSize: number, fileType: string) => {
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `${fileType} file must be smaller than ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, MAX_AUDIO_SIZE, "Audio")) {
      setAudioFile(file);
    } else {
      e.target.value = '';
      setAudioFile(null);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, MAX_IMAGE_SIZE, "Image")) {
      setThumbnailFile(file);
    } else {
      e.target.value = '';
      setThumbnailFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !audioFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select an audio file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload audio file
      const audioFileExt = audioFile.name.split('.').pop();
      const audioFileName = `video-ad-opportunities/${user.id}/${Date.now()}.${audioFileExt}`;
      
      const { data: audioData, error: audioError } = await supabase.storage
        .from('audio-files')
        .upload(audioFileName, audioFile);

      if (audioError) throw audioError;

      const { data: { publicUrl: audioPublicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(audioData.path);

      // Upload thumbnail if provided
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbnailExt = thumbnailFile.name.split('.').pop();
        const thumbnailFileName = `video-ad-opportunities/${user.id}/${Date.now()}.${thumbnailExt}`;
        
        const { data: thumbnailData, error: thumbnailError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, thumbnailFile);

        if (thumbnailError) throw thumbnailError;

        const { data: { publicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbnailData.path);
        
        thumbnailUrl = publicUrl;
      }

      // Create video ad opportunity
      const { error: insertError } = await supabase
        .from('video_ad_opportunities')
        .insert({
          admin_id: user.id,
          title: formData.title,
          description: formData.description,
          audio_file_url: audioPublicUrl,
          audio_type: formData.audio_type as any,
          target_platform: formData.target_platform as any,
          payment_amount: parseFloat(formData.payment_amount),
          available_spots: parseInt(formData.available_spots),
          access_level: formData.access_level as any,
          is_adult_content: formData.is_adult_content,
          thumbnail_url: thumbnailUrl || null
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Video Ad Opportunity created successfully!"
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating video ad opportunity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create video ad opportunity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      audio_type: '',
      target_platform: '',
      payment_amount: '',
      available_spots: '1',
      access_level: 'public',
      is_adult_content: false
    });
    setAudioFile(null);
    setThumbnailFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Create Video Ad Opportunity
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
              placeholder="Enter opportunity title"
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
              placeholder="Describe the video ad opportunity"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="audioFile" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Audio File * (Max 50MB)
            </Label>
            <Input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              This audio will be downloadable by merchants to create their video submissions
            </p>
          </div>

          <div>
            <Label htmlFor="thumbnailFile">Thumbnail Image (Optional, Max 10MB)</Label>
            <Input
              id="thumbnailFile"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Upload a thumbnail image for the opportunity
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="audio_type">Audio Type *</Label>
              <Select value={formData.audio_type} onValueChange={(value) => setFormData({ ...formData, audio_type: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select audio type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {audioTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-600">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target_platform">Target Platform *</Label>
              <Select value={formData.target_platform} onValueChange={(value) => setFormData({ ...formData, target_platform: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {socialPlatforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value} className="text-white hover:bg-gray-600">
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Amount *
              </Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="available_spots">Available Opportunities *</Label>
              <Input
                id="available_spots"
                type="number"
                min="1"
                value={formData.available_spots}
                onChange={(e) => setFormData({ ...formData, available_spots: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="access_level">Access Level *</Label>
            <Select value={formData.access_level} onValueChange={(value) => setFormData({ ...formData, access_level: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {accessLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value} className="text-white hover:bg-gray-600">
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Adult Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_content" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if the opportunity involves adult or mature themes (18+)
                </p>
              </div>
            </div>
            <Switch
              id="adult_content"
              checked={formData.is_adult_content}
              onCheckedChange={(checked) => setFormData({ ...formData, is_adult_content: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.audio_type || !formData.target_platform || !formData.payment_amount || !audioFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Opportunity
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAdOpportunityUploadModal;
