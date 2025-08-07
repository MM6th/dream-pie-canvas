
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Music, Image } from "lucide-react";
import ImagePicker from "@/components/ImagePicker";

interface VideoAdOpportunity {
  id: string;
  title: string;
  description: string | null;
  audio_file_url: string;
  payment_amount: number;
  target_platform: string;
  audio_type: string;
  available_spots: number;
  access_level: string;
  is_adult_content: boolean;
  thumbnail_url?: string | null;
  artist_name?: string | null;
}

interface EditVideoAdOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: VideoAdOpportunity | null;
  onSuccess: () => void;
}

const EditVideoAdOpportunityModal = ({ isOpen, onClose, opportunity, onSuccess }: EditVideoAdOpportunityModalProps) => {
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
const [formData, setFormData] = useState({
  title: '',
  description: '',
  artist_name: '',
  payment_amount: 0,
  target_platform: 'instagram' as const,
  audio_type: 'music' as const,
  available_spots: 1,
  access_level: 'public' as const,
  is_adult_content: false,
});

  const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    if (opportunity) {
setFormData({
  title: opportunity.title,
  description: opportunity.description || '',
  artist_name: (opportunity as any).artist_name || '',
  payment_amount: opportunity.payment_amount,
  target_platform: opportunity.target_platform as any,
  audio_type: opportunity.audio_type as any,
  available_spots: opportunity.available_spots,
  access_level: opportunity.access_level as any,
  is_adult_content: opportunity.is_adult_content,
});
setThumbnailUrl(opportunity.thumbnail_url || '');
    }
  }, [opportunity]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;

    setLoading(true);
    try {
      let audioFileUrl = opportunity.audio_file_url;
      let finalThumbnailUrl = thumbnailUrl;

      // Upload new audio file if selected
      if (audioFile) {
        const audioFileExt = audioFile.name.split('.').pop();
        const audioFileName = `video-ad-opportunities/${opportunity.id}/${Date.now()}.${audioFileExt}`;
        
        const { data: audioData, error: audioError } = await supabase.storage
          .from('audio-files')
          .upload(audioFileName, audioFile);

        if (audioError) throw audioError;

        const { data: { publicUrl: audioPublicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(audioData.path);

        audioFileUrl = audioPublicUrl;
      }

const { error } = await supabase
  .from('video_ad_opportunities')
  .update({
    title: formData.title,
    description: formData.description || null,
    artist_name: formData.artist_name || null,
    payment_amount: formData.payment_amount,
    target_platform: formData.target_platform,
    audio_type: formData.audio_type,
    available_spots: formData.available_spots,
    access_level: formData.access_level,
    is_adult_content: formData.is_adult_content,
    audio_file_url: audioFileUrl,
    thumbnail_url: finalThumbnailUrl || null,
    updated_at: new Date().toISOString()
  })
  .eq('id', opportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video ad opportunity updated successfully!"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating opportunity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update opportunity",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Edit Video Ad Opportunity
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title" className="text-white">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

<div>
  <Label htmlFor="description" className="text-white">Description</Label>
  <Textarea
    id="description"
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    className="bg-gray-700 border-gray-600 text-white"
    rows={3}
  />
</div>

<div>
  <Label htmlFor="artist_name" className="text-white">Artist name (optional)</Label>
  <Input
    id="artist_name"
    value={formData.artist_name}
    onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
    className="bg-gray-700 border-gray-600 text-white"
    placeholder="Enter the artist's name"
  />
</div>

          <div>
            <Label htmlFor="audioFile" className="flex items-center gap-2 text-white">
              <Music className="w-4 h-4" />
              Update Audio File (Optional, Max 50MB)
            </Label>
            <Input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty to keep current audio file. Upload a new file to replace it.
            </p>
            {opportunity?.audio_file_url && (
              <div className="mt-2">
                <a
                  href={opportunity.audio_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  <Music className="w-4 h-4" />
                  Current Audio File
                </a>
              </div>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-2 text-white mb-2">
              <Image className="w-4 h-4" />
              Thumbnail Image (Optional)
            </Label>
            <ImagePicker
              onImageSelect={setThumbnailUrl}
              currentImageUrl={thumbnailUrl}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600 text-white bg-gray-700 hover:bg-gray-600"
                >
                  <Image className="w-4 h-4 mr-2" />
                  {thumbnailUrl ? 'Change Thumbnail' : 'Select Thumbnail'}
                </Button>
              }
            />
            {thumbnailUrl && (
              <div className="mt-2">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-20 h-20 object-cover rounded border border-gray-600"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_amount" className="text-white">Payment Amount ($) *</Label>
              <Input
                id="payment_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: parseFloat(e.target.value) || 0 })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="available_spots" className="text-white">Available Spots *</Label>
              <Input
                id="available_spots"
                type="number"
                min="1"
                value={formData.available_spots}
                onChange={(e) => setFormData({ ...formData, available_spots: parseInt(e.target.value) || 1 })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Target Platform *</Label>
              <Select 
                value={formData.target_platform} 
                onValueChange={(value: any) => setFormData({ ...formData, target_platform: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Audio Type *</Label>
              <Select 
                value={formData.audio_type} 
                onValueChange={(value: any) => setFormData({ ...formData, audio_type: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select audio type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="voice_over">Voice Over</SelectItem>
                  <SelectItem value="sound_effect">Sound Effect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white">Access Level *</Label>
            <Select 
              value={formData.access_level} 
              onValueChange={(value: any) => setFormData({ ...formData, access_level: value })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="merchant_only">Merchants Only</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_adult_content"
              checked={formData.is_adult_content}
              onCheckedChange={(checked) => setFormData({ ...formData, is_adult_content: checked })}
            />
            <Label htmlFor="is_adult_content" className="text-white">
              Adult Content
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Opportunity
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVideoAdOpportunityModal;
