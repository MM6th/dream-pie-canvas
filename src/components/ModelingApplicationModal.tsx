
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "./MultiImagePicker";

interface FashionProduct {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  price: number;
}

interface ModelingApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: FashionProduct | null;
  onSuccess: () => void;
}

const ModelingApplicationModal = ({ isOpen, onClose, product, onSuccess }: ModelingApplicationModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [submissionNotes, setSubmissionNotes] = useState("");

  const handleClose = () => {
    setSelectedImages([]);
    setSubmissionNotes("");
    onClose();
  };

  const uploadImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (const image of selectedImages) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `modeling-applications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('modeling-photos')
        .upload(filePath, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('modeling-photos')
        .getPublicUrl(filePath);

      imageUrls.push(publicUrl);
    }

    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    if (selectedImages.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one modeling photo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Check if user already has a pending application for this product
      const { data: existingApplication, error: checkError } = await supabase
        .from('modeling_applications')
        .select('id')
        .eq('merchant_id', user.id)
        .eq('fashion_product_id', product.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingApplication) {
        toast({
          title: "Application Already Submitted",
          description: "You already have a pending application for this product",
          variant: "destructive"
        });
        return;
      }

      // Upload images
      const imageUrls = await uploadImages();

      // Create modeling application
      const { error: applicationError } = await supabase
        .from('modeling_applications')
        .insert({
          merchant_id: user.id,
          fashion_product_id: product.id,
          application_photos: imageUrls,
          submission_notes: submissionNotes.trim() || null
        });

      if (applicationError) throw applicationError;

      toast({
        title: "Application Submitted!",
        description: "Your modeling application has been submitted for review. You'll be notified of the decision.",
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error submitting modeling application:', error);
      toast({
        title: "Error",
        description: "Failed to submit modeling application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Apply for Modeling - {product.title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Product Details</h3>
            <p className="text-sm text-gray-300">{product.title}</p>
            {product.description && (
              <p className="text-sm text-gray-400 mt-1">{product.description}</p>
            )}
            {product.materials && (
              <p className="text-sm text-gray-400 mt-1">Materials: {product.materials}</p>
            )}
            <p className="text-sm font-medium text-green-400 mt-2">Price: ${product.price.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label>Modeling Photos *</Label>
            <MultiImagePicker
              selectedImages={selectedImages}
              onImagesChange={setSelectedImages}
              maxImages={8}
            />
            <p className="text-sm text-gray-400">
              Upload photos of yourself that showcase your modeling abilities (up to 8 photos)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              rows={4}
              placeholder="Tell us why you'd be perfect for modeling this product..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
            <h4 className="font-medium text-blue-300 mb-2">Application Process</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Your application will be reviewed by our admin team</li>
              <li>• You'll be notified via email about the decision</li>
              <li>• If approved, you'll receive further instructions for the modeling opportunity</li>
              <li>• Make sure your photos are high quality and professional</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading || selectedImages.length === 0}
              className="bg-purple-600 text-white flex-1"
            >
              {loading ? "Submitting..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModelingApplicationModal;
