import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Default tier descriptions for fallback when no custom settings exist
export const DEFAULT_TIER_DESCRIPTIONS = {
  moon: "Basic monthly access",
  venus: "Premium monthly access",
  jupiter: "VIP monthly access",
} as const;

export type SubscriptionTier = "moon" | "venus" | "jupiter";

export interface PodcastSettings {
  id: string;
  merchant_id: string;
  default_thumbnail_url: string | null;
  moon_tier_description: string | null;
  venus_tier_description: string | null;
  jupiter_tier_description: string | null;
  default_tier: SubscriptionTier;
}

export const usePodcastSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PodcastSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("podcast_settings")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching podcast settings:", error);
      }

      setSettings(data as PodcastSettings | null);
    } catch (error) {
      console.error("Error fetching podcast settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  // Helper function to get tier description with fallback
  const getTierDescription = (tier: SubscriptionTier): string => {
    if (!settings) return DEFAULT_TIER_DESCRIPTIONS[tier];

    switch (tier) {
      case "moon":
        return settings.moon_tier_description || DEFAULT_TIER_DESCRIPTIONS.moon;
      case "venus":
        return settings.venus_tier_description || DEFAULT_TIER_DESCRIPTIONS.venus;
      case "jupiter":
        return settings.jupiter_tier_description || DEFAULT_TIER_DESCRIPTIONS.jupiter;
      default:
        return DEFAULT_TIER_DESCRIPTIONS.moon;
    }
  };

  return {
    settings,
    loading,
    refetch: fetchSettings,
    getTierDescription,
    defaultTier: settings?.default_tier || "moon",
    defaultThumbnail: settings?.default_thumbnail_url || null,
  };
};
