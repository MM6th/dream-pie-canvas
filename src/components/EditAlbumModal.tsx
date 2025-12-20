import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lock, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Album {
  id: string;
  name: string;
  thumbnail_url: string | null;
  status: string;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  tracks?: any[];
}

interface EditAlbumModalProps {
  album: Album;
  onSuccess: () => void;
  onClose: () => void;
}

const EditAlbumModal = ({ album, onSuccess, onClose }: EditAlbumModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isPublished = album.status === 'published';

  const [formData, setFormData] = useState({
    name: album.name,
    thumbnail: null as File | null,
    accessLevel: (album.access_level || (album.is_free ? "public" : "paid")) as "public" | "merchant_only" | "paid",
    price: album.price?.toString() || "",
  });
  const [isAdultContent, setIsAdultContent] = useState(album.is_adult_content || false);

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

  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean = false) => {
    e.preventDefault();
    if (!user || isPublished) return;
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter an album name",
        variant: "destructive"
      });
      return;
    }

    if (formData.accessLevel === 'paid' && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid price for paid content",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let thumbnailUrl = album.thumbnail_url;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(
          formData.thumbnail, 
          'thumbnails', 
          `${user.id}/`
        );
      }

      // Update the album
      const albumUpdateData: any = {
        name: formData.name,
        thumbnail_url: thumbnailUrl,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        is_adult_content: isAdultContent,
      };

      if (shouldPublish) {
        albumUpdateData.status = 'published';
        albumUpdateData.published_at = new Date().toISOString();
      }

      const { error: albumError } = await supabase
        .from('albums')
        .update(albumUpdateData)
        .eq('id', album.id);
      
      if (albumError) throw albumError;

      // Update all tracks in the album to have consistent metadata
      const { error: tracksError } = await supabase
        .from('audio_products')
        .update({
          thumbnail_url: thumbnailUrl,
          is_adult_content: isAdultContent,
          status: shouldPublish ? 'published' : album.status,
          published_at: shouldPublish ? new Date().toISOString() : null,
        })
        .eq('album_id', album.id);

      if (tracksError) throw tracksError;
      
      toast({
        title: "Success",
        description: shouldPublish ? "Album published successfully!" : "Album updated successfully!"
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error('Error updating album:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update album",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Album</DialogTitle>
        </DialogHeader>

        {isPublished && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This album is published and cannot be edited. Contact administration if you need to make changes.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Album Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isPublished}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Album Cover</Label>
            {album.thumbnail_url && (
              <div className="mb-2 p-2 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Current cover:</p>
                <img 
                  src={album.thumbnail_url} 
                  alt="Current cover" 
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.files?.[0] || null })}
              disabled={isPublished}
            />
          </div>

          {album.tracks && album.tracks.length > 0 && (
            <div className="space-y-2">
              <Label>Album Tracks ({album.tracks.length})</Label>
              <div className="p-3 bg-secondary rounded-lg max-h-40 overflow-y-auto space-y-2">
                {album.tracks.map((track: any, index: number) => (
                  <div key={track.id} className="flex items-center gap-2 text-sm">
                    <Music className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span>{track.title}</span>
                    {track.artist_name && (
                      <span className="text-muted-foreground">- {track.artist_name}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Individual tracks cannot be edited after album creation.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Access Level *</Label>
            <RadioGroup
              value={formData.accessLevel}
              onValueChange={(value) => setFormData({ ...formData, accessLevel: value as any })}
              disabled={isPublished}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" disabled={isPublished} />
                <Label htmlFor="public">Free for Everyone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" disabled={isPublished} />
                <Label htmlFor="paid">Paid Content</Label>
              </div>
            </RadioGroup>
          </div>
          
          {formData.accessLevel === 'paid' && (
            <div className="space-y-2">
              <Label htmlFor="price">Album Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                disabled={isPublished}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAdultContent"
              checked={isAdultContent}
              onCheckedChange={(checked) => setIsAdultContent(checked as boolean)}
              disabled={isPublished}
            />
            <Label htmlFor="isAdultContent">Adult Content</Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {isPublished ? "Close" : "Cancel"}
            </Button>
            {!isPublished && (
              <>
                <Button 
                  type="button" 
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Save Changes"}
                </Button>
                {album.status === 'draft' && (
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      if (window.confirm("⚠️ Once published, you cannot edit or delete this album. You'll need to contact administration to remove it. Are you sure you want to publish?")) {
                        handleSubmit(e, true);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? "Publishing..." : "Publish Album"}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAlbumModal;
