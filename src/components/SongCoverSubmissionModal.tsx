import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  thumbnail_url: string | null;
}

interface SongCoverSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioProduct: AudioProduct;
  onSubmissionSuccess: () => void;
}

const SongCoverSubmissionModal = ({ 
  isOpen, 
  onClose, 
  audioProduct, 
  onSubmissionSuccess 
}: SongCoverSubmissionModalProps) => {
  const { user } = useAuth();
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedImageUrl.trim()) {
      toast({
        title: "Error",
        description: "Please select a cover image",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('song_cover_submissions')
        .insert({
          merchant_id: user.id,
          audio_product_id: audioProduct.id,
          cover_image_url: selectedImageUrl,
          submission_notes: submissionNotes.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cover submission sent for admin approval!"
      });

      onSubmissionSuccess();
      onClose();
      setSelectedImageUrl("");
      setSubmissionNotes("");
    } catch (error: any) {
      console.error('Error submitting cover:', error);
      toast({
        title: "Error",
        description: "Failed to submit cover for approval",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedImageUrl("");
    setSubmissionNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Submit Cover for "{audioProduct.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Current Cover</Label>
            <div className="mt-2">
              {audioProduct.thumbnail_url ? (
                <img
                  src={audioProduct.thumbnail_url}
                  alt="Current cover"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">New Cover Image</Label>
            <div className="mt-2">
              {selectedImageUrl ? (
                <div className="relative">
                  <img
                    src={selectedImageUrl}
                    alt="Selected cover"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedImageUrl("")}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <ImagePicker
                  onImageSelect={setSelectedImageUrl}
                  trigger={
                    <Button variant="outline" className="w-full border-gray-600 text-white bg-gray-700 hover:bg-gray-600 hover:text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      Select Cover Image
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Submission Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Add any notes about your cover submission..."
              className="mt-2 bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-600 text-white bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedImageUrl || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SongCoverSubmissionModal;
