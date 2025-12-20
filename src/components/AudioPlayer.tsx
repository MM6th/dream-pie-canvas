import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AudioLines, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Globe, Lock, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  access_level?: "public" | "merchant_only" | "paid" | null;
  audio_type?: string;
}

interface AudioPlayerProps {
  tracks: AudioTrack[];
}

const AudioPlayer = ({ tracks }: AudioPlayerProps) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();

  const currentTrack = tracks[currentTrackIndex];

  // Add debugging for tracks
  useEffect(() => {
    console.log('AudioPlayer received tracks:', tracks);
    console.log('Number of tracks in AudioPlayer:', tracks.length);
    if (tracks.length > 0) {
      console.log('Sample track:', tracks[0]);
    }
  }, [tracks]);

  // Fetch user profile to get playlist visibility setting
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('playlist_public')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setPlaylistPublic(data?.playlist_public || false);
    };

    fetchUserProfile();
  }, [user]);

  // Toggle playlist visibility
  const togglePlaylistVisibility = async (checked: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ playlist_public: checked })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating playlist visibility:', error);
      toast.error('Failed to update playlist visibility');
      return;
    }

    setPlaylistPublic(checked);
    toast.success(checked ? 'Playlist is now public' : 'Playlist is now private');
  };

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

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const previousTrack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
    }
  };

  const nextTrack = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (track: AudioTrack) => {
    try {
      toast.info('Starting download...');
      
      const response = await fetch(track.audio_file_url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create a filename from the track title
      const filename = `${track.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      link.download = filename;
      
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

  if (!tracks.length) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AudioLines className="text-gray-400" size={24} />
            <h3 className="text-xl font-bold text-white">Audio Player</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-medium">No tracks available</p>
                <p className="text-gray-400 text-sm">Download some audio from the store to get started</p>
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
          <AudioLines className="text-gray-400" size={24} />
          <h3 className="text-xl font-bold text-white">Audio Player</h3>
          <span className="text-gray-400 text-sm">({tracks.length} tracks)</span>
        </div>
        
        {/* Playlist Visibility Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600 mb-4">
          <div className="flex items-center gap-3">
            {playlistPublic ? (
              <Globe className="w-5 h-5 text-green-400" />
            ) : (
              <Lock className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <Label htmlFor="playlist_public" className="text-white font-medium">
                Public Playlist
              </Label>
              <p className="text-sm text-gray-400">
                Show your music collection on your profile page
              </p>
            </div>
          </div>
          <Switch
            id="playlist_public"
            checked={playlistPublic}
            onCheckedChange={togglePlaylistVisibility}
          />
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-4 mb-4">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <AudioLines className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-white font-medium">{currentTrack?.title || 'No track selected'}</p>
              <p className="text-gray-400 text-sm">
                {currentTrack?.artist_name || 'Unknown Artist'}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-gray-500 text-xs">
                  Track {currentTrackIndex + 1} of {tracks.length}
                </p>
                {currentTrack?.access_level && (
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded capitalize">
                    {currentTrack.access_level.replace('_', ' ')}
                  </span>
                )}
                {currentTrack?.audio_type === 'video_ad' && (
                  <span className="text-xs bg-orange-600 px-2 py-1 rounded">
                    Video Ad
                  </span>
                )}
              </div>
            </div>
          </div>

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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={previousTrack}
                disabled={currentTrackIndex === 0}
                className="text-white hover:bg-gray-700"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                onClick={togglePlay}
                disabled={!currentTrack}
                className="bg-primary hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={nextTrack}
                disabled={currentTrackIndex === tracks.length - 1}
                className="text-white hover:bg-gray-700"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => currentTrack && handleDownload(currentTrack)}
                disabled={!currentTrack}
                className="text-white hover:bg-gray-700"
                title="Download to device"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2 w-28">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-gray-700"
                >
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

export default AudioPlayer;
