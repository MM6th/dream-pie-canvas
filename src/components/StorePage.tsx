import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AudioLines, Download, DollarSign, Video, Lock, Shirt, Star, Shield, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import FashionStoreSection from "./FashionStoreSection";
import FoodStoreSection from "./FoodStoreSection";
import DanceStoreSection from "./DanceStoreSection";
import AstrologyStoreSection from "./AstrologyStoreSection";
import PodcastDownloadManager from "./PodcastDownloadManager";
import DownloadOpportunityChecker from "./DownloadOpportunityChecker";
import VideoAdSubmissionModal from "./VideoAdSubmissionModal";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import ProductInstructionalText from "@/components/ui/ProductInstructionalText";
import ASMRSubmissionModal from "./ASMRSubmissionModal";
import AudioPreviewPlayer from "./AudioPreviewPlayer";
import AlbumTracklistHover from "./AlbumTracklistHover";

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
  max_downloads?: number | null;
  number_of_opportunities?: number | null;
  description: string | null;
  pie_photo_editing: boolean | null;
  back_end_royalties: boolean | null;
  advance_fee_rate: number | null;
  created_at: string;
  preview_start_time?: number | null;
  preview_duration?: number | null;
  preview_url?: string | null;
  albums?: {
    id: string;
    name: string;
    description?: string | null;
  };
  isAlbum?: boolean;
  albumId?: string;
}

interface VideoAdOpportunity {
  id: string;
  title: string;
  description: string | null;
  audio_file_url: string;
  audio_type: string;
  target_platform: string;
  payment_amount: number;
  available_spots: number;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  created_at: string;
  thumbnail_url?: string | null;
}

interface UserProfile {
  user_type: string;
  approval_status: string | null;
  adult_content_restricted: boolean | null;
}

const StorePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [audioProducts, setAudioProducts] = useState<AudioProduct[]>([]);
  const [videoAdOpportunities, setVideoAdOpportunities] = useState<VideoAdOpportunity[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<VideoAdOpportunity | null>(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [asmrDownloads, setAsmrDownloads] = useState<string[]>([]);
  const [selectedAsmrProduct, setSelectedAsmrProduct] = useState<AudioProduct | null>(null);
  const [asmrSubmissionModalOpen, setAsmrSubmissionModalOpen] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

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

  const filterAdultContent = <T extends { is_adult_content?: boolean | null }>(products: T[], profile: UserProfile | null): T[] => {
    if (!profile) return products;
    
    if (profile.adult_content_restricted === true) {
      console.log('Filtering adult content - user has restriction enabled');
      const filtered = products.filter(product => {
        const isAdult = product.is_adult_content === true;
        console.log(`Product ${(product as any).title || (product as any).id}: is_adult_content=${product.is_adult_content}, filtered=${isAdult}`);
        return !isAdult;
      });
      console.log(`Filtered ${products.length - filtered.length} adult products out of ${products.length} total`);
      return filtered;
    }
    
    return products;
  };

  const filterAccessLevel = <T extends { access_level?: string | null }>(products: T[], profile: UserProfile | null): T[] => {
    if (!profile) return [];
    
    if (profile.user_type === 'supporter') {
      return products.filter(product => {
        const accessLevel = product.access_level || 'public';
        return accessLevel === 'public' || accessLevel === 'paid';
      });
    }
    
    return products;
  };

  const fetchAsmrDownloads = async () => {
    if (!user) return;
    
    try {
      // Get existing ASMR downloads
      const { data: existingDownloads, error: downloadsError } = await supabase
        .from('asmr_downloads')
        .select('audio_product_id')
        .eq('merchant_id', user.id);

      if (downloadsError) throw downloadsError;
      
      const existingDownloadIds = existingDownloads?.map(d => d.audio_product_id) || [];
      
      // Also check user_purchases for ASMR products that were downloaded but not recorded in asmr_downloads
      const { data: purchasedAsmr, error: purchaseError } = await supabase
        .from('user_purchases')
        .select(`
          audio_product_id,
          audio_products!inner(audio_type, access_level)
        `)
        .eq('user_id', user.id)
        .eq('audio_products.audio_type', 'asmr')
        .eq('audio_products.access_level', 'merchant_only');

      if (purchaseError) throw purchaseError;

      // Sync missing ASMR downloads
      const purchasedAsmrIds = purchasedAsmr?.map(p => p.audio_product_id) || [];
      const missingDownloads = purchasedAsmrIds.filter(id => !existingDownloadIds.includes(id));

      if (missingDownloads.length > 0) {
        const { error: syncError } = await supabase
          .from('asmr_downloads')
          .insert(missingDownloads.map(audioProductId => ({
            merchant_id: user.id,
            audio_product_id: audioProductId
          })));

        if (syncError) console.error('Error syncing ASMR downloads:', syncError);
      }

      // Set all ASMR downloads (existing + synced)
      setAsmrDownloads([...existingDownloadIds, ...missingDownloads]);
      
    } catch (error) {
      console.error('Error fetching ASMR downloads:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      // Fetch audio products (excluding video ad opportunities and exhausted ASMR opportunities)
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
          max_downloads,
          number_of_opportunities,
          opportunities_exhausted,
          description,
          pie_photo_editing,
          back_end_royalties,
          advance_fee_rate,
          preview_start_time,
          preview_duration,
          preview_url,
          created_at,
          albums (
            id,
            name,
            description
          )
        `)
        .not('title', 'ilike', '%video ad%')
        .not('title', 'ilike', '%dance to dairy queen%')
        .or('opportunities_exhausted.is.null,opportunities_exhausted.eq.false')
        .order('created_at', { ascending: false });

      if (audioError) throw audioError;

      // Filter out ASMR products with approved submissions and signed contracts
      const { data: signedASMRProducts, error: asmrError } = await supabase
        .from('asmr_submissions')
        .select('audio_product_id')
        .eq('status', 'approved')
        .not('contract_id', 'is', null);

      if (asmrError) console.error('Error fetching signed ASMR submissions:', asmrError);

      // Filter out PODCAST products with signed, approved contracts
      const { data: signedPodcastProducts, error: podcastError } = await supabase
        .from('podcast_downloads')
        .select('audio_product_id, contracts!inner(status, signed_at)')
        .eq('contracts.status', 'approved')
        .not('contracts.signed_at', 'is', null);

      if (podcastError) console.error('Error fetching signed podcast contracts:', podcastError);

      // Combine both ASMR and Podcast signed products
      const signedProductIds = new Set([
        ...(signedASMRProducts?.map(s => s.audio_product_id) || []),
        ...(signedPodcastProducts?.map(s => s.audio_product_id) || [])
      ]);

      let filteredAudioData = audioData?.filter(p => !signedProductIds.has(p.id)) || [];

      // Group albums: Keep only track #1 per album as representative
      const albumGroups = new Map();
      const nonAlbumProducts: AudioProduct[] = [];
      
      // First, fetch album tracks to get proper ordering
      const albumIds = [...new Set(filteredAudioData.filter(p => p.album_id).map(p => p.album_id))];
      
      if (albumIds.length > 0) {
        const { data: albumTracksData } = await supabase
          .from('album_tracks')
          .select('album_id, audio_product_id, track_number')
          .in('album_id', albumIds)
          .order('track_number', { ascending: true });

        // Group tracks by album
        const tracksByAlbum = new Map<string, any[]>();
        albumTracksData?.forEach(track => {
          if (!tracksByAlbum.has(track.album_id)) {
            tracksByAlbum.set(track.album_id, []);
          }
          tracksByAlbum.get(track.album_id)!.push(track);
        });

        filteredAudioData.forEach(product => {
          if (product.album_id && product.albums) {
            const albumTracks = tracksByAlbum.get(product.album_id) || [];
            const track1 = albumTracks.find(t => t.track_number === 1);
            
            // Only use this product if it's track #1 or if track #1 isn't found (use first available)
            if (!albumGroups.has(product.album_id)) {
              if (!track1 || track1.audio_product_id === product.id) {
                albumGroups.set(product.album_id, {
                  ...product,
                  title: product.albums.name, // Use album name as title
                  description: product.albums.description || product.description,
                  isAlbum: true,
                  albumId: product.album_id
                });
              } else if (track1.audio_product_id !== product.id && albumTracks[0]?.audio_product_id === product.id) {
                // Fallback: use first track if track #1 doesn't exist
                albumGroups.set(product.album_id, {
                  ...product,
                  title: product.albums.name,
                  description: product.albums.description || product.description,
                  isAlbum: true,
                  albumId: product.album_id
                });
              }
            }
          } else {
            nonAlbumProducts.push(product);
          }
        });
      } else {
        filteredAudioData.forEach(product => {
          if (!product.album_id) {
            nonAlbumProducts.push(product);
          }
        });
      }

      // Combine albums (represented by track #1) with non-album products
      filteredAudioData = [...Array.from(albumGroups.values()), ...nonAlbumProducts];

      // Fetch video ad opportunities
      const { data: videoOpportunities, error: videoAdError } = await supabase
        .from('video_ad_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (videoAdError) throw videoAdError;

      // Filter out VIDEO AD opportunities with signed, approved contracts
      const { data: signedVideoAds, error: videoAdContractError } = await supabase
        .from('video_ad_downloads')
        .select('video_ad_opportunity_id, contracts!inner(status, signed_at)')
        .eq('contracts.status', 'approved')
        .not('contracts.signed_at', 'is', null);

      if (videoAdContractError) console.error('Error fetching signed video ad contracts:', videoAdContractError);

      const signedVideoAdIds = new Set(signedVideoAds?.map(v => v.video_ad_opportunity_id) || []);
      const videoAdData = videoOpportunities?.filter(v => !signedVideoAdIds.has(v.id));

      console.log('User profile:', profile);
      console.log('Raw audio products:', audioData?.length || 0);
      console.log('Filtered audio products (after ASMR filter):', filteredAudioData.length);
      console.log('Raw video ad opportunities:', videoAdData?.length || 0);
      
      const adultFilteredAudioData = filterAdultContent(filteredAudioData, profile);
      const adultFilteredVideoAdData = filterAdultContent(videoAdData || [], profile);
      
      const finalAudioData = filterAccessLevel(adultFilteredAudioData, profile);
      const filteredVideoAdData = filterAccessLevel(adultFilteredVideoAdData, profile);
      
      console.log('Final filtered audio products:', finalAudioData.length);
      console.log('Final filtered video ad opportunities:', filteredVideoAdData.length);

      setAudioProducts(finalAudioData);
      setVideoAdOpportunities(filteredVideoAdData);
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
    fetchAsmrDownloads();
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
        return false;
      default:
        return false;
    }
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

  const getAccessLevelBadgeForAudio = (product: AudioProduct) => {
    const accessLevel = product.access_level || (product.is_free ? "public" : "paid");
    
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {product.is_adult_content && !userProfile?.adult_content_restricted && (
          <Badge className="bg-orange-600 hover:bg-orange-700 text-xs flex items-center gap-1">
            <Shield className="w-3 h-3" />
            18+
          </Badge>
        )}
        
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

  const handleVideoAdDownload = async (opportunity: VideoAdOpportunity) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download video ad opportunities",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user is an approved merchant
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, approval_status')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.user_type !== 'merchant' || profile.approval_status !== 'approved') {
        toast({
          title: "Access Denied",
          description: "Only approved merchants can download video ad opportunities",
          variant: "destructive"
        });
        return;
      }

      // Check if already downloaded
      const { data: existingDownload, error: checkError } = await supabase
        .from('video_ad_downloads')
        .select('id')
        .eq('merchant_id', user.id)
        .eq('video_ad_opportunity_id', opportunity.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingDownload) {
        toast({
          title: "Already in your library",
          description: "This video ad opportunity is already available in your dashboard",
        });
        return;
      }

      // Record the download
      const { error: insertError } = await supabase
        .from('video_ad_downloads')
        .insert({
          merchant_id: user.id,
          video_ad_opportunity_id: opportunity.id
        });

      if (insertError) throw insertError;

      toast({
        title: "Video Ad Opportunity Downloaded",
        description: "The audio has been added to your library! Check your dashboard to submit your video.",
      });

      // Refresh to update UI
      window.location.reload();

    } catch (error: any) {
      console.error('Error downloading video ad opportunity:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download video ad opportunity",
        variant: "destructive"
      });
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
      
      // Check if this is an album purchase
      const isAlbumPurchase = product.album_id && (product as any).isAlbum;
      
      if (isAlbumPurchase) {
        // Fetch all tracks in the album
        const { data: albumTracks, error: tracksError } = await supabase
          .from('audio_products')
          .select('id')
          .eq('album_id', product.album_id);

        if (tracksError) throw tracksError;

        // Check if any track already purchased
        const trackIds = albumTracks?.map(t => t.id) || [];
        const { data: existingPurchases, error: checkError } = await supabase
          .from('user_purchases')
          .select('audio_product_id')
          .eq('user_id', user.id)
          .in('audio_product_id', trackIds);

        if (checkError) throw checkError;

        if (existingPurchases && existingPurchases.length > 0) {
          toast({
            title: "Already in your library",
            description: "This album is already available in your audio player",
          });
          return;
        }

        // Add all album tracks to user's library
        const purchases = trackIds.map(trackId => ({
          user_id: user.id,
          audio_product_id: trackId,
          is_free_download: true,
          amount_paid: 0,
          paypal_transaction_id: null
        }));

        const { error: insertError } = await supabase
          .from('user_purchases')
          .insert(purchases);

        if (insertError) throw insertError;

        toast({
          title: "Album added to library!",
          description: `All ${trackIds.length} tracks have been added to your audio player`,
        });

        return;
      }

      // Single track download
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

      // Track ASMR downloads for Apply button functionality
      if (product.audio_type === 'asmr' && product.access_level === 'merchant_only') {
        const { error: asmrDownloadError } = await supabase
          .from('asmr_downloads')
          .insert({
            merchant_id: user.id,
            audio_product_id: product.id
          });

        if (asmrDownloadError) {
          console.error('Error recording ASMR download:', asmrDownloadError);
        } else {
          // Update local state to show Apply button immediately
          setAsmrDownloads(prev => [...prev, product.id]);
        }
      }

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

  const handleAsmrApply = (product: AudioProduct) => {
    setSelectedAsmrProduct(product);
    setAsmrSubmissionModalOpen(true);
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

    if (accessLevel === "merchant_only") {
      if (!canDownloadAudio(product)) {
        toast({
          title: "Access Restricted",
          description: "This content is only available to approved merchants",
          variant: "destructive"
        });
        return;
      }
      await handleFreeAudioDownload(product);
      return;
    }

    if (accessLevel === "public") {
      await handleFreeAudioDownload(product);
      return;
    }

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

  const canDownloadVideoAdOpportunity = (opportunity: VideoAdOpportunity) => {
    if (!user) return false;
    
    const accessLevel = opportunity.access_level || 'public';
    
    switch (accessLevel) {
      case "public":
        return true;
      case "merchant_only":
        return userProfile?.user_type === 'merchant' && userProfile?.approval_status === 'approved';
      case "paid":
        return false;
      default:
        return false;
    }
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return <Badge className="bg-green-600 hover:bg-green-700 text-xs">Public</Badge>;
      case 'merchant_only':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-xs">Merchants Only</Badge>;
      case 'paid':
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">Paid</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{accessLevel}</Badge>;
    }
  };

  const handleVideoAdOpportunityDownload = async (opportunity: VideoAdOpportunity) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download opportunities",
        variant: "destructive"
      });
      return;
    }

    const accessLevel = opportunity.access_level || 'public';

    if (accessLevel === "merchant_only") {
      if (!canDownloadVideoAdOpportunity(opportunity)) {
        toast({
          title: "Access Restricted",
          description: "This opportunity is only available to approved merchants",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { data: existingDownload, error: checkError } = await supabase
        .from('video_ad_downloads')
        .select('id')
        .eq('merchant_id', user.id)
        .eq('video_ad_opportunity_id', opportunity.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing downloads:', checkError);
        throw new Error('Failed to check existing downloads');
      }

      if (existingDownload) {
        setSelectedOpportunity(opportunity);
        setSubmissionModalOpen(true);
        return;
      }

      const { error: insertError } = await supabase
        .from('video_ad_downloads')
        .insert({
          merchant_id: user.id,
          video_ad_opportunity_id: opportunity.id
        });

      if (insertError) {
        console.error('Error recording download:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      toast({
        title: "Opportunity downloaded!",
        description: "You can now create your video submission. Check your merchant dashboard for details.",
      });

      setSelectedOpportunity(opportunity);
      setSubmissionModalOpen(true);

    } catch (error: any) {
      console.error('Error downloading opportunity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download opportunity. Please try again.",
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Content Store</h1>
              <p className="text-sm sm:text-base text-gray-300">Your boutique shop for film, music, and content creators</p>
            </div>
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
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 sm:w-6 sm:h-6" />
            Astrology Readings & Consultations
          </h2>
          <AstrologyStoreSection />
        </div>

        {/* Fashion Products Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Shirt className="w-5 h-5 sm:w-6 sm:h-6" />
            Fashion
          </h2>
          <FashionStoreSection />
        </div>

        {/* Food Products Section */}
        <FoodStoreSection />

        {/* Dance Products Section */}
        <DanceStoreSection />

        {/* Podcasts Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <AudioLines className="w-5 h-5 sm:w-6 sm:h-6" />
            Podcasts
          </h2>
          
          {audioProducts.filter(p => p.audio_type === 'podcast').length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <AudioLines className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Podcasts Available</h3>
                <p className="text-gray-400">Podcasts will appear here when published.</p>
              </CardContent>
            </Card>
          ) : (
            <Carousel
              className="w-full"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {audioProducts.filter(p => p.audio_type === 'podcast').map((product) => (
                  <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors h-full">
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
                        {product.description && (
                          <ExpandableDescription 
                            description={product.description} 
                            maxLength={80}
                            className="mt-2"
                          />
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Badge variant="secondary" className="capitalize text-xs px-2 py-1">
                              Podcast
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            {getAccessLevelBadgeForAudio(product)}
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {product.access_level === 'merchant_only' ? (
                              <DownloadOpportunityChecker
                                audioProductId={product.id}
                                maxDownloads={product.max_downloads}
                                downloadTable="podcast_downloads"
                              >
                                {(remainingDownloads, isExhausted) => (
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="text-xs text-right">
                                      {product.max_downloads && !isExhausted && (
                                        <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">
                                          {remainingDownloads !== null ? remainingDownloads : product.max_downloads} opportunity{(remainingDownloads !== null ? remainingDownloads : product.max_downloads) !== 1 ? 's' : ''} left
                                        </Badge>
                                      )}
                                    </div>
                                    {!isExhausted && (
                                      <PodcastDownloadManager 
                                        audioProduct={{
                                          id: product.id,
                                          title: product.title,
                                          audio_file_url: product.audio_file_url,
                                          access_level: product.access_level || (product.is_free ? "public" : "paid"),
                                          audio_type: product.audio_type,
                                          max_downloads: product.max_downloads
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </DownloadOpportunityChecker>
                            ) : product.access_level === 'paid' && product.price ? (
                              <Button
                                onClick={() => handleAudioPurchase(product)}
                                disabled={purchasingId === product.id}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                                size="sm"
                              >
                                <DollarSign className="w-3 h-3 mr-1" />
                                {purchasingId === product.id ? 'Processing...' : `Buy $${product.price.toFixed(2)}`}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleFreeAudioDownload(product)}
                                disabled={!canDownloadAudio(product)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                                size="sm"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                {getDownloadButtonText(product)}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex -left-4 bg-gray-800 border-gray-600 text-white hover:bg-gray-700" />
              <CarouselNext className="hidden sm:flex -right-4 bg-gray-800 border-gray-600 text-white hover:bg-gray-700" />
            </Carousel>
          )}
        </div>

        {/* Music Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <AudioLines className="w-5 h-5 sm:w-6 sm:h-6" />
            Music
          </h2>
          
          {audioProducts.filter(p => p.audio_type === 'music').length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <AudioLines className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Music Available</h3>
                <p className="text-gray-400">Music will appear here when published.</p>
              </CardContent>
            </Card>
          ) : (
            <Carousel
              className="w-full"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {audioProducts.filter(p => p.audio_type === 'music').map((product) => (
                  <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors h-full">
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
                        <ProductInstructionalText 
                          productType={product.access_level === 'merchant_only' ? 'cover_submission' : 'cover_submission'} 
                          isForSale={product.access_level === 'paid'}
                          isFree={product.is_free}
                          isMerchantOnly={product.access_level === 'merchant_only'}
                        />
                        {product.description && (
                          <ExpandableDescription 
                            description={product.description} 
                            maxLength={80}
                            className="mt-2"
                          />
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-4">
                          {/* Music Preview Player */}
                          {product.preview_start_time !== null && (
                            <AudioPreviewPlayer
                              audioUrl={product.audio_file_url}
                              previewStartTime={product.preview_start_time || 0}
                              previewDuration={product.preview_duration || 30}
                              thumbnailUrl={product.thumbnail_url}
                              productId={product.id}
                              currentlyPlayingId={currentlyPlayingId}
                              onPlayStart={() => setCurrentlyPlayingId(product.id)}
                              onPlayStop={() => setCurrentlyPlayingId(null)}
                            />
                          )}

                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Badge variant="secondary" className="capitalize text-xs px-2 py-1">
                              Music
                            </Badge>
                            {(product as any).isAlbum && (product as any).albumId && (
                              <AlbumTracklistHover 
                                albumId={(product as any).albumId} 
                                albumName={product.title}
                              />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            {getAccessLevelBadgeForAudio(product)}
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => handleAudioPurchase(product)}
                              disabled={purchasingId === product.id || (!canDownloadAudio(product) && (product.access_level === "merchant_only"))}
                              className="bg-primary hover:bg-primary/90 text-xs h-7 px-3"
                            >
                              {purchasingId === product.id ? (
                                "Processing..."
                              ) : (
                                <>
                                  {(product.access_level === "paid") ? <DollarSign className="w-3 h-3 mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                                  {getDownloadButtonText(product)}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex -left-4 bg-gray-800 border-gray-600 text-white hover:bg-gray-700" />
              <CarouselNext className="hidden sm:flex -right-4 bg-gray-800 border-gray-600 text-white hover:bg-gray-700" />
            </Carousel>
          )}
        </div>

        {/* Video Ad Opportunities Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            Video Ad Opportunities
          </h2>
          
          {videoAdOpportunities.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Video Ad Opportunities Available</h3>
                <p className="text-gray-400">Check back later for new opportunities!</p>
              </CardContent>
            </Card>
          ) : (
            <Carousel
              className="w-full"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {videoAdOpportunities.map((opportunity) => (
                  <CarouselItem key={opportunity.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors h-full">
                      <CardHeader className="p-4">
                        {opportunity.thumbnail_url ? (
                          <img
                            src={opportunity.thumbnail_url}
                            alt={opportunity.title}
                            className="w-full h-40 object-cover rounded-lg mb-3"
                          />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mb-3 flex items-center justify-center">
                            <Video className="w-12 h-12 text-white" />
                          </div>
                        )}
                        <CardTitle className="text-white text-lg line-clamp-2">{opportunity.title}</CardTitle>
                        <ProductInstructionalText productType="video_ad" />
                        <ExpandableDescription 
                          description={opportunity.description || ""}
                          maxLength={80}
                          className="mt-2"
                        />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {opportunity.audio_type}
                            </Badge>
                            <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                              ${opportunity.payment_amount}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                             <div className="flex gap-1 flex-wrap">
                               <Badge className="bg-blue-600 hover:bg-blue-700 capitalize text-xs">
                                 {opportunity.target_platform}
                               </Badge>
                               {getAccessLevelBadge(opportunity.access_level || 'public')}
                               {opportunity.is_adult_content && !userProfile?.adult_content_restricted && (
                                 <Badge className="bg-orange-600 hover:bg-orange-700 text-xs flex items-center gap-1">
                                   <Shield className="w-3 h-3" />
                                   18+
                                 </Badge>
                               )}
                               <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">
                                 {opportunity.available_spots} spot{opportunity.available_spots !== 1 ? 's' : ''} left
                               </Badge>
                             </div>
                            
                             <div className="flex gap-1">
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleVideoAdDownload(opportunity)}
                                 className="text-xs h-7 px-2"
                               >
                                 <Download className="w-3 h-3 mr-1" />
                                 Add to Library
                               </Button>
                             </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            </Carousel>
          )}
        </div>
      </div>

      {selectedOpportunity && (
        <VideoAdSubmissionModal
          isOpen={submissionModalOpen}
          onClose={() => setSubmissionModalOpen(false)}
          onSuccess={() => {
            setSubmissionModalOpen(false);
            fetchProducts();
          }}
          opportunity={selectedOpportunity}
        />
      )}

      {selectedAsmrProduct && (
        <ASMRSubmissionModal
          open={asmrSubmissionModalOpen}
          onOpenChange={setAsmrSubmissionModalOpen}
          audioProduct={selectedAsmrProduct}
          onSuccess={() => {
            setAsmrSubmissionModalOpen(false);
            toast({
              title: "Application Submitted",
              description: "Your ASMR application has been submitted for review.",
            });
          }}
        />
      )}
    </div>
  );
};

export default StorePage;
