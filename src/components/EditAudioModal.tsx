import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AudioPreviewPlayer from "./AudioPreviewPlayer";

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
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content?: boolean;
  status?: string;
  featuring_artist_name?: string | null;
  featuring_artist_paypal?: string | null;
  featuring_percentage?: number | null;
  preview_start_time?: number;
  preview_duration?: number;
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
  const [albums, setAlbums] = useState<any[]>([]);
  const isPublished = product.status === 'published';

  const [formData, setFormData] = useState({
    title: product.title,
    artistName: product.artist_name || "",
    audioType: product.audio_type,
    thumbnail: null as File | null,
    albumName: product.albums?.name || "",
    hasAlbum: !!product.album_id,
    accessLevel: (product.access_level || (product.is_free ? "public" : "paid")) as "public" | "merchant_only" | "paid",
    price: product.price?.toString() || "",
    previewStartTime: product.preview_start_time || 0,
    featuringArtistName: product.featuring_artist_name || '',
    featuringArtistPaypal: product.featuring_artist_paypal || '',
    featuringPercentage: product.featuring_percentage || 30,
  });
  const [isAdultContent, setIsAdultContent] = useState(product.is_adult_content || false);
  const [audioDuration, setAudioDuration] = useState<number>(0);

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
    
    if (product.audio_type === 'music' && product.audio_file_url) {
      const audio = new Audio();
      audio.src = product.audio_file_url;
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };
    }
  }, [user, product]);

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
    
    if (!formData.title || !formData.audioType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.featuringArtistName && !formData.featuringArtistPaypal) {
      toast({
        title: "Error",
        description: "Please enter PayPal email for featuring artist",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      let thumbnailUrl = product.thumbnail_url;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(
          formData.thumbnail, 
          'thumbnails', 
          `${user.id}/`
        );
      }
      
      let albumId = null;
      if (formData.hasAlbum && formData.albumName) {
        const existingAlbum = albums.find(album => 
          album.name.toLowerCase() === formData.albumName.toLowerCase()
        );
        
        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
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
      
      const updateData: any = {
        title: formData.title,
        artist_name: formData.artistName || null,
        audio_type: formData.audioType,
        thumbnail_url: thumbnailUrl,
        album_id: albumId,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        is_adult_content: isAdultContent,
        preview_start_time: formData.previewStartTime,
        preview_duration: 30,
        featuring_artist_name: formData.featuringArtistName || null,
        featuring_artist_paypal: formData.featuringArtistPaypal || null,
        featuring_percentage: formData.featuringArtistName ? formData.featuringPercentage : null,
      };

      if (shouldPublish) {
        updateData.status = 'published';
        updateData.published_at = new Date().toISOString();
      }

      const { error: productError } = await supabase
        .from('audio_products')
        .update(updateData)
        .eq('id', product.id);
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: shouldPublish ? "Audio published successfully!" : "Audio product updated successfully!"
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Audio Product</DialogTitle>
        </DialogHeader>

        {isPublished && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              🔒 This music is published and cannot be edited. Contact administration if you need to make changes.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={isPublished}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">Artist Name *</Label>
            <Input
              id="artist"
              value={formData.artistName}
              onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
              required
              disabled={isPublished}
            />
          </div>

          {!formData.hasAlbum && (
            <>
              <div className="space-y-2">
                <Label htmlFor="featuring-artist">Featuring Artist (Optional)</Label>
                <Input
                  id="featuring-artist"
                  value={formData.featuringArtistName}
                  onChange={(e) => setFormData({ ...formData, featuringArtistName: e.target.value })}
                  placeholder="Enter featuring artist name"
                  disabled={isPublished}
                />
              </div>

              {formData.featuringArtistName && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="featuring-paypal">Featuring Artist PayPal *</Label>
                    <Input
                      id="featuring-paypal"
                      type="email"
                      value={formData.featuringArtistPaypal}
                      onChange={(e) => setFormData({ ...formData, featuringArtistPaypal: e.target.value })}
                      placeholder="featuring@artist.com"
                      required
                      disabled={isPublished}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featuring-percentage">Revenue Share: {formData.featuringPercentage}%</Label>
                    <input
                      id="featuring-percentage"
                      type="range"
                      min="10"
                      max="50"
                      value={formData.featuringPercentage}
                      onChange={(e) => setFormData({ ...formData, featuringPercentage: parseInt(e.target.value) })}
                      className="w-full"
                      disabled={isPublished}
                    />
                    <p className="text-sm text-muted-foreground">
                      Featuring artist will receive {formData.featuringPercentage}% of revenue
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail Image</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.files?.[0] || null })}
              disabled={isPublished}
            />
          </div>

          {formData.audioType === 'music' && audioDuration > 0 && (
            <div className="space-y-3 p-4 bg-secondary rounded-lg">
              <Label>30-Second Preview Selection</Label>
              <p className="text-xs text-muted-foreground">
                Choose which 30 seconds to use as preview
              </p>
              
              <Slider
                value={[formData.previewStartTime]}
                onValueChange={(value) => setFormData({ ...formData, previewStartTime: value[0] })}
                max={Math.max(0, audioDuration - 30)}
                min={0}
                step={1}
                disabled={isPublished}
              />

              <AudioPreviewPlayer
                audioUrl={product.audio_file_url}
                previewStartTime={formData.previewStartTime}
                previewDuration={30}
                thumbnailUrl={product.thumbnail_url}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasAlbum"
              checked={formData.hasAlbum}
              onCheckedChange={(checked) => setFormData({ ...formData, hasAlbum: checked as boolean })}
              disabled={isPublished}
            />
            <Label htmlFor="hasAlbum">Part of an album/collection</Label>
          </div>
          
          {formData.hasAlbum && (
            <div className="space-y-2">
              <Label htmlFor="albumName">Album/Collection Name</Label>
              <Input
                id="albumName"
                value={formData.albumName}
                onChange={(e) => setFormData({ ...formData, albumName: e.target.value })}
                placeholder="Enter album name"
                disabled={isPublished}
              />
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
              <Label htmlFor="price">Price ($)</Label>
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
                {product.status === 'draft' && (
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      if (window.confirm("⚠️ Once published, you cannot edit or delete this music. You'll need to contact administration to remove it. Are you sure you want to publish?")) {
                        handleSubmit(e, true);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? "Publishing..." : "Publish Now"}
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

export default EditAudioModal;