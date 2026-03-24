import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquareText } from "lucide-react";
import { SixthPriceTag } from "@/components/SixthPriceTag";

interface LiveOneOnOneButtonProps {
  hostId: string;
}

const LiveOneOnOneButton = ({ hostId }: LiveOneOnOneButtonProps) => {
  const [creditsPerMessage, setCreditsPerMessage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const { data } = await (supabase.from("messaging_settings") as any)
          .select("credits_per_message")
          .eq("user_id", hostId)
          .single();

        if (data?.credits_per_message) {
          setCreditsPerMessage(data.credits_per_message);
        }
      } catch (err) {
        console.error("Error fetching host message rate:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [hostId]);

  if (loading || creditsPerMessage === null) return null;

  const usdCost = (creditsPerMessage * 0.10).toFixed(2);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className="border-blue-500/50 text-blue-400 hover:bg-blue-900/20 gap-2"
        >
          <MessageSquareText className="w-4 h-4" />
          1 on 1
          <span className="text-xs text-blue-300/80">${usdCost}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Private message this host — {creditsPerMessage} credit{creditsPerMessage !== 1 ? 's' : ''}/msg (${usdCost})</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default LiveOneOnOneButton;
