
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AudioUploadModalProps {
  onSuccess?: () => void;
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
    isPartOfAlbum: false,
    albumName: "",
    isFree: true,
    price: ""
  });
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState("");

  const fetchAlbums = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('merchant_id', user.id);
    
    if (!error && data) {
      setAlbums(data);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchAlbums();
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${user!.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.audioFile || !formData.title || !formData.audioType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select an audio file.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload audio file
      const audioUrl = await uploadFile(formData.audioFile, 'audio-files', 'tracks');
      
      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(formData.thumbnail, 'thumbnails', 'audio');
      }

      // Handle album creation/selection
      let albumId = null;
      if (formData.isPartOfAlbum) {
        if (selectedAlbum) {
          albumId = selectedAlbum;
        } else if (formData.albumName) {
          // Create new album
          const { data: albumData, error: albumError } = await supabase
            .from('albums')
            .insert({
              merchant_id: user.id,
              name: formData.albumName
            })
            .select()
            .single();
          
          if (albumError) throw albumError;
          albumId = albumData.id;
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
          price: formData.isFree ? null : parseFloat(formData.price) || null
        });

      if (productError) throw productError;

      toast({
        title: "Success",
        description: "Audio product created successfully!"
      });

      // Reset form
      setFormData({
        title: "",
        audioType: "",
        thumbnail: null,
        audioFile: null,
        isPartOfAlbum: false,
        albumName: "",
        isFree: true,
        price: ""
      });
      setSelectedAlbum("");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create audio product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Upload Audio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
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
              required
            />
          </div>

          <div>
            <Label htmlFor="audioType">Audio Type *</Label>
            <Select value={formData.audioType} onValueChange={(value) => setFormData(prev => ({ ...prev, audioType: value }))}>
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
              onChange={(e) => setFormData(prev => ({ ...prev, audioFile: e.target.files?.[0] || null }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="thumbnail">Thumbnail</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.files?.[0] || null }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPartOfAlbum"
              checked={formData.isPartOfAlbum}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPartOfAlbum: checked as boolean }))}
            />
            <Label htmlFor="isPartOfAlbum">Part of Album/Collection</Label>
          </div>

          {formData.isPartOfAlbum && (
            <div className="space-y-2">
              {albums.length > 0 && (
                <div>
                  <Label>Select Existing Album</Label>
                  <Select value={selectedAlbum} onValueChange={setSelectedAlbum}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an album" />
                    </SelectTrigger>
                    <SelectContent>
                      {albums.map((album) => (
                        <SelectItem key={album.id} value={album.id}>
                          {album.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="albumName">Or Create New Album</Label>
                <Input
                  id="albumName"
                  value={formData.albumName}
                  onChange={(e) => setFormData(prev => ({ ...prev, albumName: e.target.value }))}
                  placeholder="Album name"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFree"
              checked={formData.isFree}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFree: checked as boolean }))}
            />
            <Label htmlFor="isFree">Free Download</Label>
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
            {loading ? "Creating..." : "Create Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AudioUploadModal;
