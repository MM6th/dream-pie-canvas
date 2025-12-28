import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FilmTrailerPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  filmTitle: string;
}

const FilmTrailerPlayerModal = ({
  isOpen,
  onClose,
  videoUrl,
  filmTitle,
}: FilmTrailerPlayerModalProps) => {
  // Determine video type based on extension
  const getVideoType = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">{filmTitle} - Trailer</DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            key={videoUrl}
            controls
            autoPlay
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
            preload="metadata"
            onError={(e) => {
              console.error("Video player error:", {
                error: e.currentTarget.error,
                src: videoUrl,
                networkState: e.currentTarget.networkState,
                readyState: e.currentTarget.readyState,
              });
            }}
            onLoadedMetadata={(e) => {
              console.log("Video loaded successfully:", {
                duration: e.currentTarget.duration,
                width: e.currentTarget.videoWidth,
                height: e.currentTarget.videoHeight,
              });
            }}
          >
            <source src={videoUrl} type={getVideoType(videoUrl)} />
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilmTrailerPlayerModal;
