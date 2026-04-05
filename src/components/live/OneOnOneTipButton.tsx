import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface OneOnOneTipButtonProps {
  roomName: string;
  recipientId: string;
}

const tipAmounts = [1, 5, 10, 25];

const OneOnOneTipButton = ({ roomName, recipientId }: OneOnOneTipButtonProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleTip = async (amount: number) => {
    if (!user) return;

    setSending(true);
    const { error } = await supabase.rpc("tip_one_on_one" as any, {
      p_room_name: roomName,
      p_recipient_id: recipientId,
      p_amount: amount,
    });

    if (error) {
      if (error.message.includes("Insufficient")) {
        toast({ title: "Insufficient SIXTH tokens", variant: "destructive" });
      } else {
        toast({ title: "Tip failed", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: `Tipped ${amount} SIXTH!` });
    }

    setSending(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-amber-600/50 text-amber-400 hover:bg-amber-900/20 bg-black/40"
        >
          <img src={sixthCoinLogo} className="w-4 h-4 rounded-full mr-1" alt="SIXTH" />
          Tip
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="center">
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

export default OneOnOneTipButton;
