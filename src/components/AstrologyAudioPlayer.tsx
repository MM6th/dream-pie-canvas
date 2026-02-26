import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Star, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AstrologyTrack {
  id: string;
  title: string;
  artist_name: string;
  audio_file_url: string;
  thumbnail_url: string | null;
  delivery_type: string;
  attachment_url?: string | null;
  attachment_filename?: string | null;
}

const AstrologyAudioPlayer = () => {
  const [tracks, setTracks] = useState<AstrologyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();

  const currentTrack = tracks[currentTrackIndex];

  // Fetch delivered astrology audio readings
  useEffect(() => {
    const fetchDeliveredReadings = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("astrology_deliveries")
          .select(`
            id,
            admin_video_url,
            attachment_url,
            attachment_filename,
            astrology_products (
              title,
              description,
              delivery_type,
              thumbnail_url
            )
          `)
          .eq("buyer_id", user.id)
          .eq("status", "delivered")
          .not("admin_video_url", "is", null)
          .order("delivered_at", { ascending: false });

        if (error) throw error;

        const audioTracks: AstrologyTrack[] = (data || []).map((d: any) => ({
          id: d.id,
          title: d.astrology_products?.title || 'Astrology Reading',
          artist_name: 'Astrology Reading',
          audio_file_url: d.admin_video_url,
          thumbnail_url: d.astrology_products?.thumbnail_url || null,
          delivery_type: d.astrology_products?.delivery_type || 'audio_file',
          attachment_url: d.attachment_url,
          attachment_filename: d.attachment_filename,
        }));

        setTracks(audioTracks);
      } catch (error) {
        console.error("Error fetching astrology readings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveredReadings();

    // Realtime subscription
    const channel = supabase
      .channel("astrology-player-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "astrology_deliveries" }, () => {
        fetchDeliveredReadings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.audio_file_url;
    audio.load();
    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentTrackIndex, currentTrack]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
    setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const previousTrack = () => {
    if (currentTrackIndex > 0) setCurrentTrackIndex(prev => prev - 1);
  };

  const nextTrack = () => {
    if (currentTrackIndex < tracks.length - 1) setCurrentTrackIndex(prev => prev + 1);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (track: AstrologyTrack) => {
    try {
      toast.info('Starting download...');
      const response = await fetch(track.audio_file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = track.delivery_type === 'audio_file' ? 'mp3' : 'mp4';
      link.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) return null;

  if (!tracks.length) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="text-gray-400" size={24} />
            <h3 className="text-xl font-bold text-white">Astrology Player</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-medium">No readings available</p>
                <p className="text-gray-400 text-sm">Purchase astrology readings from the store to get started</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" className="bg-gray-600 hover:bg-gray-700" disabled>
                Play
              </Button>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full w-0"></div>
              </div>
              <span className="text-gray-400 text-sm">0:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Star className="text-gray-400" size={24} />
          <h3 className="text-xl font-bold text-white">Astrology Player</h3>
          <span className="text-gray-400 text-sm">({tracks.length} readings)</span>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          {/* Track Info */}
          <div className="flex items-center gap-4 mb-4">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <Star className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-white font-medium">{currentTrack?.title || 'No reading selected'}</p>
              <p className="text-gray-400 text-sm">Astrology Reading</p>
              <p className="text-gray-500 text-xs">
                Reading {currentTrackIndex + 1} of {tracks.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[duration ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-gray-400 text-sm mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={previousTrack} disabled={currentTrackIndex === 0} className="text-white hover:bg-gray-700">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={togglePlay} disabled={!currentTrack} className="bg-primary hover:bg-primary/90">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={nextTrack} disabled={currentTrackIndex === tracks.length - 1} className="text-white hover:bg-gray-700">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={() => currentTrack && handleDownload(currentTrack)} disabled={!currentTrack} className="text-white hover:bg-gray-700" title="Download to device">
                <Download className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2 w-28">
                <Button size="sm" variant="ghost" onClick={toggleMute} className="text-white hover:bg-gray-700">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <audio ref={audioRef} preload="metadata" />
      </CardContent>
    </Card>
  );
};

export default AstrologyAudioPlayer;
