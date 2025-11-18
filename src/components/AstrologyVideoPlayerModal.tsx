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
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AstrologyVideoPlayerModal;
