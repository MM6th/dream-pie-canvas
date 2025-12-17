import React, { useState, useEffect, useRef } from "react";
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
import { Loader2, Music, Play, Pause, X } from "lucide-react";

interface AudioTrack {
  id: string;
  title: string;
  audio_file_url: string;
}

interface PortfolioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userType: string;
  availableImages: Array<{ id: string; file_path: string; file_name: string; file_type: string }>;
}

const PortfolioModal = ({ open, onOpenChange, onSuccess, userType, availableImages }: PortfolioModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isForSale, setIsForSale] = useState(false);
  const [price, setPrice] = useState("");
  const [selectedImages, setSelectedImages] = useState<Array<{path: string; type: string; backgroundMusicUrl?: string}>>([]);
  const [blurredImages, setBlurredImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ownedTracks, setOwnedTracks] = useState<AudioTrack[]>([]);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  const isMerchant = userType === 'merchant';

  useEffect(() => {
    if (open && user) {
      fetchOwnedTracks();
    }
  }, [open, user]);

  const fetchOwnedTracks = async () => {
    if (!user) return;
    
    try {
      // Get audio from user's playlist
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

      // Get user's own audio products (if merchant)
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

  const handleImageToggle = (imagePath: string, fileType: string) => {
    const existing = selectedImages.find(img => img.path === imagePath);
    if (existing) {
      setSelectedImages(selectedImages.filter(p => p.path !== imagePath));
      setBlurredImages(blurredImages.filter(p => p !== imagePath));
    } else {
      if (selectedImages.length >= 10) {
        toast({
          title: "Limit Reached",
          description: "You can only select up to 10 media items for a portfolio",
          variant: "destructive"
        });
        return;
      }
      const mediaType = fileType.startsWith('video/') ? 'video' : 'image';
      setSelectedImages([...selectedImages, { path: imagePath, type: mediaType }]);
    }
  };

  const handleBackgroundMusicChange = (imagePath: string, audioUrl: string) => {
    setSelectedImages(selectedImages.map(img => 
      img.path === imagePath ? { ...img, backgroundMusicUrl: audioUrl || undefined } : img
    ));
  };

  const handleBlurToggle = (imagePath: string) => {
    if (blurredImages.includes(imagePath)) {
      setBlurredImages(blurredImages.filter(p => p !== imagePath));
    } else {
      setBlurredImages([...blurredImages, imagePath]);
    }
  };

  const handlePreviewVideo = (videoPath: string) => {
    const selectedMedia = selectedImages.find(img => img.path === videoPath);
    setPreviewVideo(getImageUrl(videoPath));
    setPreviewAudio(selectedMedia?.backgroundMusicUrl || null);
  };

  const closePreview = () => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.pause();
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setPreviewVideo(null);
    setPreviewAudio(null);
  };

  const handlePreviewVideoPlay = () => {
    if (previewAudio && audioPreviewRef.current) {
      audioPreviewRef.current.play();
    }
  };

  const handlePreviewVideoPause = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a portfolio title",
        variant: "destructive"
      });
      return;
    }

    if (selectedImages.length === 0) {
      toast({
        title: "Images Required",
        description: "Please select at least one image",
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
      // Create portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          is_for_sale: isForSale,
          price: isForSale ? parseFloat(price) : null
        })
        .select()
        .single();

      if (portfolioError) throw portfolioError;

      // Create portfolio images/videos
      const portfolioImages = selectedImages.map((media, index) => ({
        portfolio_id: portfolio.id,
        image_path: media.type === 'image' ? media.path : '',
        video_url: media.type === 'video' ? media.path : null,
        media_type: media.type,
        display_order: index + 1,
        is_blurred: blurredImages.includes(media.path),
        background_music_url: media.type === 'video' ? (media.backgroundMusicUrl || null) : null
      }));

      const { error: imagesError } = await supabase
        .from('portfolio_images')
        .insert(portfolioImages);

      if (imagesError) throw imagesError;

      toast({
        title: "Success",
        description: "Portfolio created successfully!"
      });

      // Reset form
      setTitle("");
      setDescription("");
      setIsForSale(false);
      setPrice("");
      setSelectedImages([]);
      setBlurredImages([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating portfolio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create portfolio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Create Portfolio</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a portfolio with up to 10 images from your gallery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-white">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter portfolio title"
              className="bg-gray-700 border-gray-600 text-white"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
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
                  id="isForSale"
                  checked={isForSale}
                  onCheckedChange={(checked) => setIsForSale(checked as boolean)}
                />
                <Label htmlFor="isForSale" className="text-white cursor-pointer">
                  Sell this portfolio
                </Label>
              </div>

              {isForSale && (
                <div>
                  <Label htmlFor="price" className="text-white">Price (USD) *</Label>
                  <Input
                    id="price"
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

          {/* Media Selection */}
          <div>
            <Label className="text-white">
              Select Media ({selectedImages.length}/10) *
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2 max-h-96 overflow-y-auto p-2 bg-gray-700/50 rounded-lg">
              {availableImages.map((media) => {
                const isSelected = selectedImages.some(img => img.path === media.file_path);
                const isBlurred = blurredImages.includes(media.file_path);
                const isVideo = media.file_type.startsWith('video/');

                return (
                  <div key={media.id} className="relative group">
                    <div
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-600'
                      }`}
                      onClick={() => handleImageToggle(media.file_path, media.file_type)}
                    >
                      {isVideo ? (
                        <video
                          src={getImageUrl(media.file_path)}
                          className={`w-full h-full object-cover ${isBlurred && isMerchant ? 'blur-md' : ''}`}
                          muted
                        />
                      ) : (
                        <img
                          src={getImageUrl(media.file_path)}
                          alt={media.file_name}
                          className={`w-full h-full object-cover ${isBlurred && isMerchant ? 'blur-md' : ''}`}
                        />
                      )}
                      {isVideo && (
                        <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-xs text-white">
                          Video
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="bg-blue-500 rounded-full p-1">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {/* Preview button for videos */}
                      {isVideo && isSelected && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute bottom-1 right-1 h-6 px-2 text-xs bg-black/70 hover:bg-black/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVideo(media.file_path);
                          }}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      )}
                    </div>
                    
                    {/* Blur Checkbox (Merchants Only) */}
                    {isSelected && isMerchant && (
                      <div className="mt-1 flex items-center space-x-2">
                        <Checkbox
                          id={`blur-${media.id}`}
                          checked={isBlurred}
                          onCheckedChange={() => handleBlurToggle(media.file_path)}
                        />
                        <Label htmlFor={`blur-${media.id}`} className="text-xs text-white cursor-pointer">
                          Blur
                        </Label>
                      </div>
                    )}
                    {/* Background Music (Videos Only) */}
                    {isSelected && isVideo && ownedTracks.length > 0 && (
                      <div className="mt-1">
                        <Select
                          value={selectedImages.find(img => img.path === media.file_path)?.backgroundMusicUrl || ""}
                          onValueChange={(value) => handleBackgroundMusicChange(media.file_path, value)}
                        >
                          <SelectTrigger className="h-7 text-xs bg-gray-700 border-gray-600">
                            <Music className="w-3 h-3 mr-1" />
                            <SelectValue placeholder="Add music" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="" className="text-white text-xs">No music</SelectItem>
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
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-600 text-white"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Portfolio'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
          <div className="relative max-w-4xl w-full mx-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={closePreview}
            >
              <X className="w-5 h-5 mr-1" />
              Close Preview
            </Button>
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoPreviewRef}
                src={previewVideo}
                controls
                autoPlay
                className="w-full max-h-[70vh]"
                onPlay={handlePreviewVideoPlay}
                onPause={handlePreviewVideoPause}
                onEnded={handlePreviewVideoPause}
              />
              {previewAudio && (
                <>
                  <audio
                    ref={audioPreviewRef}
                    src={previewAudio}
                    loop
                  />
                  <div className="p-3 bg-gray-800 flex items-center gap-2 text-white text-sm">
                    <Music className="w-4 h-4 text-green-400" />
                    <span>Background music attached</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default PortfolioModal;
