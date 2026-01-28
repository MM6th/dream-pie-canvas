import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image, X, DollarSign, FileText, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  thumbnail_url: string | null;
  advance_fee_rate?: number | null;
}

interface CoverApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioProduct: AudioProduct;
  onSubmissionSuccess: () => void;
}

const CoverApplicationModal = ({ 
  isOpen, 
  onClose, 
  audioProduct, 
  onSubmissionSuccess 
}: CoverApplicationModalProps) => {
  const { user } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [requestedAdvance, setRequestedAdvance] = useState("");
  const [negotiationText, setNegotiationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoSelect = (url: string) => {
    if (selectedPhotos.length < 3 && !selectedPhotos.includes(url)) {
      setSelectedPhotos(prev => [...prev, url]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to apply",
        variant: "destructive"
      });
      return;
    }

    if (selectedPhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least 1 photo (up to 3 max)",
        variant: "destructive"
      });
      return;
    }

    const advancePrice = parseFloat(requestedAdvance) || 0;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('song_cover_submissions')
        .insert({
          merchant_id: user.id,
          audio_product_id: audioProduct.id,
          cover_image_url: selectedPhotos[0], // Primary cover image
          cover_photos: selectedPhotos, // All photos
          requested_advance_price: advancePrice,
          negotiation_text: negotiationText.trim() || null,
          submission_notes: negotiationText.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Your cover application has been sent to the admin for review."
      });

      onSubmissionSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedPhotos([]);
    setRequestedAdvance("");
    setNegotiationText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            Apply for Cover Opportunity
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Submit your application to create cover art for "{audioProduct.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current Track Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
            {audioProduct.thumbnail_url ? (
              <img
                src={audioProduct.thumbnail_url}
                alt="Current cover"
                className="w-14 h-14 object-cover rounded-lg"
              />
            ) : (
              <div className="w-14 h-14 bg-gray-600 rounded-lg flex items-center justify-center">
                <Image className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-white font-medium">{audioProduct.title}</p>
              <p className="text-gray-400 text-sm">{audioProduct.artist_name || "Unknown Artist"}</p>
              {audioProduct.advance_fee_rate && (
                <p className="text-green-400 text-xs">Suggested advance: ${audioProduct.advance_fee_rate}</p>
              )}
            </div>
          </div>

          {/* Photo Upload Section */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4" />
              Cover Photos (1-3 required)
            </Label>
            
            {selectedPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {selectedPhotos.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Cover ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-600"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedPhotos.length < 3 && (
              <ImagePicker
                onImageSelect={handlePhotoSelect}
                trigger={
                  <Button variant="outline" className="w-full border-gray-600 text-white bg-gray-700 hover:bg-gray-600 hover:text-white">
                    <Upload className="w-4 h-4 mr-2" />
                    {selectedPhotos.length === 0 ? "Upload Cover Photos" : `Add More (${3 - selectedPhotos.length} remaining)`}
                  </Button>
                }
              />
            )}
            <p className="text-gray-500 text-xs mt-1">
              The first photo will be used as the primary cover image
            </p>
          </div>

          {/* Cash Advance Request */}
          <div>
            <Label htmlFor="advance" className="text-sm font-medium flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4" />
              Requested Cash Advance
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="advance"
                type="number"
                min="0"
                step="0.01"
                value={requestedAdvance}
                onChange={(e) => setRequestedAdvance(e.target.value)}
                placeholder="0.00"
                className="pl-9 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Enter the cash advance amount you'd like to request from PIE
            </p>
          </div>

          {/* Negotiation Text */}
          <div>
            <Label htmlFor="negotiation" className="text-sm font-medium flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              Why You're Right for This Job
            </Label>
            <Textarea
              id="negotiation"
              value={negotiationText}
              onChange={(e) => setNegotiationText(e.target.value)}
              placeholder="Explain your experience, style, and why you're the best fit for creating this cover art..."
              className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              rows={4}
            />
            <p className="text-gray-500 text-xs mt-1">
              Help PIE understand your value and unique qualifications
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-600 text-white bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedPhotos.length === 0 || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverApplicationModal;
