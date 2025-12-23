import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Mic, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PodcastVideo {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

interface PodcastsSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

const PodcastsSection = ({ userId, isOwnProfile = false }: PodcastsSectionProps) => {
  const [podcasts, setPodcasts] = useState<PodcastVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPodcasts();
  }, [userId]);

  const fetchPodcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('id, file_name, file_path, created_at')
        .eq('user_id', userId)
        .eq('content_category', 'podcast')
        .like('file_type', 'video/%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching podcasts:', error);
        return;
      }

      setPodcasts(data || []);
    } catch (error) {
      console.error('Error fetching podcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return null;
  }

  if (podcasts.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <Mic className="w-6 h-6 text-white" />
        <h2 className="text-2xl font-bold text-white">Podcasts</h2>
      </div>

      <div className="grid gap-4">
        {podcasts.map((podcast) => (
          <PodcastVideoCard 
            key={podcast.id} 
            podcast={podcast} 
            getVideoUrl={getVideoUrl} 
          />
        ))}
      </div>
    </div>
  );
};

interface PodcastVideoCardProps {
  podcast: PodcastVideo;
  getVideoUrl: (filePath: string) => string;
}

const PodcastVideoCard = ({ podcast, getVideoUrl }: PodcastVideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      <div className="relative">
        <video
          ref={videoRef}
          src={getVideoUrl(podcast.file_path)}
          className="w-full aspect-video object-cover"
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />
        
        {/* Play overlay when paused */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="text-white font-medium truncate">{podcast.file_name}</h3>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlay}
            className="text-white hover:bg-gray-700"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMute}
            className="text-white hover:bg-gray-700"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>

          <div className="w-24">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="cursor-pointer"
            />
          </div>

          <div className="flex-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={handleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            <Maximize2 className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          Uploaded {new Date(podcast.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default PodcastsSection;
