import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CheckCircle, Music, ShoppingCart, Play, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SongDetailModal from "@/components/SongDetailModal";

const VIDEO_PREVIEW_DURATION = 15; // seconds

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string;
  price: number | null;
  audio_file_url: string;
  thumbnail_url: string;
  is_free?: boolean;
  access_level?: string;
  audio_type?: string;
  preview_start_time?: number | null;
  preview_duration?: number | null;
}

interface PortfolioImage {
  id: string;
  image_path: string;
  video_url: string | null;
  media_type: string;
  display_order: number;
  is_blurred: boolean;
  background_music_url?: string | null;
  is_video_muted?: boolean;
}

interface Portfolio {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_for_sale: boolean;
  price: number | null;
  created_at: string;
  portfolio_images: PortfolioImage[];
}

interface PortfolioCardProps {
  portfolio: Portfolio;
}

const PortfolioCard = ({ portfolio }: PortfolioCardProps) => {
  const { user } = useAuth();
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [audioProducts, setAudioProducts] = useState<Record<string, AudioProduct>>({});
  const [selectedAudioProduct, setSelectedAudioProduct] = useState<AudioProduct | null>(null);
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [ownedMusic, setOwnedMusic] = useState<Set<string>>(new Set());
  const [previewEndedVideos, setPreviewEndedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user || !portfolio.is_for_sale) return;

      const { data } = await supabase
        .from('portfolio_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('portfolio_id', portfolio.id)
        .maybeSingle();

      setIsPurchased(!!data);
    };

    checkPurchaseStatus();
  }, [user, portfolio.id, portfolio.is_for_sale]);

  // Fetch audio products for background music URLs
  useEffect(() => {
    const fetchAudioProducts = async () => {
      const musicUrls = portfolio.portfolio_images
        .filter(img => img.background_music_url)
        .map(img => img.background_music_url!);
      
      if (musicUrls.length === 0) return;

      try {
        const { data } = await supabase
          .from('audio_products')
          .select('id, title, artist_name, price, audio_file_url, thumbnail_url, is_free, access_level, audio_type, preview_start_time, preview_duration')
          .in('audio_file_url', musicUrls);

        if (data) {
          const productMap: Record<string, AudioProduct> = {};
          data.forEach((product) => {
            productMap[product.audio_file_url] = product;
          });
          setAudioProducts(productMap);
        }
      } catch (error) {
        console.error('Error fetching audio products:', error);
      }
    };

    fetchAudioProducts();
  }, [portfolio.portfolio_images]);

  // Check which music the user already owns
  useEffect(() => {
    const checkOwnedMusic = async () => {
      if (!user) return;
      
      const productIds = Object.values(audioProducts).map(p => p.id);
      if (productIds.length === 0) return;

      try {
        const { data } = await supabase
          .from('user_purchases')
          .select('audio_product_id')
          .eq('user_id', user.id)
          .in('audio_product_id', productIds);

        if (data) {
          setOwnedMusic(new Set(data.map(p => p.audio_product_id)));
        }
      } catch (error) {
        console.error('Error checking owned music:', error);
      }
    };

    checkOwnedMusic();
  }, [user, audioProducts]);

  // Handle video play/pause to sync with background music
  const handleVideoPlay = (mediaId: string, backgroundMusicUrl: string | null | undefined) => {
    if (backgroundMusicUrl && audioRefs.current[mediaId]) {
      audioRefs.current[mediaId]?.play();
    }
  };

  const handleVideoPause = (mediaId: string) => {
    if (audioRefs.current[mediaId]) {
      audioRefs.current[mediaId]?.pause();
    }
  };

  const handleVideoEnded = (mediaId: string) => {
    if (audioRefs.current[mediaId]) {
      audioRefs.current[mediaId]?.pause();
      audioRefs.current[mediaId]!.currentTime = 0;
    }
  };

  // Handle preview time limit for non-purchasers
  const handleVideoTimeUpdate = (mediaId: string, isPreviewMode: boolean) => {
    if (!isPreviewMode) return;
    
    const video = videoRefs.current[mediaId];
    if (video && video.currentTime >= VIDEO_PREVIEW_DURATION) {
      video.pause();
      video.currentTime = VIDEO_PREVIEW_DURATION;
      setPreviewEndedVideos(prev => new Set(prev).add(mediaId));
      handleVideoPause(mediaId);
    }
  };

  // Replay preview from beginning
  const handleReplayPreview = (mediaId: string) => {
    const video = videoRefs.current[mediaId];
    if (video) {
      video.currentTime = 0;
      setPreviewEndedVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
      video.play();
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to purchase portfolios",
        variant: "destructive"
      });
      return;
    }

    if (portfolio.user_id === user.id) {
      toast({
        title: "Cannot Purchase",
        description: "You cannot purchase your own portfolio",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-portfolio-payment', {
        body: { portfolioId: portfolio.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      // Redirect to PayPal
      const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href;
      if (approvalUrl) {
        window.location.href = approvalUrl;
      } else {
        throw new Error('PayPal approval URL not found');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate purchase",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyMusic = (audioProduct: AudioProduct) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to purchase music",
        variant: "destructive"
      });
      return;
    }
    setSelectedAudioProduct(audioProduct);
    setSongModalOpen(true);
  };

  const sortedMedia = [...portfolio.portfolio_images].sort((a, b) => a.display_order - b.display_order);
  const isOwner = user?.id === portfolio.user_id;
  const canView = !portfolio.is_for_sale || isPurchased || isOwner;

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-foreground text-xl mb-2">{portfolio.title}</CardTitle>
              {portfolio.description && (
                <p className="text-muted-foreground text-sm">{portfolio.description}</p>
              )}
            </div>
            {portfolio.is_for_sale && portfolio.price && (
              <Badge className="bg-green-600 text-white ml-4">
                <DollarSign className="w-3 h-3 mr-1" />
                ${portfolio.price.toFixed(2)}
              </Badge>
            )}
            {isPurchased && (
              <Badge className="bg-blue-600 text-white ml-4">
                <CheckCircle className="w-3 h-3 mr-1" />
                Purchased
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {sortedMedia.length > 0 && (
            <div className="h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent touch-pan-y mb-4">
              {sortedMedia.map((media) => {
                const shouldBlur = media.is_blurred && !canView;
                const audioProduct = media.background_music_url ? audioProducts[media.background_music_url] : null;
                const alreadyOwnsMusic = audioProduct ? ownedMusic.has(audioProduct.id) : false;
                const isPreviewMode = portfolio.is_for_sale && !isPurchased && !isOwner && media.media_type === 'video' && !media.is_blurred;
                const previewEnded = previewEndedVideos.has(media.id);
                
                return (
                  <div key={media.id} className="w-full h-[220px] relative rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {media.media_type === 'video' && media.video_url ? (
                      <>
                        <video
                          ref={(el) => { videoRefs.current[media.id] = el; }}
                          src={getMediaUrl(media.video_url)}
                          controls={canView || isPreviewMode}
                          muted={media.is_video_muted || false}
                          className={`w-full h-full object-cover ${shouldBlur ? 'blur-xl' : ''}`}
                          style={shouldBlur ? { filter: 'blur(20px)' } : {}}
                          onPlay={() => handleVideoPlay(media.id, media.background_music_url)}
                          onPause={() => handleVideoPause(media.id)}
                          onEnded={() => handleVideoEnded(media.id)}
                          onTimeUpdate={() => handleVideoTimeUpdate(media.id, isPreviewMode)}
                        />
                        
                        {isPreviewMode && !previewEnded && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500/90 rounded text-white text-xs">
                            <Play className="w-3 h-3" />
                            <span>{VIDEO_PREVIEW_DURATION}s Preview</span>
                          </div>
                        )}
                        
                        {isPreviewMode && previewEnded && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
                            <Lock className="w-8 h-8 text-white" />
                            <p className="text-white text-sm font-medium">Preview ended</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-white border-white hover:bg-white/20"
                                onClick={() => handleReplayPreview(media.id)}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Replay Preview
                              </Button>
                            </div>
                            <p className="text-white/70 text-xs mt-2">Purchase to watch full video</p>
                          </div>
                        )}
                        
                        {media.background_music_url && (
                          <>
                            <audio
                              ref={(el) => { audioRefs.current[media.id] = el; }}
                              src={media.background_music_url}
                              loop
                            />
                            <div className={`absolute ${isPreviewMode ? 'top-10' : 'top-2'} right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-white text-xs`}>
                              <Music className="w-3 h-3" />
                              <span>{audioProduct?.title || 'Has music'}</span>
                            </div>
                            {audioProduct && !isOwner && !previewEnded && (
                              <div className="absolute bottom-2 right-2">
                                {alreadyOwnsMusic ? (
                                  <Badge className="bg-green-600/90 text-white text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Owned
                                  </Badge>
                                ) : audioProduct.is_free ? (
                                  <Button
                                    size="sm"
                                    className="bg-green-600/90 hover:bg-green-700 text-white text-xs h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBuyMusic(audioProduct);
                                    }}
                                  >
                                    <Music className="w-3 h-3 mr-1" />
                                    Get Free
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600/90 hover:bg-blue-700 text-white text-xs h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBuyMusic(audioProduct);
                                    }}
                                  >
                                    <ShoppingCart className="w-3 h-3 mr-1" />
                                    Buy ${audioProduct.price?.toFixed(2)}
                                  </Button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <img
                        src={getMediaUrl(media.image_path)}
                        alt={`Portfolio media ${media.display_order}`}
                        className={`w-full h-full object-cover ${shouldBlur ? 'blur-xl' : ''}`}
                        style={shouldBlur ? { filter: 'blur(20px)' } : {}}
                      />
                    )}
                    {shouldBlur && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Badge variant="secondary" className="bg-black/70 text-white">
                          Purchase to view
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {portfolio.is_for_sale && !isPurchased && !isOwner && (
            <Button
              onClick={handlePurchase}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Purchase Portfolio - ${portfolio.price?.toFixed(2)}
                </>
              )}
            </Button>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            {sortedMedia.length} {sortedMedia.length !== 1 ? 'items' : 'item'}
          </div>
        </CardContent>
      </Card>

      {/* Song Detail Modal for purchasing background music */}
      <SongDetailModal
        audioProduct={selectedAudioProduct}
        isOpen={songModalOpen}
        onClose={() => {
          setSongModalOpen(false);
          setSelectedAudioProduct(null);
        }}
        onNavigateToStore={() => {
          setSongModalOpen(false);
        }}
        referrerId={portfolio.user_id} // Portfolio owner gets 10% referral commission
      />
    </>
  );
};

export default PortfolioCard;