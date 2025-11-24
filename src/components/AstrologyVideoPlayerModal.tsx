import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AstrologyVideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  productTitle: string;
}

const AstrologyVideoPlayerModal = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  productTitle 
}: AstrologyVideoPlayerModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">{productTitle} - Advertisement</DialogTitle>
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
        
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
            preload="metadata"
            onError={(e) => {
              console.error('Video player error:', {
                error: e.currentTarget.error,
                src: videoUrl,
                networkState: e.currentTarget.networkState,
                readyState: e.currentTarget.readyState,
              });
            }}
            onLoadedMetadata={(e) => {
              console.log('Video loaded successfully:', {
                duration: e.currentTarget.duration,
                width: e.currentTarget.videoWidth,
                height: e.currentTarget.videoHeight,
              });
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
        
        <div className="text-sm text-muted-foreground text-center">
          If the video doesn't play, try opening it in a new tab or downloading it.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AstrologyVideoPlayerModal;
