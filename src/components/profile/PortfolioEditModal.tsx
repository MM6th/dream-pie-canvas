import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Trash2, Plus, Music } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AudioTrack {
  id: string;
  title: string;
  audio_file_url: string;
}

interface PortfolioImage {
  id: string;
  image_path: string;
  video_url: string | null;
  media_type: string;
  display_order: number;
  is_blurred: boolean;
  background_music_url: string | null;
}

interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  is_for_sale: boolean;
  price: number | null;
  portfolio_images: PortfolioImage[];
}

interface PortfolioEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string | null;
  onSuccess: () => void;
  userType: string;
  availableMedia: Array<{ id: string; file_path: string; file_name: string; file_type: string }>;
}

const PortfolioEditModal = ({ 
  open, 
  onOpenChange, 
  portfolioId, 
  onSuccess, 
  userType,
  availableMedia 
}: PortfolioEditModalProps) => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isForSale, setIsForSale] = useState(false);
  const [price, setPrice] = useState("");
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addMediaMode, setAddMediaMode] = useState(false);
  const [ownedTracks, setOwnedTracks] = useState<AudioTrack[]>([]);

  const isMerchant = userType === 'merchant';

  useEffect(() => {
    if (open && portfolioId) {
      loadPortfolio();
      fetchOwnedTracks();
    }
  }, [open, portfolioId]);

  const fetchOwnedTracks = async () => {
    if (!user) return;
    
    try {
      const { data: playlistData } = await supabase
        .from('user_playlists')
        .select(`
          audio_product_id,
          audio_products (
            id,
            title,
            audio_file_url
          )
        `)
        .eq('user_id', user.id);

      const { data: ownedData } = await supabase
        .from('audio_products')
        .select('id, title, audio_file_url')
        .eq('merchant_id', user.id)
        .in('audio_type', ['music', 'other']);

      const tracks: AudioTrack[] = [];
      
      if (playlistData) {
        playlistData.forEach((item: any) => {
          if (item.audio_products) {
            tracks.push({
              id: item.audio_products.id,
              title: item.audio_products.title,
              audio_file_url: item.audio_products.audio_file_url
            });
          }
        });
      }
      
      if (ownedData) {
        ownedData.forEach((track) => {
          if (!tracks.some(t => t.id === track.id)) {
            tracks.push(track);
          }
        });
      }
      
      setOwnedTracks(tracks);
    } catch (error) {
      console.error('Error fetching owned tracks:', error);
    }
  };

  const loadPortfolio = async () => {
    if (!portfolioId) return;

    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          portfolio_images(*)
        `)
        .eq('id', portfolioId)
        .single();

      if (error) throw error;

      setPortfolio(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setIsForSale(data.is_for_sale);
      setPrice(data.price?.toString() || "");
      setPortfolioImages(
        [...data.portfolio_images].sort((a, b) => a.display_order - b.display_order)
      );
    } catch (error: any) {
      console.error('Error loading portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio",
        variant: "destructive"
      });
    }
  };

  const getMediaUrl = (image: PortfolioImage) => {
    const path = image.media_type === 'video' ? image.video_url : image.image_path;
    if (!path) return '';
    
    const { data } = supabase.storage.from('user-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleBlurToggle = (imageId: string) => {
    setPortfolioImages(portfolioImages.map(img => 
      img.id === imageId ? { ...img, is_blurred: !img.is_blurred } : img
    ));
  };

  const handleBackgroundMusicChange = (imageId: string, audioUrl: string) => {
    setPortfolioImages(portfolioImages.map(img => 
      img.id === imageId ? { ...img, background_music_url: audioUrl || null } : img
    ));
  };

  const handleRemoveFromPortfolio = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setPortfolioImages(portfolioImages.filter(img => img.id !== imageId));
      
      toast({
        title: "Success",
        description: "Media removed from portfolio"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove media",
        variant: "destructive"
      });
    }
  };

  const handleAddMedia = async (mediaPath: string, mediaType: string) => {
    if (!portfolioId) return;

    if (portfolioImages.length >= 10) {
      toast({
        title: "Limit Reached",
        description: "You can only have up to 10 media items in a portfolio",
        variant: "destructive"
      });
      return;
    }

    try {
      const newDisplayOrder = Math.max(...portfolioImages.map(img => img.display_order), 0) + 1;
      const type = mediaType.startsWith('video/') ? 'video' : 'image';

      const { data, error } = await supabase
        .from('portfolio_images')
        .insert({
          portfolio_id: portfolioId,
          image_path: type === 'image' ? mediaPath : '',
          video_url: type === 'video' ? mediaPath : null,
          media_type: type,
          display_order: newDisplayOrder,
          is_blurred: false
        })
        .select()
        .single();

      if (error) throw error;

      setPortfolioImages([...portfolioImages, data]);
      
      toast({
        title: "Success",
        description: "Media added to portfolio"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add media",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!portfolioId) return;

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a portfolio title",
        variant: "destructive"
      });
      return;
    }

    if (isForSale) {
      const priceNum = parseFloat(price);
      if (!price || isNaN(priceNum) || priceNum < 2) {
        toast({
          title: "Invalid Price",
          description: "Price must be at least $2.00",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Update portfolio details
      const { error: portfolioError } = await supabase
        .from('portfolios')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          is_for_sale: isForSale,
          price: isForSale ? parseFloat(price) : null
        })
        .eq('id', portfolioId);

      if (portfolioError) throw portfolioError;

      // Update blur states and background music for each image
      for (const image of portfolioImages) {
        const { error: imageError } = await supabase
          .from('portfolio_images')
          .update({ 
            is_blurred: image.is_blurred,
            background_music_url: image.background_music_url
          })
          .eq('id', image.id);

        if (imageError) throw imageError;
      }

      toast({
        title: "Success",
        description: "Portfolio updated successfully!"
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating portfolio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update portfolio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!portfolioId) return;

    try {
      // Delete all portfolio images
      const { error: imagesError } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('portfolio_id', portfolioId);

      if (imagesError) throw imagesError;

      // Delete the portfolio
      const { error: portfolioError } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId);

      if (portfolioError) throw portfolioError;

      toast({
        title: "Success",
        description: "Portfolio deleted successfully!"
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting portfolio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete portfolio",
        variant: "destructive"
      });
    }
  };

  // Filter available media to exclude already selected ones
  const availableToAdd = availableMedia.filter(media => {
    return !portfolioImages.some(img => {
      const imgPath = img.media_type === 'video' ? img.video_url : img.image_path;
      return imgPath === media.file_path;
    });
  });

  const getAvailableMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Portfolio</DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage your portfolio content and settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
              <Label htmlFor="edit-title" className="text-white">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter portfolio title"
                className="bg-gray-700 border-gray-600 text-white"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit-description" className="text-white">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter portfolio description (optional)"
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Sale Options (Merchants Only) */}
            {isMerchant && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-isForSale"
                    checked={isForSale}
                    onCheckedChange={(checked) => setIsForSale(checked as boolean)}
                  />
                  <Label htmlFor="edit-isForSale" className="text-white cursor-pointer">
                    Sell this portfolio
                  </Label>
                </div>

                {isForSale && (
                  <div>
                    <Label htmlFor="edit-price" className="text-white">Price (USD) *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      min="2.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Minimum $2.00"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Portfolio Media */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">
                  Portfolio Media ({portfolioImages.length}/10)
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMediaMode(!addMediaMode)}
                  className="border-gray-600 text-white"
                  disabled={portfolioImages.length >= 10}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {addMediaMode ? 'Done Adding' : 'Add Media'}
                </Button>
              </div>

              {/* Add Media Mode */}
              {addMediaMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-700/50 rounded-lg max-h-64 overflow-y-auto">
                  {availableToAdd.map((media) => {
                    const isVideo = media.file_type.startsWith('video/');
                    return (
                      <div 
                        key={media.id} 
                        className="relative group cursor-pointer"
                        onClick={() => handleAddMedia(media.file_path, media.file_type)}
                      >
                        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-600 hover:border-blue-500 transition-all">
                          {isVideo ? (
                            <video
                              src={getAvailableMediaUrl(media.file_path)}
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={getAvailableMediaUrl(media.file_path)}
                              alt={media.file_name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="w-8 h-8 text-white" />
                          </div>
                          {isVideo && (
                            <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-xs text-white">
                              Video
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {availableToAdd.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 py-8">
                      All your media is already in this portfolio
                    </div>
                  )}
                </div>
              )}

              {/* Current Portfolio Media */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 bg-gray-700/50 rounded-lg max-h-96 overflow-y-auto">
                {portfolioImages.map((image) => {
                  const isVideo = image.media_type === 'video';
                  return (
                    <div key={image.id} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-600">
                        {isVideo ? (
                          <video
                            src={getMediaUrl(image)}
                            className={`w-full h-full object-cover ${image.is_blurred && isMerchant ? 'blur-md' : ''}`}
                            muted
                          />
                        ) : (
                          <img
                            src={getMediaUrl(image)}
                            alt={`Portfolio item ${image.display_order}`}
                            className={`w-full h-full object-cover ${image.is_blurred && isMerchant ? 'blur-md' : ''}`}
                          />
                        )}
                        {isVideo && (
                          <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-xs text-white">
                            Video
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveFromPortfolio(image.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {/* Blur Checkbox (Merchants Only) */}
                      {isMerchant && (
                        <div className="mt-1 flex items-center space-x-2">
                          <Checkbox
                            id={`edit-blur-${image.id}`}
                            checked={image.is_blurred}
                            onCheckedChange={() => handleBlurToggle(image.id)}
                          />
                          <Label htmlFor={`edit-blur-${image.id}`} className="text-xs text-white cursor-pointer">
                            Blur
                          </Label>
                        </div>
                      )}
                      {/* Background Music (Videos Only) */}
                      {isVideo && ownedTracks.length > 0 && (
                        <div className="mt-1">
                          <Select
                            value={image.background_music_url || "none"}
                            onValueChange={(value) => handleBackgroundMusicChange(image.id, value === "none" ? "" : value)}
                          >
                            <SelectTrigger className="h-7 text-xs bg-gray-700 border-gray-600">
                              <Music className="w-3 h-3 mr-1" />
                              <SelectValue placeholder="Add music" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              <SelectItem value="none" className="text-white text-xs">No music</SelectItem>
                              {ownedTracks.map((track) => (
                                <SelectItem key={track.id} value={track.audio_file_url} className="text-white text-xs">
                                  {track.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Portfolio
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-600 text-white"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Portfolio</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this portfolio? This action cannot be undone.
              The media files will remain in your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePortfolio}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PortfolioEditModal;
