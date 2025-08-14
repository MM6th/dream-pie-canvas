import React, { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoEditorProps {
  videoFile: File;
  audioUrl: string;
  onMixingChange: (mixing: {
    backgroundAudioVolume: number;
    videoAudioVolume: number;
    audioSyncOffset: number;
  }) => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  videoFile,
  audioUrl,
  onMixingChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [backgroundAudioVolume, setBackgroundAudioVolume] = useState(0.5);
  const [videoAudioVolume, setVideoAudioVolume] = useState(0.5);
  const [audioSyncOffset, setAudioSyncOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [mediaReady, setMediaReady] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    // Create object URL for video file
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  useEffect(() => {
    // Update parent component with mixing preferences
    onMixingChange({
      backgroundAudioVolume,
      videoAudioVolume,
      audioSyncOffset
    });
  }, [backgroundAudioVolume, videoAudioVolume, audioSyncOffset, onMixingChange]);

  // Apply volumes immediately when they change
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = videoAudioVolume;
    }
  }, [videoAudioVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = backgroundAudioVolume;
    }
  }, [backgroundAudioVolume]);

  // Media event handlers
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && audio) {
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        // Improved audio sync with less jitter
        const targetAudioTime = video.currentTime + audioSyncOffset / 1000;
        const timeDiff = Math.abs(audio.currentTime - targetAudioTime);
        
        // Only sync if difference is significant to avoid stuttering
        if (timeDiff > 0.2) {
          audio.currentTime = Math.max(0, Math.min(targetAudioTime, audio.duration || 0));
        }
      };

      const handleVideoLoadedMetadata = () => {
        setDuration(video.duration);
        video.volume = videoAudioVolume;
        checkMediaReady();
      };

      const handleAudioLoadedMetadata = () => {
        audio.volume = backgroundAudioVolume;
        checkMediaReady();
      };

      const handleVideoError = () => {
        setPlaybackError('Failed to load video');
        setMediaReady(false);
      };

      const handleAudioError = () => {
        setPlaybackError('Failed to load background audio');
        setMediaReady(false);
      };

      const checkMediaReady = () => {
        if (video.readyState >= 3 && audio.readyState >= 3) {
          setMediaReady(true);
          setPlaybackError(null);
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleVideoLoadedMetadata);
      video.addEventListener('canplaythrough', checkMediaReady);
      video.addEventListener('error', handleVideoError);
      
      audio.addEventListener('loadedmetadata', handleAudioLoadedMetadata);
      audio.addEventListener('canplaythrough', checkMediaReady);
      audio.addEventListener('error', handleAudioError);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleVideoLoadedMetadata);
        video.removeEventListener('canplaythrough', checkMediaReady);
        video.removeEventListener('error', handleVideoError);
        
        audio.removeEventListener('loadedmetadata', handleAudioLoadedMetadata);
        audio.removeEventListener('canplaythrough', checkMediaReady);
        audio.removeEventListener('error', handleAudioError);
      };
    }
  }, [audioSyncOffset, videoAudioVolume, backgroundAudioVolume]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio) return;

    if (isPlaying) {
      video.pause();
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await video.play();
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing media:', error);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && audio) {
      video.currentTime = newTime;
      audio.currentTime = Math.max(0, newTime + audioSyncOffset / 1000);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Video Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Video Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-64 object-contain"
              onVolumeChange={() => {
                if (videoRef.current) {
                  videoRef.current.volume = videoAudioVolume;
                }
              }}
            />
            
            {/* Background audio (hidden) */}
            <audio
              ref={audioRef}
              src={audioUrl}
              onVolumeChange={() => {
                if (audioRef.current) {
                  audioRef.current.volume = backgroundAudioVolume;
                }
              }}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-4">
            {/* Status and Error Display */}
            {playbackError && (
              <div className="text-center text-destructive text-sm">
                {playbackError}
              </div>
            )}
            
            {!mediaReady && !playbackError && (
              <div className="text-center text-muted-foreground text-sm">
                Loading media...
              </div>
            )}

            {/* Play/Pause Button */}
            <div className="flex items-center justify-center">
              <Button 
                onClick={togglePlayback} 
                size="lg" 
                className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!mediaReady || !!playbackError}
              >
                {isPlaying ? <Pause className="h-6 w-6 text-black" /> : <Play className="h-6 w-6 text-black" />}
              </Button>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{formatTime(currentTime)}</span>
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={([value]) => handleSeek(value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Mixing Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Mixing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Music Volume */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4" />
              <label className="text-sm font-medium">Background Music Volume</label>
            </div>
            <Slider
              value={[backgroundAudioVolume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([value]) => setBackgroundAudioVolume(value)}
              className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
            />
            <span className="text-xs text-muted-foreground">{Math.round(backgroundAudioVolume * 100)}%</span>
          </div>

          {/* Video Audio Volume */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4" />
              <label className="text-sm font-medium">Video Audio Volume</label>
            </div>
            <Slider
              value={[videoAudioVolume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([value]) => setVideoAudioVolume(value)}
              className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
            />
            <span className="text-xs text-muted-foreground">{Math.round(videoAudioVolume * 100)}%</span>
          </div>

          {/* Audio Sync Offset */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Audio Sync Offset (milliseconds)</label>
            <Slider
              value={[audioSyncOffset]}
              min={-5000}
              max={5000}
              step={100}
              onValueChange={([value]) => setAudioSyncOffset(value)}
              className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
            />
            <span className="text-xs text-muted-foreground">
              {audioSyncOffset}ms {audioSyncOffset > 0 ? '(audio starts later)' : audioSyncOffset < 0 ? '(audio starts earlier)' : '(synchronized)'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};