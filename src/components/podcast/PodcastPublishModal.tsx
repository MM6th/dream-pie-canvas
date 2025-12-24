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
import { Image, Loader2, Moon, Star, Sparkles, Play, Pause } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

// Subscription tier configuration
const SUBSCRIPTION_TIERS = {
  moon: { name: 'Moon', price: 4.99, icon: Moon, description: 'Basic monthly access' },
  venus: { name: 'Venus', price: 9.99, icon: Star, description: 'Premium monthly access' },
  jupiter: { name: 'Jupiter', price: 14.99, icon: Sparkles, description: 'VIP monthly access' },
} as const;

type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const PodcastPublishModal = ({
  open,
  onOpenChange,
  recording,
  onPublished,
}: PodcastPublishModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trailerAudioRef = useRef<HTMLAudioElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Subscription state
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('moon');
  
  // Trailer state - simplified to always use first 30 seconds
  const [trailerEnabled, setTrailerEnabled] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [trailerCurrentTime, setTrailerCurrentTime] = useState(0);
  const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trailerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset form when modal opens with a recording
  React.useEffect(() => {
    if (open && recording) {
      setTitle(recording.title);
      setDescription(recording.description || "");
      setIsFree(true);
      setPrice("");
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setSubscriptionEnabled(false);
      setSelectedTier('moon');
      setTrailerEnabled(false);
      setIsPlayingTrailer(false);
      setTrailerCurrentTime(0);
    }
  }, [open, recording]);

  // Trailer preview - plays first 30 seconds from the beginning
  const playTrailerPreview = async () => {
    const audio = trailerAudioRef.current;
    if (!audio || !recording) return;

    try {
      // Clear any previous timers
      if (trailerTimeoutRef.current) {
        clearTimeout(trailerTimeoutRef.current);
        trailerTimeoutRef.current = null;
      }
      if (trailerIntervalRef.current) {
        clearInterval(trailerIntervalRef.current);
        trailerIntervalRef.current = null;
      }

      // Start from beginning
      audio.currentTime = 0;
      await audio.play();
      setIsPlayingTrailer(true);
      setTrailerCurrentTime(0);

      // Counter interval
      trailerIntervalRef.current = setInterval(() => {
        setTrailerCurrentTime((prev) => {
          if (prev >= 30) {
            stopTrailerPreview();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

      // Auto-stop after 30 seconds
      trailerTimeoutRef.current = setTimeout(() => {
        stopTrailerPreview();
      }, 30 * 1000);
    } catch (error) {
      console.error("Trailer preview error:", error);
      toast({
        title: "Preview unavailable",
        description: "Could not play the audio preview.",
        variant: "destructive",
      });
    }
  };

  const stopTrailerPreview = () => {
    const audio = trailerAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlayingTrailer(false);
    setTrailerCurrentTime(0);
    
    if (trailerTimeoutRef.current) {
      clearTimeout(trailerTimeoutRef.current);
      trailerTimeoutRef.current = null;
    }
    if (trailerIntervalRef.current) {
      clearInterval(trailerIntervalRef.current);
      trailerIntervalRef.current = null;
    }
  };

  const toggleTrailerPreview = () => {
    if (isPlayingTrailer) {
      stopTrailerPreview();
    } else {
      playTrailerPreview();
    }
  };

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
    if (isFree || subscriptionEnabled) return true;
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

      // Trailer URL - always starts at 0 (first 30 seconds)
      let trailerUrl: string | null = null;
      if (trailerEnabled) {
        trailerUrl = `${recording.audio_url}#t=0`;
      }

      // Update podcast_recordings with subscription and trailer settings
      const recordingUpdateData: Record<string, unknown> = {};
      
      if (subscriptionEnabled) {
        recordingUpdateData.subscription_enabled = true;
        recordingUpdateData.subscription_tier = selectedTier;
      }
      
      if (trailerEnabled) {
        recordingUpdateData.trailer_url = trailerUrl;
      }
      
      if (Object.keys(recordingUpdateData).length > 0) {
        const { error: updateRecordingError } = await supabase
          .from("podcast_recordings")
          .update(recordingUpdateData)
          .eq("id", recording.id);

        if (updateRecordingError) throw updateRecordingError;
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
          is_free: subscriptionEnabled ? false : isFree,
          price: subscriptionEnabled 
            ? SUBSCRIPTION_TIERS[selectedTier].price 
            : (isFree ? null : parseFloat(price)),
          access_level: subscriptionEnabled ? "paid" : (isFree ? "public" : "paid"),
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
        description: subscriptionEnabled 
          ? `Your podcast is now live with ${SUBSCRIPTION_TIERS[selectedTier].name} tier subscription ($${SUBSCRIPTION_TIERS[selectedTier].price}/month).`
          : "Your podcast is now live in the store.",
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Trailer Settings */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>30-Second Trailer</Label>
                <p className="text-xs text-muted-foreground">
                  Let listeners preview your podcast
                </p>
              </div>
              <Switch 
                checked={trailerEnabled} 
                onCheckedChange={setTrailerEnabled} 
              />
            </div>
            
            {trailerEnabled && recording && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <audio 
                  ref={trailerAudioRef}
                  src={recording.audio_url}
                  preload="metadata"
                  onEnded={stopTrailerPreview}
                />
                
                <p className="text-sm text-muted-foreground">
                  Listeners will hear the first 30 seconds of your episode as a preview.
                </p>
                
                {isPlayingTrailer && (
                  <div className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/10 rounded-lg">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    <span className="text-lg font-mono font-semibold">
                      {Math.floor(trailerCurrentTime)}s / 30s
                    </span>
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleTrailerPreview}
                  className="w-full"
                >
                  {isPlayingTrailer ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Preview
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Preview First 30s
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Subscription Toggle */}
          <div className="flex items-center justify-between py-2 border-t pt-4">
            <div>
              <Label>Enable Subscription</Label>
              <p className="text-xs text-muted-foreground">
                Charge monthly via PayPal
              </p>
            </div>
            <Switch 
              checked={subscriptionEnabled} 
              onCheckedChange={(checked) => {
                setSubscriptionEnabled(checked);
                if (checked) setIsFree(false);
              }} 
            />
          </div>

          {/* Subscription Tier Selection */}
          {subscriptionEnabled && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <Label>Select Subscription Tier</Label>
              <RadioGroup
                value={selectedTier}
                onValueChange={(value) => setSelectedTier(value as SubscriptionTier)}
                className="space-y-2"
              >
                {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(
                  ([tier, config]) => {
                    const Icon = config.icon;
                    return (
                      <div
                        key={tier}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTier === tier
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedTier(tier)}
                      >
                        <RadioGroupItem value={tier} id={tier} />
                        <Icon className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <Label htmlFor={tier} className="cursor-pointer font-medium">
                            {config.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                        <span className="font-semibold text-primary">
                          ${config.price}/mo
                        </span>
                      </div>
                    );
                  }
                )}
              </RadioGroup>
            </div>
          )}

          {/* Pricing Toggle (only shown when subscription is not enabled) */}
          {!subscriptionEnabled && (
            <>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Free Episode</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle off to set a one-time price
                  </p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </div>

              {/* Price Input (shown only when not free) */}
              {!isFree && (
                <div className="space-y-2">
                  <Label htmlFor="price">One-Time Price (USD)</Label>
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
            </>
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
