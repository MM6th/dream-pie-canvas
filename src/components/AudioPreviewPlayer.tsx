import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause } from "lucide-react";

interface AudioPreviewPlayerProps {
  audioUrl: string;
  previewStartTime: number;
  previewDuration?: number;
  thumbnailUrl?: string;
  onPreviewEnd?: () => void;
  className?: string;
}

const AudioPreviewPlayer = ({
  audioUrl,
  previewStartTime,
  previewDuration = 30,
  thumbnailUrl,
  onPreviewEnd,
  className = "",
}: AudioPreviewPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(previewDuration);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const elapsed = audio.currentTime - previewStartTime;
      setCurrentTime(elapsed);
      
      if (elapsed >= previewDuration) {
        stopPreview();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(previewDuration);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [previewStartTime, previewDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playPreview = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = previewStartTime;
    audio.play();
    setIsPlaying(true);

    timeoutRef.current = setTimeout(() => {
      stopPreview();
    }, previewDuration * 1000);
  };

  const stopPreview = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = previewStartTime;
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    onPreviewEnd?.();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopPreview();
    } else {
      playPreview();
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center gap-3">
        {thumbnailUrl && (
          <img 
            src={thumbnailUrl} 
            alt="Track thumbnail" 
            className="w-12 h-12 rounded object-cover"
          />
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Button
              onClick={togglePlayPause}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Preview: {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            disabled
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPreviewPlayer;
