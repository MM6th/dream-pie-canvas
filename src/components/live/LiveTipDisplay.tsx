import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface LiveTipDisplayProps {
  streamId: string;
  merchantId: string;
}

interface TipEntry {
  id: string;
  amount: number;
  tipper_name: string;
  created_at: string;
}

const LiveTipDisplay = ({ streamId, merchantId }: LiveTipDisplayProps) => {
  const [tips, setTips] = useState<TipEntry[]>([]);
  const [totalTips, setTotalTips] = useState(0);

  useEffect(() => {
    const fetchTips = async () => {
      const { data } = await (supabase
        .from("live_stream_tips") as any)
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const tipperIds = [...new Set(data.map((t: any) => t.tipper_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", tipperIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name || "User"]));

        setTips(data.map((t: any) => ({ id: t.id, amount: t.amount, tipper_name: profileMap.get(t.tipper_id) || "User", created_at: t.created_at })));
        setTotalTips(data.reduce((sum: number, t: any) => sum + t.amount, 0));
      }
    };

    fetchTips();

    const channel = supabase
      .channel(`tips-${streamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_stream_tips",
        filter: `stream_id=eq.${streamId}`,
      }, () => fetchTips())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <img src={sixthCoinLogo} className="w-4 h-4 rounded-full" alt="SIXTH" />
          Tips ({totalTips} SIXTH)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-48 overflow-y-auto">
        {tips.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tips yet</p>
        ) : (
          tips.map((tip) => (
            <div key={tip.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{tip.tipper_name}</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <img src={sixthCoinLogo} className="w-3 h-3 rounded-full" alt="" />
                {tip.amount}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTipDisplay;
