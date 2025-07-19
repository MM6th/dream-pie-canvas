
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImagePicker from "./ImagePicker";
import VideoUpload from "./VideoUpload";
import ContentPicker from "./ContentPicker";

interface CurrentThoughtsModalProps {
  onSuccess?: () => void;
}

const CurrentThoughtsModal = ({ onSuccess }: CurrentThoughtsModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
    videoUrl: "",
    linkUrl: "",
    mediaType: "" as "image" | "video" | "",
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
          video_url: formData.videoUrl.trim() || null,
          media_type: formData.mediaType || null,
          link_url: formData.linkUrl.trim() || null,
          post_type: 'current_thoughts',
          merchant_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Current thoughts shared successfully!"
      });

      setFormData({
        title: "",
        content: "",
        imageUrl: "",
        videoUrl: "",
        linkUrl: "",
        mediaType: "",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share thoughts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContentSelect = (url: string, type: 'image' | 'video') => {
    if (type === 'image') {
      setFormData(prev => ({ 
        ...prev, 
        imageUrl: url, 
        videoUrl: "", 
        mediaType: 'image' 
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        videoUrl: url, 
        imageUrl: "", 
        mediaType: 'video' 
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <MessageSquare className="w-4 h-4 mr-2" />
          Share Current Thoughts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Share Current Thoughts
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="What's on your mind?"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Share your thoughts..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label>Media (Optional)</Label>
            <Tabs defaultValue="image" className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="image" className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      imageUrl: e.target.value, 
                      videoUrl: "", 
                      mediaType: e.target.value ? 'image' : '' 
                    }))}
                    placeholder="Image URL"
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <ImagePicker
                    onImageSelect={(url) => setFormData(prev => ({ 
                      ...prev, 
                      imageUrl: url, 
                      videoUrl: "", 
                      mediaType: 'image' 
                    }))}
                    currentImageUrl={formData.imageUrl}
                  />
                  <ContentPicker
                    onContentSelect={handleContentSelect}
                    currentContentUrl={formData.imageUrl}
                  />
                </div>
                {formData.imageUrl && (
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded"
                  />
                )}
              </TabsContent>
              
              <TabsContent value="video" className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={formData.videoUrl}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      videoUrl: e.target.value, 
                      imageUrl: "", 
                      mediaType: e.target.value ? 'video' : '' 
                    }))}
                    placeholder="Video URL"
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <VideoUpload
                    onVideoSelect={(url) => setFormData(prev => ({ 
                      ...prev, 
                      videoUrl: url, 
                      imageUrl: "", 
                      mediaType: 'video' 
                    }))}
                    currentVideoUrl={formData.videoUrl}
                  />
                  <ContentPicker
                    onContentSelect={handleContentSelect}
                    currentContentUrl={formData.videoUrl}
                  />
                </div>
                {formData.videoUrl && (
                  <video 
                    src={formData.videoUrl} 
                    controls 
                    className="w-full h-32 rounded"
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Label htmlFor="linkUrl">Link URL (Optional)</Label>
            <Input
              id="linkUrl"
              value={formData.linkUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://example.com"
            />
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
              {loading ? "Sharing..." : "Share Thoughts"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CurrentThoughtsModal;
