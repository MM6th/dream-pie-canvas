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
import { Loader2, Music, Play, Pause, X, Volume2, VolumeX } from "lucide-react";

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
  const [previewVideoPath, setPreviewVideoPath] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
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
      // Get audio from user's playlist (purchased/added music)
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
      
      // Filter out tracks with empty/null audio URLs to prevent SelectItem errors
      const validTracks = tracks.filter(t => t.audio_file_url && t.audio_file_url.trim() !== '');
      setOwnedTracks(validTracks);
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
    setPreviewVideoPath(videoPath);
    setPreviewVideo(getImageUrl(videoPath));
    setPreviewAudio(selectedMedia?.backgroundMusicUrl || null);
    setIsVideoMuted(false);
    setIsMusicPlaying(false);
  };

  const closePreview = () => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.pause();
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setPreviewVideo(null);
    setPreviewVideoPath(null);
    setPreviewAudio(null);
    setIsVideoMuted(false);
    setIsMusicPlaying(false);
  };

  const handlePreviewVideoPlay = () => {
    if (previewAudio && audioPreviewRef.current && !isVideoMuted) {
      audioPreviewRef.current.play();
      setIsMusicPlaying(true);
    }
  };

  const handlePreviewVideoPause = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsMusicPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.muted = !isVideoMuted;
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const handlePreviewMusicChange = (audioUrl: string) => {
    // Update the selected media's background music
    if (previewVideoPath) {
      setSelectedImages(selectedImages.map(img => 
        img.path === previewVideoPath ? { ...img, backgroundMusicUrl: audioUrl || undefined } : img
      ));
    }
    
    // Update preview audio
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setPreviewAudio(audioUrl || null);
    setIsMusicPlaying(false);
    
    // If video is playing and new music is selected, start playing it
    if (audioUrl && videoPreviewRef.current && !videoPreviewRef.current.paused) {
      setTimeout(() => {
        if (audioPreviewRef.current) {
          audioPreviewRef.current.play();
          setIsMusicPlaying(true);
        }
      }, 100);
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || loading) return;

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
    <>
      <Dialog open={open && !previewVideo} onOpenChange={onOpenChange}>
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
                    {isSelected && isVideo && (
                      <div className="mt-1">
                        <Select
                          value={selectedImages.find(img => img.path === media.file_path)?.backgroundMusicUrl || "none"}
                          onValueChange={(value) => handleBackgroundMusicChange(media.file_path, value === "none" ? "" : value)}
                        >
                          <SelectTrigger className="h-7 text-xs bg-gray-700 border-gray-600">
                            <Music className="w-3 h-3 mr-1" />
                            <SelectValue placeholder="Add music" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="none" className="text-white text-xs">No music</SelectItem>
                            {ownedTracks.length === 0 && (
                              <div className="px-2 py-1 text-xs text-gray-400">
                                No owned music available
                              </div>
                            )}
                            {ownedTracks
                              .filter((track) => track.audio_file_url && track.audio_file_url.trim() !== '')
                              .map((track) => (
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
    </Dialog>

    {/* Video Preview Modal - Outside Dialog to prevent overlap */}
    {previewVideo && (
      <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
        <div className="relative max-w-4xl w-full">
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
            {/* Video with controls */}
            <div className="relative">
              <video
                ref={videoPreviewRef}
                src={previewVideo}
                controls
                autoPlay
                muted={isVideoMuted}
                className="w-full max-h-[60vh]"
                onPlay={handlePreviewVideoPlay}
                onPause={handlePreviewVideoPause}
                onEnded={handlePreviewVideoPause}
              />
              {/* Mute button overlay */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white"
                onClick={toggleVideoMute}
              >
                {isVideoMuted ? (
                  <><VolumeX className="w-4 h-4 mr-1" /> Unmute Video</>
                ) : (
                  <><Volume2 className="w-4 h-4 mr-1" /> Mute Video</>
                )}
              </Button>
            </div>
            
            {/* Background music controls */}
            <div className="p-4 bg-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white text-sm font-medium flex items-center gap-2">
                  <Music className="w-4 h-4 text-green-400" />
                  Background Music
                </Label>
                {isMusicPlaying && previewAudio && (
                  <span className="text-xs text-green-400 animate-pulse">♪ Playing</span>
                )}
              </div>
              
              {ownedTracks.length > 0 ? (
                <Select
                  value={previewAudio || "none"}
                  onValueChange={(val) => handlePreviewMusicChange(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select background music" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 z-[150]">
                    <SelectItem value="none" className="text-white">No music</SelectItem>
                    {ownedTracks
                      .filter((track) => track.audio_file_url && track.audio_file_url.trim() !== '')
                      .map((track) => (
                        <SelectItem key={track.id} value={track.audio_file_url} className="text-white">
                          {track.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-gray-400 text-sm">
                  No music available. Upload music tracks or add free music to your playlist.
                </p>
              )}
              
              {previewAudio && (
                <audio
                  ref={audioPreviewRef}
                  src={previewAudio}
                  loop
                />
              )}
              
              <p className="text-gray-500 text-xs">
                Music will sync with video playback. Changes are saved automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default PortfolioModal;
