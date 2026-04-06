import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playCoinSound } from "@/utils/coinSound";
import { Progress } from "@/components/ui/progress";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface OneOnOneTipMeterProps {
  roomName: string;
}

const METER_MAX = 100;

const OneOnOneTipMeter = ({ roomName }: OneOnOneTipMeterProps) => {
  const [totalTips, setTotalTips] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTips = async () => {
    const { data } = await (supabase.from("one_on_one_tips") as any)
      .select("amount")
      .eq("room_name", roomName);
    if (data) {
      const sum = data.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      setTotalTips(sum);
    }
  };

  useEffect(() => {
    fetchTips();

    // Realtime subscription
    const channel = supabase
      .channel(`oo-tips-${roomName}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "one_on_one_tips",
        filter: `room_name=eq.${roomName}`,
      }, (payload: any) => {
        console.log("Tip meter realtime event:", payload);
        setTotalTips((prev) => prev + (payload.new?.amount || 0));
      })
      .subscribe((status: string) => {
        console.log("Tip meter subscription status:", status);
      });

    // Polling fallback every 5 seconds in case realtime misses events
    pollRef.current = setInterval(fetchTips, 5000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomName]);

  const pct = Math.min((totalTips / METER_MAX) * 100, 100);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 min-w-[120px]">
      <img src={sixthCoinLogo} className="w-4 h-4 rounded-full flex-shrink-0" alt="SIXTH" />
      <Progress value={pct} className="h-2 flex-1 bg-white/10 [&>div]:bg-amber-500" />
      <span className="text-amber-400 text-xs font-mono font-medium whitespace-nowrap">{totalTips}</span>
    </div>
  );
};

export default OneOnOneTipMeter;
