import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { playCoinSound } from "@/utils/coinSound";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

// Test mode: bypasses token balance checks, inserts tip record directly
const TEST_MODE_ENABLED = true;

interface OneOnOneTipButtonProps {
  roomName: string;
  recipientId: string;
  disabled?: boolean;
  disabledReason?: string;
}

const tipAmounts = [1, 5, 10, 25];

const OneOnOneTipButton = ({ roomName, recipientId, disabled = false, disabledReason }: OneOnOneTipButtonProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleTip = async (amount: number) => {
    if (!user) return;
    if (disabled) {
      toast({ title: disabledReason || "Tipping not available right now" });
      return;
    }

    setSending(true);

    if (TEST_MODE_ENABLED) {
      // Insert tip record directly without deducting tokens
      const { error } = await (supabase.from("one_on_one_tips") as any).insert({
        room_name: roomName,
        tipper_id: user.id,
        recipient_id: recipientId,
        amount,
      });

      if (error) {
        toast({ title: "Tip failed", description: error.message, variant: "destructive" });
      } else {
        playCoinSound();
        toast({ title: `Tipped ${amount} SIXTH!` });
      }
    } else {
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
        playCoinSound();
        toast({ title: `Tipped ${amount} SIXTH!` });
      }
    }

    setSending(false);
    setOpen(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          className="rounded-full border-amber-600/50 text-amber-400 hover:bg-amber-900/20 bg-black/40 disabled:opacity-50"
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
