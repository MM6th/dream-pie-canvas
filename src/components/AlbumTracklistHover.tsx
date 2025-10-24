import React, { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AlbumTrack {
  id: string;
  title: string;
  artist_name: string | null;
  track_number: number;
  audio_file_url: string;
  preview_start_time: number | null;
  preview_duration: number | null;
  featuring_artist_name?: string | null;
}

interface AlbumTracklistHoverProps {
  albumId: string;
  albumName: string;
}

const AlbumTracklistHover = ({ albumId, albumName }: AlbumTracklistHoverProps) => {
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchAlbumTracks();
    
    // Cleanup audio on unmount
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [albumId]);

  const fetchAlbumTracks = async () => {
    setLoading(true);
    try {
      const { data: albumTracksData, error: tracksError } = await supabase
        .from('album_tracks')
        .select(`
          track_number,
          featuring_artist_name,
          audio_products!inner (
            id,
            title,
            artist_name,
            audio_file_url,
            preview_start_time,
            preview_duration
          )
        `)
        .eq('album_id', albumId)
        .order('track_number', { ascending: true });

      if (tracksError) throw tracksError;

      const formattedTracks = albumTracksData?.map((track: any) => ({
        id: track.audio_products.id,
        title: track.audio_products.title,
        artist_name: track.audio_products.artist_name,
        track_number: track.track_number,
        audio_file_url: track.audio_products.audio_file_url,
        preview_start_time: track.audio_products.preview_start_time,
        preview_duration: track.audio_products.preview_duration,
        featuring_artist_name: track.featuring_artist_name
      })) || [];

      setTracks(formattedTracks);
    } catch (error) {
      console.error('Error fetching album tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = (track: AlbumTrack) => {
    if (playingTrackId === track.id) {
      // Stop current track
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingTrackId(null);
      return;
    }

    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    // Create new audio instance
    const newAudio = new Audio(track.audio_file_url);
    const startTime = track.preview_start_time || 0;
    const duration = track.preview_duration || 30;
    
    newAudio.currentTime = startTime;
    setAudio(newAudio);
    setPlayingTrackId(track.id);

    // Play preview
    newAudio.play().catch(err => {
      console.error('Error playing preview:', err);
      setPlayingTrackId(null);
    });

    // Stop after preview duration
    const stopTimeout = setTimeout(() => {
      newAudio.pause();
      newAudio.currentTime = startTime;
      setPlayingTrackId(null);
    }, duration * 1000);

    // Cleanup on audio end
    newAudio.onended = () => {
      clearTimeout(stopTimeout);
      setPlayingTrackId(null);
    };
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge 
          variant="outline" 
          className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-500 px-2 py-1 cursor-pointer"
        >
          Album
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 bg-gray-900 border-gray-700 text-white max-h-96 overflow-y-auto"
        align="start"
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-lg text-purple-400">{albumName}</h4>
            <p className="text-xs text-gray-400 mt-1">{tracks.length} tracks</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <div 
                  key={track.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 transition-colors group"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-purple-600/20"
                    onClick={() => handlePlayPreview(track)}
                  >
                    {playingTrackId === track.id ? (
                      <Pause className="w-3 h-3 text-purple-400" />
                    ) : (
                      <Play className="w-3 h-3 text-gray-400 group-hover:text-purple-400" />
                    )}
                  </Button>
                  
                  <span className="text-xs text-gray-500 min-w-[1.5rem]">
                    {track.track_number}.
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-white">
                      {track.title}
                    </p>
                    {track.featuring_artist_name && (
                      <p className="text-xs text-gray-400 truncate">
                        feat. {track.featuring_artist_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default AlbumTracklistHover;
