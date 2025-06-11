
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

interface BulletinPostModalProps {
  onSuccess: () => void;
  post?: {
    id: string;
    title: string;
    content: string;
    image_url?: string;
    is_featured: boolean;
  };
  mode?: 'create' | 'edit';
}

const BulletinPostModal = ({ onSuccess, post, mode = 'create' }: BulletinPostModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [imageUrl, setImageUrl] = useState(post?.image_url || '');
  const [isFeatured, setIsFeatured] = useState(post?.is_featured || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    try {
      const postData = {
        title,
        content,
        image_url: imageUrl || null,
        is_featured: isFeatured,
        merchant_id: user.id,
        updated_at: new Date().toISOString()
      };

      let error;

      if (mode === 'edit' && post) {
        const { error: updateError } = await supabase
          .from('bulletin_posts')
          .update(postData)
          .eq('id', post.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('bulletin_posts')
          .insert([postData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving post:', error);
        toast({
          title: "Error",
          description: `Failed to ${mode} post. Please try again.`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Post ${mode === 'edit' ? 'updated' : 'created'} successfully!`
      });

      setTitle('');
      setContent('');
      setImageUrl('');
      setIsFeatured(false);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: `Failed to ${mode} post. Please try again.`,
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
          {mode === 'edit' ? (
            <>Edit Post</>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'edit' ? 'Edit Bulletin Post' : 'Create New Bulletin Post'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              required
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="content" className="text-white">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              required
              rows={6}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="imageUrl" className="text-white">Image URL (Optional)</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
            />
            <Label htmlFor="featured" className="text-white">
              Featured Post (Today's Post)
            </Label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : (mode === 'edit' ? 'Update Post' : 'Create Post')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulletinPostModal;
