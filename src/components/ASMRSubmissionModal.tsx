import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "@/components/MultiImagePicker";

interface ASMRSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioProduct: {
    id: string;
    title: string;
    pie_photo_editing: boolean;
    back_end_royalties: boolean;
    advance_fee_rate: number | null;
  };
  onSuccess: () => void;
}

const ASMRSubmissionModal = ({ open, onOpenChange, audioProduct, onSuccess }: ASMRSubmissionModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    whyMeText: "",
    negotiationText: "",
    wantsPiePhotoEditing: false,
    coverPhotos: [] as File[],
    submissionAudio: null as File | null
  });

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.submissionAudio) return;

    setLoading(true);
    try {
      // Upload submission audio
      const submissionAudioUrl = await uploadFile(
        formData.submissionAudio, 
        'audio-files', 
        `${user.id}/asmr-submissions/`
      );

      // Upload cover photos if PIE photo editing is requested
      let coverPhotoUrls: string[] = [];
      if (formData.wantsPiePhotoEditing && formData.coverPhotos.length > 0) {
        for (const photo of formData.coverPhotos) {
          const photoUrl = await uploadFile(photo, 'user-media', `${user.id}/asmr-covers/`);
          coverPhotoUrls.push(photoUrl);
        }
      }

      // Create submission record
      const { error } = await supabase
        .from('asmr_submissions')
        .insert({
          audio_product_id: audioProduct.id,
          merchant_id: user.id,
          submission_audio_url: submissionAudioUrl,
          cover_photos: coverPhotoUrls,
          why_me_text: formData.whyMeText || null,
          negotiation_text: formData.negotiationText || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Submission Sent",
        description: "Your ASMR submission has been sent for review. You'll be notified when it's reviewed."
      });

      onSuccess();
      setFormData({
        whyMeText: "",
        negotiationText: "",
        wantsPiePhotoEditing: false,
        coverPhotos: [],
        submissionAudio: null
      });
    } catch (error: any) {
      console.error('Error submitting ASMR:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit ASMR. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, submissionAudio: file }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] bg-gray-800 border-gray-700 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Submit ASMR for "{audioProduct.title}"</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-blue-700/20 rounded-lg border border-blue-600">
            <h4 className="text-white font-medium mb-2">Opportunity Details</h4>
            {audioProduct.advance_fee_rate && (
              <p className="text-green-400 text-sm">Advance Fee: ${audioProduct.advance_fee_rate}</p>
            )}
            {audioProduct.back_end_royalties && (
              <p className="text-blue-400 text-sm">Back-end royalties available</p>
            )}
            {audioProduct.pie_photo_editing && (
              <p className="text-purple-400 text-sm">PIE photo editing service available</p>
            )}
          </div>

          <div>
            <Label htmlFor="submissionAudio">Upload Your ASMR Audio *</Label>
            <input
              id="submissionAudio"
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="whyMeText">Why should you be chosen?</Label>
            <Textarea
              id="whyMeText"
              value={formData.whyMeText}
              onChange={(e) => setFormData(prev => ({ ...prev, whyMeText: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Tell us why you're perfect for this ASMR opportunity..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="negotiationText">Additional Notes/Negotiation</Label>
            <Textarea
              id="negotiationText"
              value={formData.negotiationText}
              onChange={(e) => setFormData(prev => ({ ...prev, negotiationText: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Any additional information or negotiation terms..."
              rows={3}
            />
          </div>

          {audioProduct.pie_photo_editing && (
            <div className="space-y-4 p-4 bg-purple-700/20 rounded-lg border border-purple-600">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wantsPiePhotoEditing"
                  checked={formData.wantsPiePhotoEditing}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, wantsPiePhotoEditing: checked as boolean }))}
                />
                <Label htmlFor="wantsPiePhotoEditing" className="text-white">
                  I want PIE photo editing service for my cover
                </Label>
              </div>

              {formData.wantsPiePhotoEditing && (
                <div>
                  <Label>Upload Cover Photos (Max 3)</Label>
                  <p className="text-sm text-gray-400 mb-2">
                    PIE will edit these photos for your ASMR cover
                  </p>
                  <MultiImagePicker
                    selectedImages={formData.coverPhotos}
                    onImagesChange={(files) => setFormData(prev => ({ ...prev, coverPhotos: files }))}
                    maxImages={3}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.submissionAudio}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Submitting...' : 'Submit ASMR'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ASMRSubmissionModal;