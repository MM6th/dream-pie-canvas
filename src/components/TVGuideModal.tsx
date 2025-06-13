
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import ImagePicker from "./ImagePicker";

interface TVGuideModalProps {
  onSuccess?: () => void;
}

const TVGuideModal = ({ onSuccess }: TVGuideModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
    linkUrl: "",
    isFeatured: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim(),
          image_url: formData.imageUrl.trim() || null,
          link_url: formData.linkUrl.trim() || null,
          is_featured: formData.isFeatured,
          post_type: 'tv_guide',
          merchant_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "TV Guide entry created successfully!"
      });

      setFormData({
        title: "",
        content: "",
        imageUrl: "",
        linkUrl: "",
        isFeatured: false,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating TV guide entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create TV guide entry",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Calendar className="w-4 h-4 mr-2" />
          Create TV Guide Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create TV Guide Entry
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Show/Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter show or event title"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Description & Schedule *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Describe the show and include schedule details..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label>Image (Optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="Image URL or select from gallery"
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
              <ImagePicker
                onImageSelect={(url) => setFormData({ ...formData, imageUrl: url })}
                currentImageUrl={formData.imageUrl}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="linkUrl">Link URL (Optional)</Label>
            <Input
              id="linkUrl"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://example.com"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isFeatured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
            />
            <Label htmlFor="isFeatured">Feature this entry</Label>
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {loading ? "Creating..." : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TVGuideModal;
