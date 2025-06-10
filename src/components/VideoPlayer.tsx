
import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Video, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";

interface VideoTrack {
  id: string;
  title: string;
  description: string | null;
  video_file_url: string;
  thumbnail_url: string | null;
  background_music_url: string | null;
}

interface VideoPlayerProps {
  videos: VideoTrack[];
}

const VideoPlayer = ({ videos }: VideoPlayerProps) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentVideo = videos[currentVideoIndex];

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const playNext = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const playPrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (videos.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Video className="text-gray-400" size={24} />
            <h3 className="text-xl font-bold text-white">Video Player</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-8 text-center">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No videos in your library</p>
            <p className="text-gray-500 text-sm mt-2">Download videos from the store to start watching</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Video className="text-gray-400" size={24} />
          <h3 className="text-xl font-bold text-white">Video Player</h3>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          {/* Video Display */}
          <div className="aspect-video bg-gray-800 rounded mb-4 relative">
            {currentVideo ? (
              <video
                ref={videoRef}
                src={currentVideo.video_file_url}
                className="w-full h-full rounded"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={playNext}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="text-gray-600" size={48} />
              </div>
            )}
          </div>

          {/* Video Info */}
          {currentVideo && (
            <div className="mb-4">
              <h4 className="text-white font-semibold">{currentVideo.title}</h4>
              {currentVideo.description && (
                <p className="text-gray-400 text-sm">{currentVideo.description}</p>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
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
                onClick={playPrevious}
                disabled={currentVideoIndex === 0}
                className="text-white hover:bg-gray-700"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                onClick={handlePlayPause}
                className="bg-primary hover:bg-primary/90"
                disabled={!currentVideo}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={playNext}
                disabled={currentVideoIndex === videos.length - 1}
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
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <span className="text-gray-400 text-sm">
              {currentVideoIndex + 1} of {videos.length}
            </span>
          </div>

          {/* Playlist */}
          {videos.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h5 className="text-white font-medium mb-2">Playlist</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => {
                      setCurrentVideoIndex(index);
                      setIsPlaying(false);
                      setCurrentTime(0);
                    }}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      index === currentVideoIndex
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <div className="font-medium">{video.title}</div>
                    {video.description && (
                      <div className="text-xs opacity-75 line-clamp-1">{video.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
