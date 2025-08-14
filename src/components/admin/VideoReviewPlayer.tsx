import React, { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Volume2, Eye } from 'lucide-react';

interface VideoReviewPlayerProps {
  videoUrl: string;
  backgroundAudioUrl: string;
  mixingPreferences: {
    background_audio_volume: number;
    video_audio_volume: number;
    audio_sync_offset: number;
  };
  title: string;
}

export const VideoReviewPlayer: React.FC<VideoReviewPlayerProps> = ({
  videoUrl,
  backgroundAudioUrl,
  mixingPreferences,
  title
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Apply mixing preferences on mount
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (video && audio) {
      video.volume = mixingPreferences.video_audio_volume || 0.5;
      audio.volume = mixingPreferences.background_audio_volume || 0.5;
    }
  }, [mixingPreferences]);

  // Media event handlers
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && audio) {
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        // Apply audio sync offset
        const syncOffset = mixingPreferences.audio_sync_offset || 0;
        const targetAudioTime = video.currentTime + syncOffset / 1000;
        const timeDiff = Math.abs(audio.currentTime - targetAudioTime);
        
        // Only sync if difference is significant to avoid stuttering
        if (timeDiff > 0.2) {
          audio.currentTime = Math.max(0, Math.min(targetAudioTime, audio.duration || 0));
        }
      };

      const handleVideoLoadedMetadata = () => {
        setDuration(video.duration);
        checkMediaReady();
      };

      const handleAudioLoadedMetadata = () => {
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

      const handleVideoEnded = () => {
        audio.pause();
        setIsPlaying(false);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleVideoLoadedMetadata);
      video.addEventListener('canplaythrough', checkMediaReady);
      video.addEventListener('error', handleVideoError);
      video.addEventListener('ended', handleVideoEnded);
      
      audio.addEventListener('loadedmetadata', handleAudioLoadedMetadata);
      audio.addEventListener('canplaythrough', checkMediaReady);
      audio.addEventListener('error', handleAudioError);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleVideoLoadedMetadata);
        video.removeEventListener('canplaythrough', checkMediaReady);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('ended', handleVideoEnded);
        
        audio.removeEventListener('loadedmetadata', handleAudioLoadedMetadata);
        audio.removeEventListener('canplaythrough', checkMediaReady);
        audio.removeEventListener('error', handleAudioError);
      };
    }
  }, [mixingPreferences]);

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
        setPlaybackError('Failed to start playback');
      }
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video && audio) {
      video.currentTime = newTime;
      const syncOffset = mixingPreferences.audio_sync_offset || 0;
      audio.currentTime = Math.max(0, newTime + syncOffset / 1000);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Review Video with Audio Mix: {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-48 object-contain"
              controls={false}
            />
            
            {/* Background audio (hidden) */}
            <audio
              ref={audioRef}
              src={backgroundAudioUrl}
            />
          </div>

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
              className="w-12 h-12 rounded-full"
              style={{
                backgroundColor: 'white',
                color: 'black',
                border: '2px solid black'
              }}
              disabled={!mediaReady || !!playbackError}
            >
              {isPlaying ? <Pause className="w-5 h-5" style={{color: 'black'}} /> : <Play className="w-5 h-5" style={{color: 'black'}} />}
            </Button>
          </div>

          {/* Timeline */}
          {mediaReady && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={([value]) => handleSeek(value)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
            </div>
          )}

          {/* Mixing Info Display */}
          <div className="p-2 bg-muted/50 rounded text-xs">
            <div className="grid grid-cols-3 gap-2 text-muted-foreground">
              <div>
                <div className="font-medium text-foreground">{Math.round((mixingPreferences.background_audio_volume || 0.5) * 100)}%</div>
                <div>Background</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{Math.round((mixingPreferences.video_audio_volume || 0.5) * 100)}%</div>
                <div>Video Audio</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{mixingPreferences.audio_sync_offset || 0}ms</div>
                <div>Sync Offset</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};