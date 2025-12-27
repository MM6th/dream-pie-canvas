import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">{filmTitle} - Trailer</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            controls
            autoPlay
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
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilmTrailerPlayerModal;
