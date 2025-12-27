import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Film, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Download, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";

interface FilmTrack {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  full_video_url: string | null;
  genres: string[];
  amount_paid: number;
  purchase_date: string;
}

interface FilmPlayerProps {
  films: FilmTrack[];
}

const FilmPlayer = ({ films }: FilmPlayerProps) => {
  const [currentFilmIndex, setCurrentFilmIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFilm = films[currentFilmIndex];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => {
      if (currentFilmIndex < films.length - 1) {
        setCurrentFilmIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentFilmIndex, films.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentFilm?.full_video_url) return;

    video.src = currentFilm.full_video_url;
    video.load();
    
    if (isPlaying) {
      video.play().catch(console.error);
    }
  }, [currentFilmIndex, currentFilm]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !currentFilm?.full_video_url) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (value[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const previousFilm = () => {
    if (currentFilmIndex > 0) {
      setCurrentFilmIndex(prev => prev - 1);
      setIsPlaying(false);
    }
  };

  const nextFilm = () => {
    if (currentFilmIndex < films.length - 1) {
      setCurrentFilmIndex(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (film: FilmTrack) => {
    // Only allow download for purchased films (not free)
    if (film.amount_paid <= 0) {
      toast.error('Download only available for purchased films');
      return;
    }

    if (!film.full_video_url) {
      toast.error('Video file not available');
      return;
    }

    try {
      toast.info('Starting download... This may take a while for large files.');
      
      const response = await fetch(film.full_video_url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${film.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
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

  if (!films.length) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Film className="text-muted-foreground" size={24} />
            <h3 className="text-xl font-bold text-foreground">Film Player</h3>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-foreground font-medium">No films available</p>
                <p className="text-muted-foreground text-sm">Browse the Films section to discover and get films</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" className="bg-muted hover:bg-muted/80" disabled>
                Play
              </Button>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="bg-muted-foreground h-2 rounded-full w-0"></div>
              </div>
              <span className="text-muted-foreground text-sm">0:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Film className="text-muted-foreground" size={24} />
          <h3 className="text-xl font-bold text-foreground">Film Player</h3>
          <span className="text-muted-foreground text-sm">({films.length} films)</span>
        </div>
        
        <div ref={containerRef} className="bg-secondary/20 rounded-lg p-4">
          {/* Video Player Area */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
            {currentFilm?.full_video_url ? (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                poster={currentFilm.thumbnail_url || undefined}
                onClick={togglePlay}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            
            {/* Play overlay when paused */}
            {!isPlaying && currentFilm?.full_video_url && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Film Info */}
          <div className="flex items-start gap-4 mb-4">
            {currentFilm?.thumbnail_url ? (
              <img
                src={currentFilm.thumbnail_url}
                alt={currentFilm.title}
                className="w-20 h-12 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Film className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-foreground font-medium">{currentFilm?.title || 'No film selected'}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {currentFilm?.genres?.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
                <span className="text-muted-foreground text-xs">
                  Film {currentFilmIndex + 1} of {films.length}
                </span>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                Purchased on {currentFilm.purchase_date ? new Date(currentFilm.purchase_date).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[duration ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-muted-foreground text-sm mt-1">
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
                onClick={previousFilm}
                disabled={currentFilmIndex === 0}
                className="text-foreground hover:bg-secondary"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                onClick={togglePlay}
                disabled={!currentFilm?.full_video_url}
                className="bg-primary hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={nextFilm}
                disabled={currentFilmIndex === films.length - 1}
                className="text-foreground hover:bg-secondary"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* Download button - only show for purchased films */}
              {currentFilm && currentFilm.amount_paid > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(currentFilm)}
                  disabled={!currentFilm.full_video_url}
                  className="text-foreground hover:bg-secondary"
                  title="Download to device"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-foreground hover:bg-secondary"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              
              <div className="flex items-center gap-2 w-28">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-foreground hover:bg-secondary"
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

      </CardContent>
    </Card>
  );
};

export default FilmPlayer;
