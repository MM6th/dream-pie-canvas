import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Moon, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";

interface PodcastTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  audio_type?: string;
  access_level?: "public" | "merchant_only" | "paid" | null;
}

const TIER_CONFIG = [
  { key: 'moon', label: 'Moon Tier', price: 4.99, icon: Moon, color: 'text-blue-400', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-900/10' },
  { key: 'venus', label: 'Venus Tier', price: 9.99, icon: Star, color: 'text-pink-400', borderColor: 'border-pink-500/30', bgColor: 'bg-pink-900/10' },
  { key: 'jupiter', label: 'Jupiter Tier', price: 14.99, icon: Sparkles, color: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-900/10' },
] as const;

const OwnPodcastsByTier = () => {
  const { user } = useAuth();
  const [tierPodcasts, setTierPodcasts] = useState<Record<string, PodcastTrack[]>>({
    moon: [],
    venus: [],
    jupiter: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOwnPodcasts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('audio_products')
        .select('id, title, artist_name, audio_file_url, thumbnail_url, audio_type, access_level, price')
        .eq('merchant_id', user.id)
        .eq('audio_type', 'podcast')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching own podcasts:', error);
        setLoading(false);
        return;
      }

      const grouped: Record<string, PodcastTrack[]> = { moon: [], venus: [], jupiter: [] };

      (data || []).forEach((podcast: any) => {
        const price = podcast.price;
        if (price === 14.99) {
          grouped.jupiter.push(podcast);
        } else if (price === 9.99) {
          grouped.venus.push(podcast);
        } else {
          // Default to moon tier (4.99 or any other price)
          grouped.moon.push(podcast);
        }
      });

      setTierPodcasts(grouped);
      setLoading(false);
    };

    fetchOwnPodcasts();
  }, [user]);

  const totalPodcasts = Object.values(tierPodcasts).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Loading your podcasts...</p>
        </CardContent>
      </Card>
    );
  }

  if (totalPodcasts === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Mic className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">My Published Podcasts</h3>
        <Badge variant="outline" className="border-gray-600 text-gray-300 ml-1">
          {totalPodcasts} episodes
        </Badge>
      </div>

      {TIER_CONFIG.map(({ key, label, price, icon: Icon, color, borderColor, bgColor }) => {
        const tracks = tierPodcasts[key];
        if (tracks.length === 0) return null;

        return (
          <Card key={key} className={`${bgColor} ${borderColor} border`}>
            <CardHeader className="pb-2">
              <CardTitle className={`flex items-center gap-2 text-sm ${color}`}>
                <Icon className="w-4 h-4" />
                {label}
                <span className="text-gray-400 font-normal text-xs">
                  (${price}/mo · {tracks.length} episode{tracks.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <PodcastAudioPlayer tracks={tracks} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OwnPodcastsByTier;
