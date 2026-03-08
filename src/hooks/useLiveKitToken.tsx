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

      if (error) {
        console.warn("LiveKit token: invoke failed, trying direct fetch", error);
        const accessToken = sessionData.session.access_token;
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ roomName, canPublish }),
          }
        );

        const fallbackData = await response.json().catch(() => ({}));
        console.log("LiveKit token: direct fetch response", { status: response.status, fallbackData });

        if (!response.ok) {
          throw new Error(fallbackData?.error || `Token request failed (${response.status})`);
        }

        if (!fallbackData?.token || !fallbackData?.wsUrl) {
          throw new Error("Invalid token response");
        }

        return { token: fallbackData.token as string, wsUrl: fallbackData.wsUrl as string };
      }

      console.log("LiveKit token: edge function response", { data });

      if (!data?.token || !data?.wsUrl) throw new Error("Invalid token response");

      return { token: data.token as string, wsUrl: data.wsUrl as string };
    } finally {
      setLoading(false);
    }
  }, []);

  return { getToken, loading };
};
