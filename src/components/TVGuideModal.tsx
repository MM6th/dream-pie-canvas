
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

interface TVGuideModalProps {
  onSuccess: () => void;
}

const TVGuideModal = ({ onSuccess }: TVGuideModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_url: "",
    link_url: "",
    is_featured: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .insert({
          title: formData.title,
          content: formData.content,
          image_url: formData.image_url || null,
          link_url: formData.link_url || null,
          is_featured: formData.is_featured,
          merchant_id: user.id,
          post_type: 'tv_guide'
        });

      if (error) {
        console.error('Error creating TV guide post:', error);
        toast({
          title: "Error",
          description: "Failed to create TV guide post. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "TV guide post created successfully!"
      });

      setFormData({
        title: "",
        content: "",
        image_url: "",
        link_url: "",
        is_featured: false
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Calendar className="w-4 h-4 mr-2" />
          Create TV Guide Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Create TV Guide Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">Program Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Tonight's Featured Show"
              required
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-white">Program Description</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              placeholder="Describe what's happening in this program..."
              required
            />
          </div>

          <div>
            <Label htmlFor="image_url" className="text-white">Thumbnail URL (optional)</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>

          <div>
            <Label htmlFor="link_url" className="text-white">External Link (optional)</Label>
            <Input
              id="link_url"
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://example.com/watch"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
            />
            <Label htmlFor="is_featured" className="text-white">
              Feature in today's highlights
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? "Creating..." : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TVGuideModal;
