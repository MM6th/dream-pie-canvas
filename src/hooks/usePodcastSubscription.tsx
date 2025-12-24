import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  tier: string | null;
  loading: boolean;
}

/**
 * Hook to check if a user has an active subscription to a specific merchant's podcasts.
 * Active means: status='active', not cancelled, and next_billing_date is in the future (or null).
 */
export const usePodcastSubscription = (merchantId: string | null) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    tier: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !merchantId) {
      setStatus({ hasActiveSubscription: false, tier: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("podcast_subscriptions")
        .select("tier, status, next_billing_date, cancelled_at")
        .eq("subscriber_id", user.id)
        .eq("merchant_id", merchantId)
        .eq("status", "active")
        .is("cancelled_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking subscription:", error);
        setStatus({ hasActiveSubscription: false, tier: null, loading: false });
        return;
      }

      if (!data) {
        setStatus({ hasActiveSubscription: false, tier: null, loading: false });
        return;
      }

      // Check if subscription is still valid (next_billing_date in future or null)
      const isValid =
        !data.next_billing_date ||
        new Date(data.next_billing_date) > new Date();

      setStatus({
        hasActiveSubscription: isValid,
        tier: isValid ? data.tier : null,
        loading: false,
      });
    } catch (err) {
      console.error("Error in subscription check:", err);
      setStatus({ hasActiveSubscription: false, tier: null, loading: false });
    }
  }, [user, merchantId]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return { ...status, refetch: checkSubscription };
};

/**
 * Hook to check subscription status for multiple merchants at once.
 * Returns a map of merchantId -> hasActiveSubscription
 */
export const usePodcastSubscriptions = (merchantIds: string[]) => {
  const { user } = useAuth();
  const [subscriptionMap, setSubscriptionMap] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);

  const checkSubscriptions = useCallback(async () => {
    if (!user || merchantIds.length === 0) {
      setSubscriptionMap({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("podcast_subscriptions")
        .select("merchant_id, status, next_billing_date, cancelled_at")
        .eq("subscriber_id", user.id)
        .eq("status", "active")
        .is("cancelled_at", null)
        .in("merchant_id", merchantIds);

      if (error) {
        console.error("Error checking subscriptions:", error);
        setSubscriptionMap({});
        setLoading(false);
        return;
      }

      const map: Record<string, boolean> = {};

      // Initialize all as false
      merchantIds.forEach((id) => {
        map[id] = false;
      });

      // Mark active subscriptions
      if (data) {
        data.forEach((sub) => {
          const isValid =
            !sub.next_billing_date ||
            new Date(sub.next_billing_date) > new Date();
          if (isValid) {
            map[sub.merchant_id] = true;
          }
        });
      }

      setSubscriptionMap(map);
      setLoading(false);
    } catch (err) {
      console.error("Error in subscriptions check:", err);
      setSubscriptionMap({});
      setLoading(false);
    }
  }, [user, merchantIds.join(",")]);

  useEffect(() => {
    checkSubscriptions();
  }, [checkSubscriptions]);

  return { subscriptionMap, loading, refetch: checkSubscriptions };
};
