import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";

interface ASMRTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  description: string | null;
  is_adult_content: boolean;
  access_level: string;
  advance_fee_rate: number | null;
  number_of_opportunities: number | null;
  opportunities_exhausted: boolean | null;
  is_free: boolean;
  max_downloads: number | null;
}

interface ASMRAudioPlayerProps {
  tracks: ASMRTrack[];
}

const ASMRAudioPlayer = ({ tracks }: ASMRAudioPlayerProps) => {
  const { user } = useAuth();
  const { isApproved } = useApprovalStatus();
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleNext);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleNext);
    };
  }, [currentTrack]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    setCurrentTrack((prev) => (prev > 0 ? prev - 1 : tracks.length - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentTrack((prev) => (prev < tracks.length - 1 ? prev + 1 : 0));
    setIsPlaying(false);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (value / 100) * duration;
    audio.currentTime = newTime;
    setProgress(value);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = value / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (track: ASMRTrack) => {
    if (!user || !isApproved) {
      toast({
        title: "Access Required",
        description: "You must be an approved merchant to download ASMR opportunities.",
        variant: "destructive"
      });
      return;
    }

    if (track.access_level !== 'merchant_only') {
      toast({
        title: "Not Available",
        description: "This ASMR track is not available for merchant download.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Record the download
      const { error: downloadError } = await supabase
        .from('asmr_downloads')
        .insert({
          audio_product_id: track.id,
          merchant_id: user.id,
          negotiation_message: generateNegotiationMessage(),
          why_me_text: ""
        });

      if (downloadError) throw downloadError;

      // Trigger actual download
      const response = await fetch(track.audio_file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `${track.title} is being downloaded. A contract will be generated for you to review.`
      });
    } catch (error) {
      console.error('Error downloading ASMR:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download ASMR track. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const generateNegotiationMessage = () => {
    // This would generate a message based on user profile/social media links
    // For now, return a basic template
    return "I am interested in this ASMR opportunity and would like to discuss the details.";
  };

  if (!tracks || tracks.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            ASMR Player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center">No ASMR content available</p>
        </CardContent>
      </Card>
    );
  }

  const track = tracks[currentTrack];

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          ASMR Player
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <audio
          ref={audioRef}
          src={track.audio_file_url}
          preload="metadata"
        />
        
        {/* Track Info */}
        <div className="flex items-center gap-4">
          {track.thumbnail_url && (
            <img
              src={track.thumbnail_url}
              alt={track.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{track.title}</h3>
            {track.artist_name && (
              <p className="text-gray-400 text-sm truncate">{track.artist_name}</p>
            )}
            {track.description && (
              <p className="text-gray-300 text-xs mt-1 line-clamp-2">{track.description}</p>
            )}
            {track.advance_fee_rate && (
              <p className="text-green-400 text-sm font-medium mt-1">
                Payment: ${track.advance_fee_rate}
              </p>
            )}
          </div>
          {track.access_level === 'merchant_only' && isApproved && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleDownload(track)}
                disabled={isDownloading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-1" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className="w-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = ((e.clientX - rect.left) / rect.width) * 100;
              handleSeek(percent);
            }}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrevious}
              className="text-white hover:bg-gray-700"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={togglePlay}
              className="bg-primary hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNext}
              className="text-white hover:bg-gray-700"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:bg-gray-700"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <div className="w-20">
              <Progress
                value={isMuted ? 0 : volume * 100}
                className="cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = ((e.clientX - rect.left) / rect.width) * 100;
                  handleVolumeChange(percent);
                }}
              />
            </div>
          </div>
        </div>

        {/* Track Selection */}
        {tracks.length > 1 && (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm">Playlist ({tracks.length} tracks)</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {tracks.map((t, index) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentTrack(index);
                    setIsPlaying(false);
                  }}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    index === currentTrack
                      ? 'bg-primary/20 text-primary'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{t.title}</span>
                    {t.advance_fee_rate && (
                      <span className="text-green-400 text-xs ml-2">${t.advance_fee_rate}</span>
                    )}
                  </div>
                  {t.artist_name && (
                    <p className="text-xs text-gray-400 truncate">{t.artist_name}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ASMRAudioPlayer;