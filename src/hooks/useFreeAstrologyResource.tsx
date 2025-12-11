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
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkResourceStatus = async () => {
      // Don't check if no userId or already checked for this user
      if (!userId) {
        setStatus({ hasAccepted: false, hasResponded: false, loading: false });
        return;
      }

      // Prevent duplicate checks
      if (hasChecked) return;

      try {
        console.log("Checking free resource status for user:", userId);
        
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

        setHasChecked(true);

        if (data) {
          console.log("User already responded to free resource:", data.status);
          setStatus({
            hasAccepted: data.status === "accepted",
            hasResponded: true,
            loading: false,
          });
        } else {
          // No record exists - show modal
          console.log("No record found, showing modal for user:", userId);
          setStatus({ hasAccepted: false, hasResponded: false, loading: false });
          setShowModal(true);
        }
      } catch (error) {
        console.error("Error checking free resource status:", error);
        setStatus({ hasAccepted: false, hasResponded: false, loading: false });
      }
    };

    checkResourceStatus();
  }, [userId, hasChecked]);

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
