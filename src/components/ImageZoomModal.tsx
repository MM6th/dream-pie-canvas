
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn } from "lucide-react";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  submittedImage: string;
  currentImage?: string | null;
  songTitle: string;
  artistName?: string | null;
}

const ImageZoomModal = ({ 
  isOpen, 
  onClose, 
  submittedImage, 
  currentImage, 
  songTitle, 
  artistName 
}: ImageZoomModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZoomIn className="w-5 h-5" />
            Cover Comparison - {songTitle}
            {artistName && <span className="text-gray-400">by {artistName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submitted Cover */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-white">Submitted Cover</h4>
              <div className="relative">
                <img
                  src={submittedImage}
                  alt="Submitted cover"
                  className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-600"
                />
              </div>
            </div>

            {/* Current Cover */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-white">Current Cover</h4>
              <div className="relative">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt="Current cover"
                    className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-600"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600">
                    <div className="text-center">
                      <ZoomIn className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400">No current cover</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoomModal;
