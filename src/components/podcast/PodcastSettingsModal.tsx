import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image, Loader2, Moon, Star, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Default tier descriptions for fallback
const DEFAULT_TIER_DESCRIPTIONS = {
  moon: "Basic monthly access",
  venus: "Premium monthly access",
  jupiter: "VIP monthly access",
} as const;

const SUBSCRIPTION_TIERS = {
  moon: { name: 'Moon', price: 4.99, icon: Moon },
  venus: { name: 'Venus', price: 9.99, icon: Star },
  jupiter: { name: 'Jupiter', price: 14.99, icon: Sparkles },
} as const;

type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

interface PodcastSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsSaved?: () => void;
}

export const PodcastSettingsModal = ({
  open,
  onOpenChange,
  onSettingsSaved,
}: PodcastSettingsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Form state
  const [defaultThumbnailUrl, setDefaultThumbnailUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [moonDescription, setMoonDescription] = useState("");
  const [venusDescription, setVenusDescription] = useState("");
  const [jupiterDescription, setJupiterDescription] = useState("");
  const [defaultTier, setDefaultTier] = useState<SubscriptionTier>("moon");

  // Fetch existing settings when modal opens
  useEffect(() => {
    if (!open || !user) return;

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("podcast_settings")
          .select("*")
          .eq("merchant_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setSettingsId(data.id);
          setDefaultThumbnailUrl(data.default_thumbnail_url);
          setThumbnailPreview(data.default_thumbnail_url);
          setMoonDescription(data.moon_tier_description || "");
          setVenusDescription(data.venus_tier_description || "");
          setJupiterDescription(data.jupiter_tier_description || "");
          setDefaultTier((data.default_tier as SubscriptionTier) || "moon");
        } else {
          // No existing settings - reset to defaults
          setSettingsId(null);
          setDefaultThumbnailUrl(null);
          setThumbnailPreview(null);
          setMoonDescription("");
          setVenusDescription("");
          setJupiterDescription("");
          setDefaultTier("moon");
        }
        setThumbnailFile(null);
      } catch (error) {
        console.error("Error fetching podcast settings:", error);
        toast({
          title: "Error",
          description: "Could not load your podcast settings.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [open, user?.id]);

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

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      let thumbnailUrl = defaultThumbnailUrl;

      // Upload new thumbnail if provided
      if (thumbnailFile) {
        const timestamp = Date.now();
        const fileExt = thumbnailFile.name.split(".").pop();
        const fileName = `podcast-settings/${user.id}/${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(fileName, thumbnailFile, {
            contentType: thumbnailFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
        thumbnailUrl = publicUrl;
      }

      const settingsData = {
        merchant_id: user.id,
        default_thumbnail_url: thumbnailUrl,
        moon_tier_description: moonDescription.trim() || null,
        venus_tier_description: venusDescription.trim() || null,
        jupiter_tier_description: jupiterDescription.trim() || null,
        default_tier: defaultTier,
      };

      if (settingsId) {
        // Update existing settings
        const { error } = await supabase
          .from("podcast_settings")
          .update(settingsData)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from("podcast_settings")
          .insert(settingsData);

        if (error) throw error;
      }

      // Propagate tier descriptions to existing published podcast_recordings
      const tierUpdates: { tier: string; description: string | null }[] = [
        { tier: 'moon', description: settingsData.moon_tier_description },
        { tier: 'venus', description: settingsData.venus_tier_description },
        { tier: 'jupiter', description: settingsData.jupiter_tier_description },
      ];

      for (const { tier, description } of tierUpdates) {
        if (description) {
          await supabase
            .from('podcast_recordings')
            .update({ tier_description: description })
            .eq('merchant_id', user.id)
            .eq('subscription_tier', tier)
            .eq('subscription_enabled', true);
        }
      }

      toast({
        title: "Settings Saved",
        description: "Your podcast settings have been saved and applied to existing published podcasts.",
      });

      onSettingsSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving podcast settings:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Podcast Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure default settings for your podcast uploads. These will auto-populate when you upload new podcasts.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Default Thumbnail */}
            <div className="space-y-2">
              <Label className="text-white">Default Thumbnail</Label>
              <p className="text-sm text-gray-400">
                This thumbnail will be used for new podcast uploads by default.
              </p>
              <div className="flex items-center gap-4">
                {thumbnailPreview ? (
                  <img
                    src={thumbnailPreview}
                    alt="Default thumbnail"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-600"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailSelect}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    {thumbnailPreview ? "Change Thumbnail" : "Upload Thumbnail"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Default Subscription Tier */}
            <div className="space-y-3">
              <Label className="text-white">Default Subscription Tier</Label>
              <p className="text-sm text-gray-400">
                New podcast uploads will default to this tier.
              </p>
              <RadioGroup
                value={defaultTier}
                onValueChange={(value) => setDefaultTier(value as SubscriptionTier)}
                className="grid grid-cols-3 gap-3"
              >
                {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(
                  ([tier, config]) => {
                    const Icon = config.icon;
                    return (
                      <Label
                        key={tier}
                        htmlFor={`default-tier-${tier}`}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                          defaultTier === tier
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-600 bg-gray-800 hover:border-gray-500"
                        }`}
                      >
                        <RadioGroupItem
                          value={tier}
                          id={`default-tier-${tier}`}
                          className="sr-only"
                        />
                        <Icon className={`w-6 h-6 ${defaultTier === tier ? "text-purple-400" : "text-gray-400"}`} />
                        <span className="text-white font-medium">{config.name}</span>
                        <span className="text-sm text-gray-400">${config.price}/mo</span>
                      </Label>
                    );
                  }
                )}
              </RadioGroup>
            </div>

            {/* Tier Descriptions */}
            <div className="space-y-4">
              <div>
                <Label className="text-white">Tier Perks & Descriptions</Label>
                <p className="text-sm text-gray-400 mt-1">
                  Describe what subscribers get at each tier. These will auto-populate when uploading podcasts.
                </p>
              </div>

              {/* Moon Tier */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-gray-400" />
                  <Label className="text-white text-sm">Moon Tier ($4.99/mo)</Label>
                </div>
                <Textarea
                  value={moonDescription}
                  onChange={(e) => setMoonDescription(e.target.value)}
                  placeholder={DEFAULT_TIER_DESCRIPTIONS.moon}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 min-h-[80px]"
                />
              </div>

              {/* Venus Tier */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gray-400" />
                  <Label className="text-white text-sm">Venus Tier ($9.99/mo)</Label>
                </div>
                <Textarea
                  value={venusDescription}
                  onChange={(e) => setVenusDescription(e.target.value)}
                  placeholder={DEFAULT_TIER_DESCRIPTIONS.venus}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 min-h-[80px]"
                />
              </div>

              {/* Jupiter Tier */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <Label className="text-white text-sm">Jupiter Tier ($14.99/mo)</Label>
                </div>
                <Textarea
                  value={jupiterDescription}
                  onChange={(e) => setJupiterDescription(e.target.value)}
                  placeholder={DEFAULT_TIER_DESCRIPTIONS.jupiter}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PodcastSettingsModal;
