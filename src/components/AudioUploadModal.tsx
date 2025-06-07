
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Plus } from "lucide-react";
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
    audioType: "",
    thumbnail: null as File | null,
    audioFile: null as File | null,
    albumName: "",
    hasAlbum: false,
    isFree: true,
    price: ""
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
      
      // Create audio product
      const { error: productError } = await supabase
        .from('audio_products')
        .insert({
          merchant_id: user.id,
          title: formData.title,
          audio_type: formData.audioType,
          thumbnail_url: thumbnailUrl,
          audio_file_url: audioUrl,
          album_id: albumId,
          is_free: formData.isFree,
          price: formData.isFree ? null : parseFloat(formData.price)
        });
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: "Audio product uploaded successfully!"
      });
      
      setOpen(false);
      setFormData({
        title: "",
        audioType: "",
        thumbnail: null,
        audioFile: null,
        albumName: "",
        hasAlbum: false,
        isFree: true,
        price: ""
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
          <Plus className="w-4 h-4 mr-2" />
          Upload Audio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Audio Product</DialogTitle>
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
            <Label htmlFor="audioFile">Audio File *</Label>
            <Input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                audioFile: e.target.files?.[0] || null 
              }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="thumbnail">Thumbnail Image</Label>
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
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Uploading..." : "Create Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AudioUploadModal;
