import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, ExternalLink, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string;
  audio_file_url: string;
  thumbnail_url?: string;
  price?: number;
  is_free: boolean;
}

interface UserPlaylist {
  id: string;
  display_order: number;
  audio_products: AudioProduct;
}

interface UserProfile {
  id: string;
  playlist_public: boolean;
}

interface ProfilePlaylistProps {
  userId: string;
  isOwnProfile?: boolean;
}

const ProfilePlaylist = ({ userId, isOwnProfile = false }: ProfilePlaylistProps) => {
  const [playlist, setPlaylist] = useState<UserPlaylist[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, playlist_public')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const togglePlaylistVisibility = async () => {
    if (!userProfile || !isOwnProfile) return;

    try {
      const newVisibility = !userProfile.playlist_public;
      
      const { error } = await supabase
        .from('profiles')
        .update({ playlist_public: newVisibility })
        .eq('id', userId);

      if (error) {
        console.error('Error updating playlist visibility:', error);
        toast({
          title: "Error",
          description: "Failed to update playlist visibility.",
          variant: "destructive",
        });
      } else {
        setUserProfile(prev => prev ? { ...prev, playlist_public: newVisibility } : null);
        toast({
          title: "Success",
          description: `Playlist is now ${newVisibility ? 'public' : 'private'}.`,
        });
      }
    } catch (error) {
      console.error('Error updating playlist visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update playlist visibility.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPlaylist();
    fetchUserProfile();
  }, [userId]);

  const fetchPlaylist = async () => {
    try {
      const { data, error } = await supabase
        .from('user_playlists')
        .select(`
          id,
          display_order,
          audio_product_id,
          audio_products!audio_product_id (
            id,
            title,
            artist_name,
            audio_file_url,
            thumbnail_url,
            price,
            is_free
          )
        `)
        .eq('user_id', userId)
        .order('display_order', { ascending: true })
        .limit(5);

      if (error) throw error;
      
      // Filter out any entries where the audio product doesn't exist
      const validPlaylist = (data || []).filter(item => item.audio_products);
      setPlaylist(validPlaylist as UserPlaylist[]);
    } catch (error) {
      console.error('Error fetching playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (audioProduct: AudioProduct) => {
    if (currentlyPlaying === audioProduct.id) {
      // Pause current
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.src = audioProduct.audio_file_url;
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setCurrentlyPlaying(audioProduct.id);
        
        // Show toast with store link
        toast({
          title: `Now Playing: ${audioProduct.title}`,
          description: `By ${audioProduct.artist_name}`,
          action: (
            <Button
              size="sm"
              onClick={() => navigate('/store')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View in Store
            </Button>
          ),
          duration: 5000,
        });

        // Auto-stop after 30 seconds
        timeoutRef.current = setTimeout(() => {
          audioRef.current?.pause();
          setCurrentlyPlaying(null);
        }, 30000);
      }
    }
  };

  const handleAudioEnded = () => {
    setCurrentlyPlaying(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="w-5 h-5" />
            Profile Playlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400">Loading playlist...</div>
        </CardContent>
      </Card>
    );
  }

  if (playlist.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="w-5 h-5" />
            Profile Playlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400">
            {isOwnProfile ? "Add songs to your profile playlist to showcase your favorites!" : "No songs in playlist yet."}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Music className="w-5 h-5" />
          Profile Playlist
          <span className="text-sm text-gray-400 font-normal">
            (30-second previews)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {playlist.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
          >
            <div className="relative w-12 h-12 flex-shrink-0">
              {item.audio_products.thumbnail_url ? (
                <img
                  src={item.audio_products.thumbnail_url}
                  alt={item.audio_products.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full bg-gray-600 rounded flex items-center justify-center">
                  <Music className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <Button
                size="sm"
                onClick={() => handlePlayPause(item.audio_products)}
                className="absolute inset-0 bg-black/50 hover:bg-black/70 text-white rounded"
              >
                {currentlyPlaying === item.audio_products.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate">
                {item.audio_products.title}
              </h4>
              <p className="text-gray-400 text-sm truncate">
                {item.audio_products.artist_name}
              </p>
              <p className="text-gray-500 text-xs">
                {item.audio_products.is_free ? 'Free' : `$${item.audio_products.price}`}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/store')}
              className="flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};

export default ProfilePlaylist;