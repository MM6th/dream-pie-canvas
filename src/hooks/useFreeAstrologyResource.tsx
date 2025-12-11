import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const RESOURCE_KEY = "salt_mineral_chart";

interface FreeResourceStatus {
  hasAccepted: boolean;
  hasResponded: boolean;
  loading: boolean;
}

export const useFreeAstrologyResource = (userId: string | undefined) => {
  const [status, setStatus] = useState<FreeResourceStatus>({
    hasAccepted: false,
    hasResponded: false,
    loading: true,
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkResourceStatus = async () => {
      if (!userId) {
        setStatus({ hasAccepted: false, hasResponded: false, loading: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_free_resources")
          .select("status")
          .eq("user_id", userId)
          .eq("resource_key", RESOURCE_KEY)
          .maybeSingle();

        if (error) {
          console.error("Error checking free resource status:", error);
          setStatus({ hasAccepted: false, hasResponded: false, loading: false });
          return;
        }

        if (data) {
          setStatus({
            hasAccepted: data.status === "accepted",
            hasResponded: true,
            loading: false,
          });
        } else {
          // No record exists - show modal
          setStatus({ hasAccepted: false, hasResponded: false, loading: false });
          setShowModal(true);
        }
      } catch (error) {
        console.error("Error checking free resource status:", error);
        setStatus({ hasAccepted: false, hasResponded: false, loading: false });
      }
    };

    checkResourceStatus();
  }, [userId]);

  const refresh = async () => {
    if (!userId) return;
    
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase
        .from("user_free_resources")
        .select("status")
        .eq("user_id", userId)
        .eq("resource_key", RESOURCE_KEY)
        .maybeSingle();

      if (error) {
        console.error("Error refreshing free resource status:", error);
        setStatus({ hasAccepted: false, hasResponded: false, loading: false });
        return;
      }

      if (data) {
        setStatus({
          hasAccepted: data.status === "accepted",
          hasResponded: true,
          loading: false,
        });
      } else {
        setStatus({ hasAccepted: false, hasResponded: false, loading: false });
      }
    } catch (error) {
      console.error("Error refreshing free resource status:", error);
      setStatus({ hasAccepted: false, hasResponded: false, loading: false });
    }
  };

  return {
    ...status,
    showModal,
    setShowModal,
    refresh,
  };
};
