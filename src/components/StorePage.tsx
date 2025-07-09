import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioLines, Download, DollarSign, Video, Lock, Shirt, Star, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FashionStoreSection from "./FashionStoreSection";
import AstrologyStoreSection from "./AstrologyStoreSection";


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
  is_adult_content: boolean | null;
  created_at: string;
  albums?: {
    name: string;
  };
}

interface VideoProduct {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  thumbnail_url: string | null;
  video_file_url: string;
  background_music_url: string | null;
  is_free: boolean;
  price: number | null;
  is_adult_content: boolean | null;
  created_at: string;
}

interface UserProfile {
  user_type: string;
  approval_status: string | null;
  adult_content_restricted: boolean | null;
}

const StorePage = () => {
  const { user } = useAuth();
  const [audioProducts, setAudioProducts] = useState<AudioProduct[]>([]);
  const [videoProducts, setVideoProducts] = useState<VideoProduct[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, approval_status, adult_content_restricted')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const filterAdultContent = <T extends { is_adult_content?: boolean | null }>(products: T[]): T[] => {
    if (!userProfile?.adult_content_restricted) return products;
    return products.filter(product => !product.is_adult_content);
  };

  const fetchProducts = async () => {
    try {
      // Fetch user profile first
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      // Fetch audio products with access_level and adult content flag
      const { data: audioData, error: audioError } = await supabase
        .from('audio_products')
        .select(`
          id,
          title,
          artist_name,
          audio_type,
          thumbnail_url,
          audio_file_url,
          album_id,
          is_free,
          price,
          access_level,
          is_adult_content,
          created_at,
          albums (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (audioError) throw audioError;

      // Fetch video products with adult content flag
      const { data: videoData, error: videoError } = await supabase
        .from('video_products')
        .select('*, is_adult_content')
        .order('created_at', { ascending: false });

      if (videoError) throw videoError;

      // Filter adult content based on user preferences
      const filteredAudioData = filterAdultContent(audioData || []);
      const filteredVideoData = filterAdultContent(videoData || []);

      setAudioProducts(filteredAudioData);
      setVideoProducts(filteredVideoData);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const canDownloadAudio = (product: AudioProduct) => {
    if (!user) return false;
    
    const accessLevel = product.access_level || (product.is_free ? "public" : "paid");
    
    switch (accessLevel) {
      case "public":
        return true;
      case "merchant_only":
        return userProfile?.user_type === 'merchant' && userProfile?.approval_status === 'approved';
      case "paid":
        return false; // Will be handled by purchase flow
      default:
        return false;
    }
  };

  const getAccessLevelBadge = (product: AudioProduct) => {
    const accessLevel = product.access_level || (product.is_free ? "public" : "paid");
    
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {/* Adult content indicator */}
        {product.is_adult_content && !userProfile?.adult_content_restricted && (
          <Badge className="bg-orange-600 hover:bg-orange-700 text-xs flex items-center gap-1">
            <Shield className="w-3 h-3" />
            18+
          </Badge>
        )}
        
        {/* Access level badge */}
        {(() => {
          switch (accessLevel) {
            case "public":
              return (
                <Badge className="bg-green-600 hover:bg-green-700">
                  Free
                </Badge>
              );
            case "merchant_only":
              return (
                <Badge className="bg-orange-600 hover:bg-orange-700 flex items-center gap-1 text-xs">
                  <Lock className="w-3 h-3" />
                  Merchants Only
                </Badge>
              );
            case "paid":
              return (
                <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {product.price?.toFixed(2)}
                </Badge>
              );
            default:
              return (
                <Badge className="bg-green-600 hover:bg-green-700">
                  Free
                </Badge>
              );
          }
        })()}
      </div>
    );
  };

  const getVideoBadges = (product: VideoProduct) => {
    return (
      <div className="flex items-center gap-2">
        {/* Adult content indicator */}
        {product.is_adult_content && !userProfile?.adult_content_restricted && (
          <Badge className="bg-orange-600 hover:bg-orange-700 text-xs flex items-center gap-1">
            <Shield className="w-3 h-3" />
            18+
          </Badge>
        )}
        
        {/* Price badge */}
        {product.is_free ? (
          <Badge className="bg-green-600 hover:bg-green-700">
            Free
          </Badge>
        ) : (
          <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {product.price?.toFixed(2)}
          </Badge>
        )}
      </div>
    );
  };

  const getDownloadButtonText = (product: AudioProduct) => {
    if (!user) return "Sign In to Download";
    
    const accessLevel = product.access_level || (product.is_free ? "public" : "paid");
    
    switch (accessLevel) {
      case "public":
        return "Add to Library";
      case "merchant_only":
        if (userProfile?.user_type === 'merchant' && userProfile?.approval_status === 'approved') {
          return "Add to Library";
        }
        return "Merchants Only";
      case "paid":
        return "Buy";
      default:
        return "Add to Library";
    }
  };

  const handleFreeAudioDownload = async (product: AudioProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download audio",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Processing free download for product:', product.id);
      
      // Check if user already has this free audio
      const { data: existingPurchase, error: checkError } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('audio_product_id', product.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing purchases:', checkError);
        throw new Error('Failed to check existing downloads');
      }

      if (existingPurchase) {
        toast({
          title: "Already in your library",
          description: "This audio is already available in your audio player",
        });
        return;
      }

      console.log('Recording free download in database...');
      
      // Record the free download with the new column
      const { data: insertedPurchase, error: insertError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          audio_product_id: product.id,
          is_free_download: true,
          amount_paid: 0,
          paypal_transaction_id: null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting free download:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      console.log('Free download recorded successfully:', insertedPurchase);

      toast({
        title: "Audio added to library!",
        description: "The audio has been added to your audio player in the dashboard",
      });

    } catch (error: any) {
      console.error('Error recording free download:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add audio to your library. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFreeVideoDownload = async (product: VideoProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download video",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Processing free video download for product:', product.id);
      
      // For now, we'll simulate adding to library since user_video_purchases doesn't exist in types yet
      // This will be updated once the database types are regenerated
      
      toast({
        title: "Video added to library!",
        description: "The video has been added to your video player in the dashboard (feature coming soon)",
      });

    } catch (error: any) {
      console.error('Error recording free video download:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add video to your library. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAudioPurchase = async (product: AudioProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    const accessLevel = product.access_level || (product.is_free ? "public" : "paid");

    // Check if user can download this content
    if (accessLevel === "merchant_only") {
      if (!canDownloadAudio(product)) {
        toast({
          title: "Access Restricted",
          description: "This content is only available to approved merchants",
          variant: "destructive"
        });
        return;
      }
      // If merchant can download, treat as free download
      await handleFreeAudioDownload(product);
      return;
    }

    if (accessLevel === "public") {
      await handleFreeAudioDownload(product);
      return;
    }

    // Handle paid content
    setPurchasingId(product.id);

    try {
      console.log('Starting payment process for product:', product.id);
      
      const { data, error } = await supabase.functions.invoke('create-paypal-payment', {
        body: { audioProductId: product.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      console.log('Payment response:', data, 'Error:', error);

      if (error) {
        console.error('Payment creation error:', error);
        throw error;
      }

      if (data?.approvalUrl) {
        console.log('Redirecting to PayPal:', data.approvalUrl);
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleVideoPurchase = async (product: VideoProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    if (product.is_free) {
      await handleFreeVideoDownload(product);
      return;
    }

    setPurchasingId(product.id);

    try {
      console.log('Starting video payment process for product:', product.id);
      
      toast({
        title: "Video Purchases",
        description: "Paid video purchases will be implemented soon. Free videos work now!",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Error creating video payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading store...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Content Store</h1>
          <p className="text-gray-300">Discover amazing astrology, fashion, audio, and video content from creators</p>
          {userProfile?.adult_content_restricted && (
            <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Adult content filtering is enabled. Some content may be hidden.
              </p>
            </div>
          )}
        </div>

        {/* Astrology Products Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Star className="w-6 h-6" />
            Astrology Readings & Consultations
          </h2>
          <AstrologyStoreSection />
        </div>

        {/* Fashion Products Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shirt className="w-6 h-6" />
            Fashion
          </h2>
          <FashionStoreSection />
        </div>

        {/* Audio Products Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <AudioLines className="w-6 h-6" />
            Audio Content
          </h2>
          
          
          {audioProducts.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <AudioLines className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Audio Products Available</h3>
                <p className="text-gray-400">Be the first to upload some audio content!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {audioProducts.map((product) => (
                <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors">
                  <CardHeader className="p-4">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                        <AudioLines className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
                    {product.artist_name && (
                      <p className="text-gray-400 text-sm">by {product.artist_name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="capitalize">
                          {product.audio_type}
                        </Badge>
                        {product.albums && (
                          <Badge variant="outline" className="text-xs bg-white text-black border-white">
                            {product.albums.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {getAccessLevelBadge(product)}
                        
                        <Button
                          size="sm"
                          onClick={() => handleAudioPurchase(product)}
                          disabled={purchasingId === product.id || (!canDownloadAudio(product) && (product.access_level === "merchant_only"))}
                          className="bg-primary hover:bg-primary/90 text-xs h-8 px-2"
                        >
                          {purchasingId === product.id ? (
                            "Processing..."
                          ) : (
                            <>
                              {(product.access_level === "paid") ? <DollarSign className="w-4 h-4 mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                              {getDownloadButtonText(product)}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Video Products Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Video className="w-6 h-6" />
            Video Content
          </h2>
          
          {videoProducts.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Video Products Available</h3>
                <p className="text-gray-400">Be the first to upload some video content!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videoProducts.map((product) => (
                <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors">
                  <CardHeader className="p-4">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                        <Video className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
                    {product.description && (
                      <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="capitalize">
                          {product.video_type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {getVideoBadges(product)}
                        
                        <Button
                          size="sm"
                          onClick={() => handleVideoPurchase(product)}
                          disabled={purchasingId === product.id}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {purchasingId === product.id ? (
                            "Processing..."
                          ) : (
                            <>
                              {product.is_free ? <Download className="w-4 h-4 mr-1" /> : <DollarSign className="w-4 h-4 mr-1" />}
                              {product.is_free ? "Add to Library" : "Buy"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;
