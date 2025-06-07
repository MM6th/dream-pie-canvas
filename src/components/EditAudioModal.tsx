
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  audio_type: string;
  thumbnail_url: string | null;
  audio_file_url: string;
  album_id: string | null;
  is_free: boolean;
  price: number | null;
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
    audioType: product.audio_type,
    thumbnail: null as File | null,
    albumName: product.albums?.name || "",
    hasAlbum: !!product.album_id,
    isFree: product.is_free,
    price: product.price?.toString() || ""
  });
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
      
      // Update audio product
      const { error: productError } = await supabase
        .from('audio_products')
        .update({
          title: formData.title,
          artist_name: formData.artistName || null,
          audio_type: formData.audioType,
          thumbnail_url: thumbnailUrl,
          album_id: albumId,
          is_free: formData.isFree,
          price: formData.isFree ? null : parseFloat(formData.price)
        })
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Audio Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
              placeholder="Enter artist name"
            />
          </div>
          
          <div>
            <Label htmlFor="audioType">Audio Type *</Label>
            <Select 
              value={formData.audioType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, audioType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audio type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="spoken">Spoken</SelectItem>
                <SelectItem value="asmr">ASMR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="thumbnail">Update Thumbnail Image</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                thumbnail: e.target.files?.[0] || null 
              }))}
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
            <Label htmlFor="hasAlbum">Part of an album/collection</Label>
          </div>
          
          {formData.hasAlbum && (
            <div>
              <Label htmlFor="albumName">Album/Collection Name</Label>
              <Input
                id="albumName"
                value={formData.albumName}
                onChange={(e) => setFormData(prev => ({ ...prev, albumName: e.target.value }))}
                placeholder="Enter album name"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFree"
              checked={formData.isFree}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                isFree: checked as boolean 
              }))}
            />
            <Label htmlFor="isFree">Free download</Label>
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
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAudioModal;
