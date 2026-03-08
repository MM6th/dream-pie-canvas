import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLiveKitToken = () => {
  const [loading, setLoading] = useState(false);

  const getToken = useCallback(async (roomName: string, canPublish: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: { roomName, canPublish },
      });

      if (error) throw error;
      if (!data?.token || !data?.wsUrl) throw new Error("Invalid token response");

      return { token: data.token as string, wsUrl: data.wsUrl as string };
    } finally {
      setLoading(false);
    }
  }, []);

  return { getToken, loading };
};
