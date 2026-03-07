import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface LiveTipButtonProps {
  streamId: string;
  recipientId: string;
}

const tipAmounts = [1, 5, 10, 25];

const LiveTipButton = ({ streamId, recipientId }: LiveTipButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleTip = async (amount: number) => {
    if (!user) return;

    if (user.id === recipientId) {
      toast({ title: "You can't tip yourself", variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await supabase.rpc("tip_live_stream", {
      p_stream_id: streamId,
      p_recipient_id: recipientId,
      p_amount: amount,
    });

    if (error) {
      if (error.message.includes("Insufficient")) {
        toast({
          title: "Insufficient SIXTH tokens",
          description: "Visit the Mint page to get more tokens.",
          variant: "destructive",
        });
        navigate("/mint");
      } else {
        toast({ title: "Tip failed", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: `Tipped ${amount} SIXTH!`, description: "Thanks for supporting the streamer!" });
    }

    setSending(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-amber-600/50 text-amber-400 hover:bg-amber-900/20">
          <img src={sixthCoinLogo} className="w-4 h-4 rounded-full mr-2" alt="SIXTH" />
          Tip
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <p className="text-xs text-muted-foreground mb-2 px-1">Send SIXTH tokens</p>
        <div className="grid grid-cols-2 gap-2">
          {tipAmounts.map((amt) => (
            <Button
              key={amt}
              size="sm"
              variant="outline"
              disabled={sending}
              onClick={() => handleTip(amt)}
              className="text-amber-400 border-amber-600/30 hover:bg-amber-900/20"
            >
              <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="" />
              {amt}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LiveTipButton;
