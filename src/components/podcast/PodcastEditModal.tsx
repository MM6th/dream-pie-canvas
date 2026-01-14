import React, { useState, useRef, useEffect } from "react";
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
import { Image, Loader2, Moon, Star, Sparkles, Play, Pause, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  thumbnail_url?: string | null;
  status: string;
}

interface CastMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_type: string;
}

interface PodcastEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording | null;
  onSaved: () => void;
}

// Subscription tier configuration
const SUBSCRIPTION_TIERS = {
  moon: { name: 'Moon', price: 4.99, icon: Moon, description: 'Benjiman discussing dreams, topics that are mysterious, and occult' },
  venus: { name: 'Venus', price: 9.99, icon: Star, description: 'Premium monthly access' },
  jupiter: { name: 'Jupiter', price: 14.99, icon: Sparkles, description: 'VIP monthly access' },
} as const;

type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const PodcastEditModal = ({
  open,
  onOpenChange,
  recording,
  onSaved,
}: PodcastEditModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trailerAudioRef = useRef<HTMLAudioElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Subscription state
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("moon");
  const [tierDescription, setTierDescription] = useState("");
  const lastTierRef = useRef<SubscriptionTier>("moon");

  // Trailer state
  const [trailerEnabled, setTrailerEnabled] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [trailerCurrentTime, setTrailerCurrentTime] = useState(0);
  const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trailerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cast member state
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [castSearchQuery, setCastSearchQuery] = useState("");
  const [castSearchResults, setCastSearchResults] = useState<UserProfile[]>([]);
  const [castSearchLoading, setCastSearchLoading] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (!open || !recording) return;

    let cancelled = false;

    // Base reset
    setTitle(recording.title);
    setDescription(recording.description || "");
    setThumbnailFile(null);
    setThumbnailPreview(recording.thumbnail_url || null);

    setSubscriptionEnabled(false);
    setSelectedTier("moon");
    lastTierRef.current = "moon";
    setTierDescription(SUBSCRIPTION_TIERS.moon.description);

    setTrailerEnabled(false);
    setIsPlayingTrailer(false);
    setTrailerCurrentTime(0);
    setCastMembers([]);
    setCastSearchQuery("");
    setCastSearchResults([]);

    const hydrate = async () => {
      if (!user) return;

      try {
        const [{ data: recData, error: recError }, { data: prodData, error: prodError }] =
          await Promise.all([
            supabase
              .from("podcast_recordings")
              .select(
                "title, description, status, subscription_enabled, subscription_tier, tier_description, trailer_url, thumbnail_url"
              )
              .eq("id", recording.id)
              .maybeSingle(),
            supabase
              .from("audio_products")
              .select("id, title, description, thumbnail_url")
              .eq("merchant_id", user.id)
              .eq("audio_type", "podcast")
              .eq("audio_file_url", recording.audio_url)
              .maybeSingle(),
          ]);

        if (cancelled) return;
        if (recError) throw recError;
        if (prodError) throw prodError;

        const mergedTitle = (prodData?.title || recData?.title || recording.title || "").toString();
        const mergedDescription =
          (prodData?.description ?? recData?.description ?? recording.description ?? "") || "";

        setTitle(mergedTitle);
        setDescription(typeof mergedDescription === "string" ? mergedDescription : "");

        // Thumbnail priority: recording > audio product
        if (recData?.thumbnail_url) {
          setThumbnailPreview(recData.thumbnail_url);
        } else if (prodData?.thumbnail_url) {
          setThumbnailPreview(prodData.thumbnail_url);
        }

        const subEnabled = !!recData?.subscription_enabled;
        setSubscriptionEnabled(subEnabled);

        const tierCandidate = (recData?.subscription_tier as SubscriptionTier) || "moon";
        const safeTier = (Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTier[]).includes(
          tierCandidate
        )
          ? tierCandidate
          : "moon";

        setSelectedTier(safeTier);
        lastTierRef.current = safeTier;

        const perks = (recData?.tier_description || "").trim();
        setTierDescription(perks || SUBSCRIPTION_TIERS[safeTier].description);

        setTrailerEnabled(!!recData?.trailer_url);

        // Fetch existing cast members
        const { data: castData, error: castError } = await supabase
          .from("podcast_cast_members")
          .select("user_id, display_name, avatar_url")
          .eq("podcast_recording_id", recording.id);

        if (!castError && castData) {
          setCastMembers(castData.map(c => ({
            id: c.user_id,
            display_name: c.display_name || "",
            avatar_url: c.avatar_url
          })));
        }
      } catch (err) {
        console.error("Error hydrating podcast edit modal:", err);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [open, recording?.id, user?.id]);

  // When changing tiers, only auto-swap the perks text if the user hasn't customized it.
  useEffect(() => {
    if (!subscriptionEnabled) return;

    setTierDescription((prev) => {
      const prevTier = lastTierRef.current;
      if (prevTier === selectedTier) return prev;

      const prevDefault = SUBSCRIPTION_TIERS[prevTier].description;
      const nextDefault = SUBSCRIPTION_TIERS[selectedTier].description;
      lastTierRef.current = selectedTier;

      const trimmed = (prev || "").trim();
      if (!trimmed || trimmed === prevDefault) return nextDefault;
      return prev;
    });
  }, [selectedTier, subscriptionEnabled]);

  // Cast member search
  useEffect(() => {
    const searchUsers = async () => {
      if (!castSearchQuery.trim() || castSearchQuery.length < 2) {
        setCastSearchResults([]);
        return;
      }

      setCastSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, user_type")
          .neq("id", user?.id || "")
          .ilike("display_name", `%${castSearchQuery}%`)
          .limit(10);

        if (error) throw error;
        
        // Filter out users already in cast
        const existingIds = new Set(castMembers.map(c => c.id));
        setCastSearchResults((data || []).filter(u => !existingIds.has(u.id)));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setCastSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [castSearchQuery, user?.id, castMembers]);

  // Add cast member
  const addCastMember = (profile: UserProfile) => {
    if (castMembers.some(c => c.id === profile.id)) return;
    setCastMembers(prev => [...prev, {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url
    }]);
    setCastSearchQuery("");
    setCastSearchResults([]);
  };

  // Remove cast member
  const removeCastMember = (userId: string) => {
    setCastMembers(prev => prev.filter(c => c.id !== userId));
  };

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

  const handleSave = async () => {
    if (!user || !recording) return;

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your podcast.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
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

      // Update podcast_recordings with all editable data
      const recordingUpdateData: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        subscription_enabled: subscriptionEnabled,
        subscription_tier: subscriptionEnabled ? selectedTier : null,
        tier_description: subscriptionEnabled ? tierDescription.trim() || null : null,
        trailer_url: trailerEnabled ? trailerUrl : null,
      };
      
      // Update thumbnail if a new one was uploaded
      if (thumbnailUrl) {
        recordingUpdateData.thumbnail_url = thumbnailUrl;
      }
      
      const { error: updateRecordingError } = await supabase
        .from("podcast_recordings")
        .update(recordingUpdateData)
        .eq("id", recording.id);

      if (updateRecordingError) throw updateRecordingError;

      // Also update audio_products if it exists (for published podcasts)
      const { data: existingProduct } = await supabase
        .from("audio_products")
        .select("id")
        .eq("merchant_id", user.id)
        .eq("audio_type", "podcast")
        .eq("audio_file_url", recording.audio_url)
        .maybeSingle();

      if (existingProduct?.id) {
        const productUpdateData: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim() || null,
        };
        
        if (thumbnailUrl) {
          productUpdateData.thumbnail_url = thumbnailUrl;
        }

        await supabase
          .from("audio_products")
          .update(productUpdateData)
          .eq("id", existingProduct.id);
      }

      // Save cast members
      await supabase
        .from("podcast_cast_members")
        .delete()
        .eq("podcast_recording_id", recording.id);

      if (castMembers.length > 0) {
        const castInserts = castMembers.map(member => ({
          podcast_recording_id: recording.id,
          user_id: member.id,
          display_name: member.display_name,
          avatar_url: member.avatar_url
        }));

        await supabase
          .from("podcast_cast_members")
          .insert(castInserts);
      }

      toast({
        title: "Saved!",
        description: "Your changes have been saved.",
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving podcast:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Podcast</DialogTitle>
          <DialogDescription>
            Update your podcast details, thumbnail, and settings.
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

          {/* Cast Members */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <Label>Cast</Label>
              <p className="text-xs text-muted-foreground">
                Add guests to your podcast. They'll get free access when published.
              </p>
            </div>

            {/* Selected Cast Members */}
            {castMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {castMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.display_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.display_name}</span>
                    <button
                      type="button"
                      onClick={() => removeCastMember(member.id)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Cast Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={castSearchQuery}
                onChange={(e) => setCastSearchQuery(e.target.value)}
                placeholder="Search users by name..."
                className="pl-10 bg-background"
              />
            </div>

            {/* Search Results */}
            {castSearchResults.length > 0 && (
              <ScrollArea className="max-h-32 border rounded-lg">
                <div className="p-1">
                  {castSearchResults.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => addCastMember(profile)}
                      className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {profile.display_name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{profile.display_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{profile.user_type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {castSearchQuery.length >= 2 && castSearchResults.length === 0 && !castSearchLoading && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No users found matching "{castSearchQuery}"
              </p>
            )}

            {castSearchLoading && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Searching...
              </p>
            )}
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
              onCheckedChange={setSubscriptionEnabled} 
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
              
              {/* Tier Description / Perks */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="tierDescription">Tier Perks & Benefits</Label>
                <p className="text-xs text-muted-foreground">
                  Describe what subscribers get at this tier (shown on the podcast card)
                </p>
                <Textarea
                  id="tierDescription"
                  value={tierDescription}
                  onChange={(e) => setTierDescription(e.target.value)}
                  placeholder="e.g., Early access to episodes, exclusive bonus content, ad-free listening..."
                  className="bg-background"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PodcastEditModal;
