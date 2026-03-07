import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AudioLines, Star, Download, DollarSign, Lock, CheckCircle, Moon, Sparkles } from "lucide-react";
import SixthPriceTag from "@/components/SixthPriceTag";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePodcastSubscriptions } from "@/hooks/usePodcastSubscription";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { toast } from "sonner";

interface PodcastProduct {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  audio_file_url: string;
  artist_name: string | null;
  access_level: string | null;
  price: number | null;
  is_free: boolean;
  merchant_id: string;
  subscription_enabled?: boolean;
  subscription_tier?: string;
  tier_description?: string;
  podcast_recording_id?: string;
}

interface ProfilePodcastSectionProps {
  userId: string;
  isVisible: boolean;
  isOwnProfile: boolean;
}

const ProfilePodcastSection: React.FC<ProfilePodcastSectionProps> = ({ 
  userId, 
  isVisible, 
  isOwnProfile 
}) => {
  const { user } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  
  const merchantIds = podcasts.length > 0 ? [userId] : [];
  const { subscriptionMap } = usePodcastSubscriptions(merchantIds);

  useEffect(() => {
    fetchPodcasts();
  }, [userId]);

  const fetchPodcasts = async () => {
    try {
      const { data: audioData, error: audioError } = await supabase
        .from('audio_products')
        .select('*')
        .eq('merchant_id', userId)
        .eq('audio_type', 'podcast')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (audioError) {
        console.error('Error fetching podcasts:', audioError);
        return;
      }

      if (audioData && audioData.length > 0) {
        // Fetch podcast_recordings and podcast_settings in parallel
        const audioUrls = audioData.map(p => p.audio_file_url);
        const [recordingsResult, settingsResult] = await Promise.all([
          supabase
            .from('podcast_recordings')
            .select('id, audio_url, subscription_enabled, subscription_tier, tier_description')
            .in('audio_url', audioUrls),
          supabase
            .from('podcast_settings')
            .select('merchant_id, moon_tier_description, venus_tier_description, jupiter_tier_description')
            .eq('merchant_id', userId)
            .maybeSingle(),
        ]);

        const podcastRecordings = recordingsResult.data;
        const merchantSettings = settingsResult.data;
        const tierDescMap: Record<string, string | null> = merchantSettings
          ? { moon: merchantSettings.moon_tier_description, venus: merchantSettings.venus_tier_description, jupiter: merchantSettings.jupiter_tier_description }
          : {};

        let enrichedData = audioData;
        if (podcastRecordings) {
          const recordingsMap = new Map(podcastRecordings.map(r => [r.audio_url, r]));
          enrichedData = audioData.map(product => {
            const recording = recordingsMap.get(product.audio_file_url);
            // Fall back to podcast_settings tier description
            let description = recording?.tier_description || null;
            if (!description && recording?.subscription_enabled && recording?.subscription_tier) {
              description = tierDescMap[recording.subscription_tier] || null;
            }
            return {
              ...product,
              subscription_enabled: recording?.subscription_enabled || false,
              subscription_tier: recording?.subscription_tier || null,
              tier_description: description,
              podcast_recording_id: recording?.id || null,
            };
          });
        }

        setPodcasts(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching podcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = async (podcast: PodcastProduct) => {
    if (!user) {
      toast.error('Please sign in to add to your library');
      return;
    }

    try {
      // Check if already in library
      const { data: existingDownload } = await supabase
        .from('podcast_downloads')
        .select('id')
        .eq('audio_product_id', podcast.id)
        .eq('merchant_id', user.id)
        .single();

      if (existingDownload) {
        toast.info('Already in your library');
        return;
      }

      const { error } = await supabase
        .from('podcast_downloads')
        .insert({
          audio_product_id: podcast.id,
          merchant_id: user.id,
        });

      if (error) throw error;
      toast.success('Added to your library!');
    } catch (error) {
      console.error('Error adding to library:', error);
      toast.error('Failed to add to library');
    }
  };

  const handleSubscribe = async (podcast: PodcastProduct) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    if (!podcast.podcast_recording_id) {
      toast.error('Subscription not available for this podcast');
      return;
    }

    setSubscribingId(podcast.id);

    try {
      const tier = podcast.subscription_tier || 'moon';
      const returnUrl = `${window.location.origin}/payment-success?type=subscription&podcastId=${podcast.podcast_recording_id}&tier=${tier}`;
      const cancelUrl = `${window.location.origin}/payment-cancelled`;

      const { data, error } = await supabase.functions.invoke('create-podcast-subscription', {
        body: {
          podcastRecordingId: podcast.podcast_recording_id,
          tier,
          returnUrl,
          cancelUrl,
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Subscription creation error:', error);
        throw error;
      }

      if (data?.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast.error(error.message || 'Failed to start subscription. Please try again.');
    } finally {
      setSubscribingId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (podcasts.length === 0) {
    return null;
  }

  // If not visible and not own profile, show locked state
  if (!isVisible && !isOwnProfile) {
    return (
      <Card className="bg-gray-800 border-gray-700 mt-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AudioLines className="w-5 h-5" />
            Podcasts
            <Lock className="w-4 h-4 text-gray-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">
            Podcasts are only visible to followers
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasSubscription = subscriptionMap[userId];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <AudioLines className="w-6 h-6 text-white" />
        <h2 className="text-2xl font-bold text-white">Podcasts</h2>
      </div>

      <Carousel
        className="w-full"
        opts={{
          align: "start",
          loop: podcasts.length > 1,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {podcasts.map((podcast) => (
            <CarouselItem key={podcast.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors h-full">
                <CardHeader className="p-4">
                  {podcast.thumbnail_url ? (
                    <img
                      src={podcast.thumbnail_url}
                      alt={podcast.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                      <AudioLines className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <CardTitle className="text-white text-lg line-clamp-2">{podcast.title}</CardTitle>
                  {podcast.artist_name && (
                    <p className="text-gray-400 text-sm">by {podcast.artist_name}</p>
                  )}
                  {podcast.description && (
                    <ExpandableDescription 
                      description={podcast.description} 
                      maxLength={80}
                      className="mt-2"
                    />
                  )}
                  {/* Subscription Tier Description */}
                  {podcast.subscription_enabled && podcast.tier_description && (
                    <div className="mt-3 p-2 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-1 mb-1">
                        {podcast.subscription_tier === 'moon' ? (
                          <Moon className="w-3 h-3 text-primary" />
                        ) : podcast.subscription_tier === 'jupiter' ? (
                          <Sparkles className="w-3 h-3 text-primary" />
                        ) : (
                          <Star className="w-3 h-3 text-primary" />
                        )}
                        <span className="text-xs font-medium text-primary capitalize">
                          {podcast.subscription_tier || 'Premium'} Tier Perks
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-3">
                        {podcast.tier_description}
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge variant="secondary" className="capitalize text-xs px-2 py-1">
                        Podcast
                      </Badge>
                      {/* Show subscription status badge only */}
                      {hasSubscription && (
                        <Badge className="bg-green-600 hover:bg-green-700 text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active Subscription
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {hasSubscription ? (
                        <Button
                          onClick={() => handleAddToLibrary(podcast)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                          size="sm"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Add to Library
                        </Button>
                      ) : podcast.is_free ? (
                        <Button
                          onClick={() => handleAddToLibrary(podcast)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                          size="sm"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Free Download
                        </Button>
                      ) : podcast.access_level === 'paid' && podcast.price ? (
                        <Button
                          onClick={() => handleSubscribe(podcast)}
                          disabled={subscribingId === podcast.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                          size="sm"
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          {subscribingId === podcast.id ? 'Processing...' : `Subscribe $${podcast.price.toFixed(2)}/mo`}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {podcasts.length > 1 && (
          <>
            <CarouselPrevious className="hidden sm:flex -left-4 bg-gray-800 border-gray-600 text-white hover:bg-gray-700" />
            <CarouselNext className="hidden sm:flex -right-4 bg-gray-800 border-gray-600 text-white hover:bg-gray-700" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default ProfilePodcastSection;