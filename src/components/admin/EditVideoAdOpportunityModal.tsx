import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface VideoAdOpportunity {
  id: string;
  title: string;
  description: string | null;
  audio_file_url: string;
  payment_amount: number;
  target_platform: string;
  audio_type: string;
  available_spots: number;
  access_level: string;
  is_adult_content: boolean;
}

interface EditVideoAdOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: VideoAdOpportunity | null;
  onSuccess: () => void;
}

const EditVideoAdOpportunityModal = ({ isOpen, onClose, opportunity, onSuccess }: EditVideoAdOpportunityModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    payment_amount: 0,
    target_platform: 'instagram' as const,
    audio_type: 'music' as const,
    available_spots: 1,
    access_level: 'public' as const,
    is_adult_content: false,
  });

  useEffect(() => {
    if (opportunity) {
      setFormData({
        title: opportunity.title,
        description: opportunity.description || '',
        payment_amount: opportunity.payment_amount,
        target_platform: opportunity.target_platform as any,
        audio_type: opportunity.audio_type as any,
        available_spots: opportunity.available_spots,
        access_level: opportunity.access_level as any,
        is_adult_content: opportunity.is_adult_content,
      });
    }
  }, [opportunity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('video_ad_opportunities')
        .update({
          title: formData.title,
          description: formData.description || null,
          payment_amount: formData.payment_amount,
          target_platform: formData.target_platform,
          audio_type: formData.audio_type,
          available_spots: formData.available_spots,
          access_level: formData.access_level,
          is_adult_content: formData.is_adult_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video ad opportunity updated successfully!"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating opportunity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update opportunity",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Edit Video Ad Opportunity
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title" className="text-white">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_amount" className="text-white">Payment Amount ($) *</Label>
              <Input
                id="payment_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: parseFloat(e.target.value) || 0 })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="available_spots" className="text-white">Available Spots *</Label>
              <Input
                id="available_spots"
                type="number"
                min="1"
                value={formData.available_spots}
                onChange={(e) => setFormData({ ...formData, available_spots: parseInt(e.target.value) || 1 })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Target Platform *</Label>
              <Select 
                value={formData.target_platform} 
                onValueChange={(value: any) => setFormData({ ...formData, target_platform: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Audio Type *</Label>
              <Select 
                value={formData.audio_type} 
                onValueChange={(value: any) => setFormData({ ...formData, audio_type: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select audio type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="voice_over">Voice Over</SelectItem>
                  <SelectItem value="sound_effect">Sound Effect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white">Access Level *</Label>
            <Select 
              value={formData.access_level} 
              onValueChange={(value: any) => setFormData({ ...formData, access_level: value })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="merchant_only">Merchants Only</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_adult_content"
              checked={formData.is_adult_content}
              onCheckedChange={(checked) => setFormData({ ...formData, is_adult_content: checked })}
            />
            <Label htmlFor="is_adult_content" className="text-white">
              Adult Content
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Opportunity
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVideoAdOpportunityModal;