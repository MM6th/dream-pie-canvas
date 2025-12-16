import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Image, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
}

interface PodcastPublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording | null;
  onPublished: () => void;
}

export const PodcastPublishModal = ({
  open,
  onOpenChange,
  recording,
  onPublished,
}: PodcastPublishModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset form when modal opens with a recording
  React.useEffect(() => {
    if (open && recording) {
      setTitle(recording.title);
      setDescription(recording.description || "");
      setIsFree(true);
      setPrice("");
      setThumbnailFile(null);
      setThumbnailPreview(null);
    }
  }, [open, recording]);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // 5MB limit for thumbnails
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const validatePrice = (): boolean => {
    if (isFree) return true;
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 2) {
      toast({
        title: "Invalid Price",
        description: "Price must be at least $2.00",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!user || !recording) return;

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your podcast.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePrice()) return;

    setIsPublishing(true);
    try {
      let thumbnailUrl: string | null = null;

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const timestamp = Date.now();
        const fileExt = thumbnailFile.name.split(".").pop();
        const fileName = `podcast-thumbnails/${user.id}/${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(fileName, thumbnailFile, {
            contentType: thumbnailFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("thumbnails").getPublicUrl(fileName);

        thumbnailUrl = publicUrl;
      }

      // Create audio product entry
      const { error: productError } = await supabase
        .from("audio_products")
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          audio_type: "podcast",
          audio_file_url: recording.audio_url,
          thumbnail_url: thumbnailUrl,
          is_free: isFree,
          price: isFree ? null : parseFloat(price),
          access_level: isFree ? "public" : "paid",
          status: "published",
          published_at: new Date().toISOString(),
        });

      if (productError) throw productError;

      // Update recording status
      await supabase
        .from("podcast_recordings")
        .update({ status: "published" })
        .eq("id", recording.id);

      toast({
        title: "Published!",
        description: "Your podcast is now live in the store.",
      });

      onPublished();
      onOpenChange(false);
    } catch (error) {
      console.error("Error publishing podcast:", error);
      toast({
        title: "Publish Failed",
        description: "Could not publish your podcast. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Podcast</DialogTitle>
          <DialogDescription>
            Add a thumbnail and set pricing to publish your podcast to the store.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            <p className="text-xs text-muted-foreground">
              Recommended size: 500×500px (square)
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {thumbnailPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Click to change
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Image className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload thumbnail
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter podcast title"
              className="bg-background"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your podcast episode..."
              className="bg-background"
              rows={3}
            />
          </div>

          {/* Pricing Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Free Episode</Label>
              <p className="text-xs text-muted-foreground">
                Toggle off to set a price
              </p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>

          {/* Price Input (shown only when not free) */}
          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <p className="text-xs text-muted-foreground">Minimum $2.00</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  min="2"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2.00"
                  className="bg-background pl-7"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PodcastPublishModal;
