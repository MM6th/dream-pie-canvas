import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLiveKitToken = () => {
  const [loading, setLoading] = useState(false);

  const getToken = useCallback(async (roomName: string, canPublish: boolean) => {
    setLoading(true);
    try {
      // Ensure we have a valid session before invoking the edge function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.error("LiveKit token: No valid session", sessionError);
        throw new Error("No valid auth session. Please log in again.");
      }
      console.log("LiveKit token: session valid, invoking edge function for room", roomName);

      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: { roomName, canPublish },
      });

      console.log("LiveKit token: edge function response", { data, error });

      if (error) throw error;
      if (!data?.token || !data?.wsUrl) throw new Error("Invalid token response");

      return { token: data.token as string, wsUrl: data.wsUrl as string };
    } finally {
      setLoading(false);
    }
  }, []);

  return { getToken, loading };
};
