import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, AudioLines, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AudioUploadModalProps {
  onSuccess: () => void;
}

const AudioUploadModal = ({ onSuccess }: AudioUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    audioType: "",
    description: "",
    thumbnail: null as File | null,
    audioFile: null as File | null,
    albumName: "",
    hasAlbum: false,
    accessLevel: "public" as "public" | "merchant_only" | "paid",
    price: "",
    pieVideoPrice: "",
    youtubeMembershipFee: "",
    maxDownloads: "",
    is_adult_content: false
  });
  const [albums, setAlbums] = useState<any[]>([]);

  const MAX_AUDIO_SIZE = 200 * 1024 * 1024; // 200MB for audio files
  const MAX_THUMBNAIL_SIZE = 50 * 1024 * 1024; // 50MB for thumbnails

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
    } else {
      e.target.value = '';
      setFormData(prev => ({ ...prev, audioFile: null }));
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
    
    if (!formData.title || !formData.audioType || !formData.audioFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload audio file
      const audioUrl = await uploadFile(
        formData.audioFile, 
        'audio-files', 
        `${user.id}/`
      );
      
      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(
          formData.thumbnail, 
          'thumbnails', 
          `${user.id}/`
        );
      }
      
      // Handle album creation/selection
      let albumId = null;
      if (formData.hasAlbum && formData.albumName) {
        // Check if album exists
        const existingAlbum = albums.find(album => 
          album.name.toLowerCase() === formData.albumName.toLowerCase()
        );
        
        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
          // Create new album
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
      
      // Create audio product with new fields including podcast-specific ones
      const insertData: any = {
        merchant_id: user.id,
        title: formData.title,
        artist_name: formData.artistName || null,
        audio_type: formData.audioType,
        thumbnail_url: thumbnailUrl,
        audio_file_url: audioUrl,
        album_id: albumId,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        pie_video_price: formData.audioType === 'podcast' && formData.pieVideoPrice ? parseFloat(formData.pieVideoPrice) : null,
        youtube_membership_fee: formData.audioType === 'podcast' && formData.youtubeMembershipFee ? parseFloat(formData.youtubeMembershipFee) : null,
        podcast_contract_generated: false,
        max_downloads: formData.accessLevel === 'merchant_only' && formData.maxDownloads ? parseInt(formData.maxDownloads) : null,
        is_adult_content: formData.is_adult_content
      };

      // Add description for podcasts if provided
      if (formData.audioType === 'podcast' && formData.description) {
        insertData.description = formData.description;
      }

      const { error: productError } = await supabase
        .from('audio_products')
        .insert(insertData);
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: "Audio product uploaded successfully!"
      });
      
      setOpen(false);
      setFormData({
        title: "",
        artistName: "",
        audioType: "",
        description: "",
        thumbnail: null,
        audioFile: null,
        albumName: "",
        hasAlbum: false,
        accessLevel: "public",
        price: "",
        pieVideoPrice: "",
        youtubeMembershipFee: "",
        maxDownloads: "",
        is_adult_content: false
      });
      onSuccess();
      
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchAlbums();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Upload className="w-4 h-4 mr-2" />
          Upload Audio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AudioLines className="w-5 h-5" />
            Upload Audio Content
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter audio title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="artistName">Artist Name</Label>
            <Input
              id="artistName"
              value={formData.artistName}
              onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter artist name"
            />
          </div>

          {/* Description field for podcasts */}
          {formData.audioType === 'podcast' && (
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 min-h-[80px] resize-y"
                placeholder="Describe the podcast opportunity, requirements, and what merchants should know"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">
                Explain the podcast opportunity for merchants to understand before downloading
              </p>
            </div>
          )}
          
          <div>
            <Label htmlFor="audioType">Audio Type *</Label>
            <Select 
              value={formData.audioType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, audioType: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select audio type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="music" className="text-white hover:bg-gray-600">Music</SelectItem>
                <SelectItem value="podcast" className="text-white hover:bg-gray-600">Podcast</SelectItem>
                <SelectItem value="film" className="text-white hover:bg-gray-600">Film</SelectItem>
                <SelectItem value="video" className="text-white hover:bg-gray-600">Video</SelectItem>
                <SelectItem value="spoken" className="text-white hover:bg-gray-600">Spoken</SelectItem>
                <SelectItem value="asmr" className="text-white hover:bg-gray-600">ASMR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="audioFile">Audio File * (Max 200MB)</Label>
            <Input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Recommended formats: MP3, WAV, M4A. Max size: 200MB
            </p>
          </div>
          
          <div>
            <Label htmlFor="thumbnail">Thumbnail Image (Optional, Max 50MB)</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Recommended formats: JPG, PNG. Max size: 50MB
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="hasAlbum"
              checked={formData.hasAlbum}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                hasAlbum: checked as boolean 
              }))}
            />
            <Label htmlFor="hasAlbum">Part of an album/collection</Label>
          </div>
          
          {formData.hasAlbum && (
            <div>
              <Label htmlFor="albumName">Album/Collection Name</Label>
              <Input
                id="albumName"
                value={formData.albumName}
                onChange={(e) => setFormData(prev => ({ ...prev, albumName: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter album name"
              />
            </div>
          )}
          
          <div>
            <Label>Access Level *</Label>
            <RadioGroup
              value={formData.accessLevel}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                accessLevel: value as "public" | "merchant_only" | "paid"
              }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" className="text-white" />
                <Label htmlFor="public" className="text-white">Free for Everyone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merchant_only" id="merchant_only" className="text-white" />
                <Label htmlFor="merchant_only" className="text-white">Merchant Download Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" className="text-white" />
                <Label htmlFor="paid" className="text-white">Paid Content</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-gray-400 mt-1">
              Merchant-only content is visible to all but only downloadable by other merchants
            </p>
          </div>
          
          {formData.accessLevel === 'paid' && (
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="0.00"
              />
            </div>
          )}

           {/* Merchant-only specific fields */}
           {formData.accessLevel === 'merchant_only' && (
             <div className="space-y-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
               <h4 className="text-white font-medium">Download Opportunities Settings</h4>
               
               <div>
                 <Label htmlFor="maxDownloads">Number of Download Opportunities</Label>
                 <Input
                   id="maxDownloads"
                   type="number"
                   min="1"
                   value={formData.maxDownloads}
                   onChange={(e) => setFormData(prev => ({ ...prev, maxDownloads: e.target.value }))}
                   className="bg-gray-700 border-gray-600 text-white"
                   placeholder="e.g., 5 (Leave empty for unlimited)"
                 />
                 <p className="text-xs text-gray-400 mt-1">
                   First come, first serve. Once exhausted, the download button will be hidden.
                 </p>
               </div>

               {/* Podcast-specific fields when merchant_only and podcast type */}
               {formData.audioType === 'podcast' && (
                 <>
                   <div>
                     <Label htmlFor="pieVideoPrice">PIE Individual Video Price ($)</Label>
                     <Input
                       id="pieVideoPrice"
                       type="number"
                       step="0.01"
                       min="0"
                       value={formData.pieVideoPrice}
                       onChange={(e) => setFormData(prev => ({ ...prev, pieVideoPrice: e.target.value }))}
                       className="bg-gray-700 border-gray-600 text-white"
                       placeholder="Price per individual video on PIE platform"
                     />
                     <p className="text-xs text-gray-400 mt-1">
                       Merchants receive 50% of this price for PIE exclusive content
                     </p>
                   </div>
                   
                   <div>
                     <Label htmlFor="youtubeMembershipFee">Monthly YouTube Membership Fee ($)</Label>
                     <Input
                       id="youtubeMembershipFee"
                       type="number"
                       step="0.01"
                       min="0"
                       value={formData.youtubeMembershipFee}
                       onChange={(e) => setFormData(prev => ({ ...prev, youtubeMembershipFee: e.target.value }))}
                       className="bg-gray-700 border-gray-600 text-white"
                       placeholder="Monthly membership tier fee for revenue calculation"
                     />
                     <p className="text-xs text-gray-400 mt-1">
                       For reference: Merchants receive 50% of PIE's 70% share (after YouTube's 30% cut)
                     </p>
                   </div>
                 </>
               )}
             </div>
           )}

          {/* Adult Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_content_audio" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if your audio contains adult or mature themes (18+)
                </p>
              </div>
            </div>
            <Switch
              id="adult_content_audio"
              checked={formData.is_adult_content}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_adult_content: checked }))}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Uploading..." : "Upload Audio"}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AudioUploadModal;
