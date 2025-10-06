import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  audio_type: string;
  description: string | null;
  thumbnail_url: string | null;
  audio_file_url: string;
  album_id: string | null;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content?: boolean;
  max_downloads?: number | null;
  albums?: {
    name: string;
  };
}

interface EditAudioModalProps {
  product: AudioProduct;
  onSuccess: () => void;
  onClose: () => void;
}

const EditAudioModal = ({ product, onSuccess, onClose }: EditAudioModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: product.title,
    artistName: product.artist_name || "",
    description: product.description || "",
    audioType: product.audio_type,
    thumbnail: null as File | null,
    albumName: product.albums?.name || "",
    hasAlbum: !!product.album_id,
    accessLevel: (product.access_level || (product.is_free ? "public" : "paid")) as "public" | "merchant_only" | "paid",
    price: product.price?.toString() || "",
    maxDownloads: product.max_downloads?.toString() || "",
    numberOfOpportunities: (product as any).number_of_opportunities?.toString() || "",
    advanceFeeRate: (product as any).advance_fee_rate?.toString() || "",
    backEndRoyalties: (product as any).back_end_royalties || false,
    piePhotoEditing: (product as any).pie_photo_editing || false,
    isPieExclusive: (product as any).is_pie_exclusive || false
  });
  const [isAdultContent, setIsAdultContent] = useState(product.is_adult_content || false);
  const [albums, setAlbums] = useState<any[]>([]);

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

  useEffect(() => {
    fetchAlbums();
  }, [user]);

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
    
    if (!formData.title || !formData.audioType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload new thumbnail if provided
      let thumbnailUrl = product.thumbnail_url;
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
      
      // Update audio product with new access_level field, adult content, and ASMR fields
      const updateData: any = {
        title: formData.title,
        artist_name: formData.artistName || null,
        description: formData.description || null,
        audio_type: formData.audioType,
        thumbnail_url: thumbnailUrl,
        album_id: albumId,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        max_downloads: formData.accessLevel === 'merchant_only' && formData.maxDownloads ? parseInt(formData.maxDownloads) : null,
        is_adult_content: isAdultContent
      };

      // Add ASMR-specific fields if it's an ASMR product
      if (formData.audioType === 'asmr') {
        updateData.number_of_opportunities = formData.numberOfOpportunities ? parseInt(formData.numberOfOpportunities) : null;
        updateData.advance_fee_rate = formData.advanceFeeRate ? parseFloat(formData.advanceFeeRate) : null;
        updateData.back_end_royalties = formData.backEndRoyalties;
        updateData.pie_photo_editing = formData.piePhotoEditing;
        updateData.is_pie_exclusive = formData.isPieExclusive;
      }

      const { error: productError } = await supabase
        .from('audio_products')
        .update(updateData)
        .eq('id', product.id);
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: "Audio product updated successfully!"
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error('Error updating audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update audio product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md h-[90vh] bg-gray-800 border-gray-700 text-white flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Edit Audio Product</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4 pb-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter audio title"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="artistName">Artist Name</Label>
                  <Input
                    id="artistName"
                    value={formData.artistName}
                    onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
                    placeholder="Enter artist name"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter audio description"
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                
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
                      <SelectItem value="music" className="text-white">Music</SelectItem>
                      <SelectItem value="podcast" className="text-white">Podcast</SelectItem>
                      <SelectItem value="spoken" className="text-white">Spoken</SelectItem>
                      <SelectItem value="asmr" className="text-white">ASMR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="thumbnail">Thumbnail Image</Label>
                  {product.thumbnail_url && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-400 mb-2">Current thumbnail:</p>
                      <img
                        src={product.thumbnail_url}
                        alt="Current thumbnail"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                      />
                      <p className="text-xs text-gray-500 mt-1">Upload a new image to replace</p>
                    </div>
                  )}
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      thumbnail: e.target.files?.[0] || null 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAlbum"
                    checked={formData.hasAlbum}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      hasAlbum: checked as boolean 
                    }))}
                  />
                  <Label htmlFor="hasAlbum" className="text-white">Part of an album/collection</Label>
                </div>
                
                {formData.hasAlbum && (
                  <div>
                    <Label htmlFor="albumName">Album/Collection Name</Label>
                    <Input
                      id="albumName"
                      value={formData.albumName}
                      onChange={(e) => setFormData(prev => ({ ...prev, albumName: e.target.value }))}
                      placeholder="Enter album name"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                )}
                
                <div>
                  <Label className="text-white">Access Level *</Label>
                  <RadioGroup
                    value={formData.accessLevel}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      accessLevel: value as "public" | "merchant_only" | "paid"
                    }))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="text-white">Free for Everyone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merchant_only" id="merchant_only" />
                      <Label htmlFor="merchant_only" className="text-white">Merchant Download Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="paid" id="paid" />
                      <Label htmlFor="paid" className="text-white">Paid Content</Label>
                    </div>
                  </RadioGroup>
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
                      placeholder="0.00"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                )}

                {formData.accessLevel === 'merchant_only' && formData.audioType !== 'asmr' && (
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
                )}

                {formData.audioType === 'asmr' && formData.accessLevel === 'merchant_only' && (
                  <>
                    <div>
                      <Label htmlFor="numberOfOpportunities">Number of Opportunities</Label>
                      <Input
                        id="numberOfOpportunities"
                        type="number"
                        min="1"
                        value={formData.numberOfOpportunities}
                        onChange={(e) => setFormData(prev => ({ ...prev, numberOfOpportunities: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="e.g., 10"
                      />
                    </div>

                    <div>
                      <Label htmlFor="advanceFeeRate">Advance Fee Rate ($)</Label>
                      <Input
                        id="advanceFeeRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.advanceFeeRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, advanceFeeRate: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <Label htmlFor="backEndRoyalties">Back-end Royalties</Label>
                      <Checkbox
                        id="backEndRoyalties"
                        checked={formData.backEndRoyalties}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, backEndRoyalties: checked as boolean }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <Label htmlFor="piePhotoEditing">PIE Photo Editing</Label>
                      <Checkbox
                        id="piePhotoEditing"
                        checked={formData.piePhotoEditing}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, piePhotoEditing: checked as boolean }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <Label htmlFor="isPieExclusive">PIE Exclusive</Label>
                      <Checkbox
                        id="isPieExclusive"
                        checked={formData.isPieExclusive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPieExclusive: checked as boolean }))}
                      />
                    </div>
                  </>
                )}

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
                    checked={isAdultContent}
                    onCheckedChange={setIsAdultContent}
                  />
                </div>
              </form>
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex gap-2 pt-4 border-t border-gray-600 flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-gray-600 text-white bg-transparent">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmit}
          >
            {loading ? "Updating..." : "Update Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditAudioModal;
