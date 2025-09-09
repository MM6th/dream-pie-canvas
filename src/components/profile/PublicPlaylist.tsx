import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, ShoppingCart, Music } from 'lucide-react';

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string;
  price: number;
  audio_file_url: string;
  thumbnail_url: string;
}

interface UserPurchase {
  id: string;
  audio_product_id: string;
  audio_products: AudioProduct;
}

interface PublicPlaylistProps {
  userId: string;
}

export default function PublicPlaylist({ userId }: PublicPlaylistProps) {
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserPurchases();
    checkPlaylistVisibility();
  }, [userId]);

  const checkPlaylistVisibility = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('playlist_public')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking playlist visibility:', error);
      } else {
        setIsPublic(data?.playlist_public || false);
      }
    } catch (error) {
      console.error('Error checking playlist visibility:', error);
    }
  };

  const fetchUserPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          id,
          audio_product_id,
          audio_products!inner (
            id,
            title,
            artist_name,
            price,
            audio_file_url,
            thumbnail_url,
            audio_type
          )
        `)
        .eq('user_id', userId)
        .eq('audio_products.audio_type', 'music')
        .order('purchase_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching user purchases:', error);
      } else {
        setPurchases(data || []);
      }
    } catch (error) {
      console.error('Error fetching user purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (audioProduct: AudioProduct) => {
    if (currentlyPlaying === audioProduct.id) {
      // Pause the current audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentlyPlaying(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      // Play the selected audio
      if (audioRef.current) {
        audioRef.current.src = audioProduct.audio_file_url;
        audioRef.current.play();
      }
      setCurrentlyPlaying(audioProduct.id);

      // Set 30-second limit for preview
      timeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setCurrentlyPlaying(null);
        
        // Show toast with link to store
        toast({
          title: "Preview ended",
          description: (
            <div className="flex items-center gap-2">
              <span>Want to hear the full track?</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigate('/');
                  // Dispatch custom event to trigger store view
                  setTimeout(() => {
                    window.dispatchEvent(new Event('navigateToStore'));
                  }, 100);
                }}
                className="h-6 px-2 py-1 text-xs"
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Visit Store
              </Button>
            </div>
          ),
          duration: 5000,
        });
      }, 30000); // 30 seconds
    }
  };

  const handleAudioEnded = () => {
    setCurrentlyPlaying(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading playlist...</div>
        </CardContent>
      </Card>
    );
  }

  if (!isPublic || purchases.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Music Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {purchases.map((purchase) => {
          const audioProduct = purchase.audio_products;
          const isPlaying = currentlyPlaying === audioProduct.id;

          return (
            <div
              key={purchase.id}
              className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {audioProduct.thumbnail_url && (
                  <img
                    src={audioProduct.thumbnail_url}
                    alt={audioProduct.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute inset-0 w-full h-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => handlePlayPause(audioProduct)}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{audioProduct.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {audioProduct.artist_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${audioProduct.price?.toFixed(2) || 'Free'}
                </p>
              </div>
            </div>
          );
        })}

        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          className="hidden"
        />

        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate('/');
              // Dispatch custom event to trigger store view
              setTimeout(() => {
                window.dispatchEvent(new Event('navigateToStore'));
              }, 100);
            }}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Browse More Music
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}