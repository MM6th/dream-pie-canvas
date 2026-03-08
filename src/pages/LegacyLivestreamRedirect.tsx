import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const LegacyLivestreamRedirect = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      if (!roomId) {
        navigate("/live", { replace: true });
        return;
      }

      const { data } = await (supabase.from("live_streams") as any)
        .select("id")
        .eq("id", roomId)
        .eq("status", "live")
        .maybeSingle();

      if (data?.id) {
        navigate(`/live/${data.id}`, { replace: true });
        return;
      }

      toast({
        title: "This is a legacy livestream link",
        description: "Opening current live streams instead.",
      });
      navigate("/live", { replace: true });
    };

    redirect();
  }, [roomId, navigate]);

  return null;
};

export default LegacyLivestreamRedirect;
